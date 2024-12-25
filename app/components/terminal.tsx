"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

type CommandContext = {
  currentPath: string[];
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
      const path = args[0] || "";

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
        const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error("Not a directory");

        const contents = await response.json();
        if (contents) {
          // Update current path
          const newPath = path.split("/").filter(Boolean);
          currentPath.length = 0; // Clear existing path
          currentPath.push(...newPath); // Add new path components
        }
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
      const path = args[0] || currentPath.join("/");
      try {
        const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error("Failed to list directory");

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

  // Initialize terminal
  useEffect(() => {
    const terminal = new XTerm({
      cursorBlink: true,
      cursorInactiveStyle: "block",
      fontFamily: "Fira Code",
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
    term.writeln("Welcome to danbuchholz.com terminal");
    term.writeln('Type "help" for available commands\n');
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
