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
        .map(([name, cmd]) => `${name.padEnd(8)} - ${cmd.description}`)
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
        .sort((a, b) => a.localeCompare(b)); // Sort alphabetically
    } catch {
      return [];
    }
  };

  const handleTabCompletion = async (command: string) => {
    const [cmd, ...args] = command.split(" ");
    if (cmd !== "cd" && cmd !== "ls") return;

    const partial = args[args.length - 1] || "";

    if (!completionState.current) {
      // First tab press - get matches
      const matches = await getCompletions(partial, currentPath.current);
      if (matches.length === 0) return;

      completionState.current = {
        matches,
        currentIndex: 0,
        originalInput: command,
      };

      if (matches.length === 1) {
        // Single match - complete it
        const newCommand = `${cmd} ${matches[0]}`;
        currentCommand.current = newCommand;
        term?.write("\r\x1b[K$ " + newCommand);
      } else {
        // Multiple matches - show options
        term?.writeln("");
        term?.write(matches.join("  "));

        // Select (highlight) the first match
        const matchStart = 0;
        const matchLength = matches[0].length;
        term?.select(matchStart, term.buffer.active.cursorY + 1, matchLength);

        // Update command with selected match
        const newCommand = `${cmd} ${matches[0]}`;
        currentCommand.current = newCommand;
        term?.writeln("");
        term?.write("\r\x1b[K$ " + newCommand);
      }
    } else {
      // Subsequent tab presses - cycle through matches
      const { matches } = completionState.current;
      completionState.current.currentIndex =
        (completionState.current.currentIndex + 1) % matches.length;

      // Calculate position of current match
      const currentMatch = matches[completionState.current.currentIndex];
      const prevMatches = matches.slice(0, completionState.current.currentIndex);
      const matchStart = prevMatches.reduce((acc, m) => acc + m.length + 2, 0); // +2 for the two spaces

      // Select (highlight) the current match
      term?.select(matchStart, term.buffer.active.cursorY - 1, currentMatch.length);

      // Update command with selected match
      const newCommand = `${cmd} ${currentMatch}`;
      currentCommand.current = newCommand;
      term?.write("\r\x1b[K$ " + newCommand);
    }
  };

  // Initialize terminal
  useEffect(() => {
    const terminal = new XTerm({
      cursorBlink: true,
      cursorInactiveStyle: "block",
      // fontFamily: "Fira Code",
      fontSize: 15,
      lineHeight: 1.2,
      theme: {
        background: "#000000",
        foreground: "#ffffff",
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
    // Add these refs to track cursor and command state

    // Handle input
    const disposable = term.onData((data) => {
      const code = data.charCodeAt(0);
      const isArrowKey = code === 27; // ESC key, which prefixes arrow keys

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

      if (data === "\t") {
        // Tab key
        const command = currentCommand.current.trim();
        if (!command) return;
        handleTabCompletion(command);
        return;
      }
      if (completionState.current) {
        completionState.current = null;
      }

      if (data === "\r") {
        // Enter key
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
      } else if (data === "\u007F") {
        // Backspace
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
      } else if (data === "\u0017" || data === "\u001b\u007F" || data === "\u0008") {
        // Word delete
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
      } else if (!isArrowKey && code >= 32 && code < 127) {
        // Printable characters
        const pos = currentCommand.current.length - cursorOffset.current;
        // Insert character at cursor position
        currentCommand.current =
          currentCommand.current.slice(0, pos) + data + currentCommand.current.slice(pos);

        // Move cursor to start of command (after prompt)
        term.write("\b".repeat(pos));
        // Write the updated command
        term.write(currentCommand.current);
        // Restore cursor position
        term.write("\b".repeat(cursorOffset.current));
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
