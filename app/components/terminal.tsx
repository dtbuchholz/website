"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

type CommandContext = {
  currentPath: string[];
};

type CompletionState = {
  matches: string[];
  currentIndex: number;
  originalInput: string;
  linePositionY: number;
};

type Command = {
  name: string;
  description: string;
  execute: (args: string[], context: CommandContext, term: XTerm) => string | Promise<string>;
};

const commands: Record<string, Command> = {
  help: {
    name: "help",
    description: "List all available commands",
    execute: () => {
      return Object.entries(commands)
        .filter(([name]) => name !== "help")
        .map(([name, cmd]) => `${name.padEnd(8)} - ${cmd.description}`)
        .sort((a: string, b: string) => a.localeCompare(b))
        .join("\r\n");
    },
  },
  cd: {
    name: "cd",
    description: "Change directory",
    execute: async (args, { currentPath }) => {
      const path = args[0];

      // No args - return to root
      if (!path) {
        currentPath.length = 0;
        return "";
      }

      if (path === "..") {
        if (currentPath.length > 0) {
          currentPath.pop();
        }
        return "";
      }

      if (path === "/") {
        currentPath.length = 0; // Clear the array
        return "";
      }

      try {
        let fullPath;
        if (currentPath.length > 0) {
          // In a subdirectory - join paths
          fullPath = `${currentPath.join("/")}/${path}`;
        } else {
          // At root - use path directly
          fullPath = path;
        }
        const response = await fetch(`/api/fs?path=${encodeURIComponent(fullPath)}`);
        if (!response.ok) throw new Error("File or directory not found");

        const contents = await response.json();

        // Check if the target itself is a file (not its contents)
        const targetItem = contents.find((item) => item.name === path.replace(/\/$/, ""));
        if (targetItem?.type === "file") {
          return `cd: ${path}: Not a directory`;
        }

        // Update current path with just the new segment
        currentPath.push(...path.split("/").filter(Boolean));
        return "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        return `cd: ${path}: No such directory: ${error.message}`;
      }
    },
  },
  ai: {
    name: "ai",
    description: "Summarize or ask questions about various files",
    execute: async (args, context, term) => {
      const [subcommand, path] = args;

      switch (subcommand) {
        case "sum":
        case "summarize":
          return handleSummarize(path, context, term);
        case "ask":
          const question = args.slice(2).join(" ");
          return handleAsk(path, question, context, term);
        default:
          return "Usage: ai [sum|ask] <path> [question]";
      }
    },
  },
  clear: {
    name: "clear",
    description: "Clear the terminal screen",
    execute: (_, __, term) => {
      term?.clear();
      term?.write("\x1b[H"); // Move cursor to home position (0,0)
      return ""; // Return empty string since we don't want to write anything
    },
  },
  ls: {
    name: "ls",
    description: "List directory contents",
    execute: async (args, { currentPath }) => {
      let path;
      if (!args[0]) {
        // No args - list current directory
        path = currentPath.join("/");
      } else {
        // Args provided - construct full path from current location
        path = currentPath.length > 0 ? `${currentPath.join("/")}/${args[0]}` : args[0];
      }
      try {
        const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
        if (!response.ok)
          throw new Error("Failed to list directory" + `/api/fs?path=${encodeURIComponent(path)}`);

        const contents = await response.json();
        return contents
          .map(({ name, type }) => (type === "directory" ? `${name}/` : name))
          .join("\r\n");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        return `ls: cannot access '${path}': No such file or directory: ${error.message}`;
      }
    },
  },
  pwd: {
    name: "pwd",
    description: "Print working directory",
    execute: (_, { currentPath }) => {
      return "/" + currentPath.join("/");
    },
  },
};

async function handleSummarize(path: string, context: CommandContext, term: XTerm) {
  if (!path || path.trim() === "") {
    return "Usage: ai summarize <path> (alias: 'sum')";
  }
  try {
    term.write("Summarizing...\r\n");

    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ path, type: "summarize" }),
    });

    // Handle streaming response
    const reader = response.body?.getReader();
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const response = JSON.parse(new TextDecoder().decode(result?.value));
      term.write(response.summary);
    }

    return "";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function handleAsk(path: string, question: string, context: CommandContext, term: XTerm) {
  if (!question || question.trim() === "" || !path || path.trim() === "") {
    return "Usage: ai ask <path> <question>";
  }
  try {
    term.write("Asking...\r\n");
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ path, type: "ask", question }),
    });
    const reader = response.body?.getReader();
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const response = JSON.parse(new TextDecoder().decode(result?.value));
      term.write(response.answer);
    }
    return "";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);
  const currentCommand = useRef("");
  const cursorOffset = useRef(0); // Position from the end of the command
  const currentPath = useRef<string[]>([]); // Initialize empty path array
  const completionState = useRef<CompletionState | null>(null);

  const getCompletions = async (path: string, currentPath: string[]): Promise<string[]> => {
    try {
      const searchPath = path.includes("/")
        ? path.slice(0, path.lastIndexOf("/") + 1)
        : currentPath.join("/");

      const response = await fetch(`/api/fs?path=${encodeURIComponent(searchPath)}`);
      if (!response.ok) return [];

      const contents = await response.json();
      const searchTerm = path.split("/").pop() || "";

      return contents
        .filter(({ name }) => name.toLowerCase().startsWith(searchTerm.toLowerCase()))
        .map(({ name, type }) => (type === "directory" ? `${name}/` : name))
        .sort((a: string, b: string) => a.localeCompare(b));
    } catch {
      return [];
    }
  };

  const handleTabCompletion = async (command: string) => {
    const [cmd, ...args] = command.split(" ");

    // Only handle tab completion for specific commands
    const completableCommands = ["cd", "ls", "ai"];
    if (!completableCommands.includes(cmd)) return;

    // For 'ai' command, only complete paths after subcommand
    let partial = "";
    if (cmd === "ai") {
      // No subcommand yet, don't complete
      if (args.length === 0) return;

      // First argument should be subcommand
      const [subcommand, ...restArgs] = args;
      if (!["sum", "summarize", "ask"].includes(subcommand)) return;

      // Get the partial path from the last argument
      partial = restArgs[restArgs.length - 1] || "";

      if (!completionState.current) {
        // First tab press - get matches
        const matches = await getCompletions(partial, currentPath.current);
        if (matches.length === 0) return;

        const posY =
          term!.buffer.active.baseY === 0
            ? term!.buffer.active.cursorY + 1
            : term!.buffer.active.length;

        completionState.current = {
          matches,
          currentIndex: 0,
          originalInput: command,
          linePositionY: posY,
        };

        // Show matches and select first one
        term?.writeln("");
        term?.write(matches.join("  "));
        term?.select(0, posY, matches[0].length);

        // Update command with selected match
        const newCommand = `${cmd} ${subcommand} ${matches[0]}`;
        currentCommand.current = newCommand;
        term?.writeln("");
        term?.write("\r\x1b[K$ " + newCommand);
      } else {
        // Subsequent tab presses - cycle through matches
        const { matches, linePositionY } = completionState.current;
        completionState.current.currentIndex =
          (completionState.current.currentIndex + 1) % matches.length;

        const currentMatch = matches[completionState.current.currentIndex];
        const prevMatches = matches.slice(0, completionState.current.currentIndex);
        const matchStart = prevMatches.reduce((acc, m) => acc + m.length + 2, 0);

        term?.select(matchStart, linePositionY, currentMatch.length);

        // Update command with selected match
        const newCommand = `${cmd} ${subcommand} ${currentMatch}`;
        currentCommand.current = newCommand;
        term?.write("\r\x1b[K$ " + newCommand);
      }
    } else {
      const partial = args[args.length - 1] || "";

      if (!completionState.current) {
        // First tab press - get matches
        const matches = await getCompletions(partial, currentPath.current);
        if (matches.length === 0) return;

        const posY =
          term!.buffer.active.baseY === 0
            ? term!.buffer.active.cursorY + 1
            : term!.buffer.active.length;

        completionState.current = {
          matches,
          currentIndex: 0,
          originalInput: command,
          linePositionY: posY,
        };

        // Show matches and select first one
        term?.writeln("");
        term?.write(matches.join("  "));
        term?.select(0, posY, matches[0].length);

        // Update command with selected match
        const newCommand = `${cmd} ${matches[0]}`;
        currentCommand.current = newCommand;
        term?.writeln("");
        term?.write("\r\x1b[K$ " + newCommand);
      } else {
        // Subsequent tab presses - cycle through matches
        const { matches, linePositionY } = completionState.current;
        completionState.current.currentIndex =
          (completionState.current.currentIndex + 1) % matches.length;

        // Calculate position of current match
        const currentMatch = matches[completionState.current.currentIndex];
        const prevMatches = matches.slice(0, completionState.current.currentIndex);
        const matchStart = prevMatches.reduce((acc, m) => acc + m.length + 2, 0); // + 2 for the two spaces

        term?.select(matchStart, linePositionY, currentMatch.length);

        // Update command with selected match
        const newCommand = `${cmd} ${currentMatch}`;
        currentCommand.current = newCommand;
        term?.write("\r\x1b[K$ " + newCommand);
      }
    }
  };

  // Initialize terminal
  useEffect(() => {
    const terminal = new XTerm({
      cursorBlink: true,
      cursorInactiveStyle: "block",
      fontSize: 15,
      lineHeight: 1.2,
      theme: {
        background: "#222c3d", // --sh-color-dark
        foreground: "#e0e1dd", // --sh-color-lightest
      },
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    setTerm(terminal);

    return () => {
      if (terminal) {
        terminal.dispose();
      }
    };
  }, []);

  // Handle DOM interaction and events
  useEffect(() => {
    if (!term || !terminalRef.current) return;

    // Add addons
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Open terminal in div
    term.open(terminalRef.current);
    fitAddon.fit(); // Initial fit

    // Initial greeting
    term.writeln("Welcome to danbuchholz.com");
    term.writeln("Type 'help' for available commands\n");
    term.write("$ ");

    // Handle input
    const disposable = term.onData((data) => {
      const code = data.charCodeAt(0);
      const isArrowKey = code === 27; // ESC key, which prefixes arrow keys

      // Tab key
      if (data === "\t") {
        const command = currentCommand.current.trim();
        if (!command) return;
        handleTabCompletion(command);
        return;
      }
      if (completionState.current) {
        completionState.current = null;
      }

      // Arrow keys
      if (isArrowKey) {
        const arrowKey = data.slice(1);
        if (arrowKey === "[C") {
          // Right arrow
          if (cursorOffset.current > 0) {
            cursorOffset.current--;
            term.write(data);
          }
        } else if (arrowKey === "[D") {
          // Left arrow
          if (term.buffer.active.cursorX > 2) {
            // Don't go past prompt
            cursorOffset.current++;
            term.write(data);
          }
        }
        return;
      }

      // Enter key
      if (data === "\r") {
        const command = currentCommand.current.trim();
        term.writeln("");

        if (command) {
          const [cmd, ...args] = command.split(" ");
          if (commands[cmd]) {
            // Execute command asynchronously
            const context = { currentPath: currentPath.current };
            Promise.resolve(commands[cmd].execute(args, context, term))
              .then((output) => {
                term.writeln(output);
                term.write("$ "); // Write prompt after command completes
              })
              .catch((error) => {
                term.writeln(`Error executing command: ${error.message}`);
                term.write("$ "); // Write prompt after error
              });
          } else {
            term.writeln(`Command not found: ${cmd}`);
            term.write("$ ");
          }
        } else {
          // term.writeln(""); // Add newline for empty command
          term.write("$ ");
        }

        currentCommand.current = "";
        cursorOffset.current = 0;
      }

      // Backspace key
      if (data === "\u007F") {
        if (currentCommand.current.length > 0 && term.buffer.active.cursorX > 2) {
          const pos = currentCommand.current.length - cursorOffset.current;
          if (pos > 0) {
            // Remove character at current position
            currentCommand.current =
              currentCommand.current.slice(0, pos - 1) + currentCommand.current.slice(pos);

            // Move cursor to start of command (after prompt)
            term.write("\b".repeat(pos));
            // Clear the current command content
            term.write(" ".repeat(currentCommand.current.length + 1));
            // Move back to start of command
            term.write("\b".repeat(currentCommand.current.length + 1));
            // Write the updated command
            term.write(currentCommand.current);
            // Restore cursor position
            term.write("\b".repeat(cursorOffset.current));
          }
        }
      }

      // Word delete
      if (data === "\u0017" || data === "\u001b\u007F" || data === "\u0008") {
        if (currentCommand.current.length > 0) {
          const pos = currentCommand.current.length - cursorOffset.current;
          let newPos = pos;

          // Find the start of the current word
          while (newPos > 0 && currentCommand.current[newPos - 1] === " ") newPos--;
          while (newPos > 0 && currentCommand.current[newPos - 1] !== " ") newPos--;

          if (newPos >= 0) {
            // Remove word
            currentCommand.current =
              currentCommand.current.slice(0, newPos) + currentCommand.current.slice(pos);

            // Move cursor to start of command (after prompt)
            term.write("\b".repeat(pos));
            // Clear the current command content
            term.write(" ".repeat(pos));
            // Move back to start of command
            term.write("\b".repeat(pos));
            // Write the updated command
            term.write(currentCommand.current);
            // Restore cursor position
            term.write("\b".repeat(cursorOffset.current));
          }
        }
      }

      // Printable characters
      if (!isArrowKey && code >= 32 && code < 127) {
        const pos = currentCommand.current.length - cursorOffset.current;
        currentCommand.current =
          currentCommand.current.slice(0, pos) + data + currentCommand.current.slice(pos);

        // Clear from cursor to end of screen
        term.write("\x1b[K");

        // Write the updated command
        term.write(data);

        // If there's more text after the cursor, rewrite it
        if (cursorOffset.current > 0) {
          const remainingText = currentCommand.current.slice(pos + 1);
          term.write(remainingText);
          // Move cursor back to insertion point
          term.write("\b".repeat(remainingText.length));
        }
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };

    term.onResize(handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      disposable.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, [term]);

  return (
    <div
      ref={terminalRef}
      className="h-[400px] w-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800"
    />
  );
}
