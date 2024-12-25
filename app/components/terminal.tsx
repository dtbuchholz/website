"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

type Command = {
  name: string;
  description: string;
  execute: (args: string[]) => string;
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
  ls: {
    name: "ls",
    description: "List directory contents",
    execute: () => {
      // Format ls output with consistent spacing
      const files = ["blog/", "about.md", "projects/", "resume.pdf"];
      return files.join("\r\n"); // Use \r\n for consistent line breaks
    },
  },
};

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);
  const currentCommand = useRef("");

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
  // Handle DOM interaction and events
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
    const disposable = term.onData((data) => {
      const code = data.charCodeAt(0);
      const isArrowKey = code === 27; // ESC key, which prefixes arrow keys

      if (isArrowKey) {
        const arrowKey = data.slice(1); // Get the actual arrow key sequence
        if (arrowKey === "[C") {
          // Right arrow
          // Only move right if we're not at the end of the command
          if (term.buffer.active.cursorX < currentCommand.current.length + 2) {
            // +2 for the "$ " prompt
            term.write(data);
          }
        } else if (arrowKey === "[D") {
          // Left arrow
          // Only move left if we're not at the start of the command (after the prompt)
          if (term.buffer.active.cursorX > 2) {
            // 2 is the position after "$ "
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
            const output = commands[cmd].execute(args);
            term.writeln(output);
          } else {
            term.writeln(`Command not found: ${cmd}`);
          }
        }

        currentCommand.current = ""; // Reset command
        term.write("$ ");
      } else if (data === "\u007F") {
        // Backspace
        // Only backspace if there's text to delete
        if (currentCommand.current.length > 0) {
          currentCommand.current = currentCommand.current.slice(0, -1);
          term.write("\b \b");
        }
      } else if (data === "\u0017" || data === "\u001b\u007F" || data === "\u0008") {
        // Ctrl+W or Cmd+Backspace or Option+Backspace or Ctrl+Backspace
        // Delete last word
        const lastSpace = currentCommand.current.lastIndexOf(" ");
        if (lastSpace !== -1) {
          const charsToDelete = currentCommand.current.length - lastSpace - 1;
          currentCommand.current = currentCommand.current.slice(0, lastSpace + 1);
          term.write(
            "\b".repeat(charsToDelete) + " ".repeat(charsToDelete) + "\b".repeat(charsToDelete)
          );
        } else {
          // No spaces found, delete entire command
          const length = currentCommand.current.length;
          currentCommand.current = "";
          term.write("\b".repeat(length) + " ".repeat(length) + "\b".repeat(length));
        }
      } else if (data === "\u0015") {
        // Ctrl+U
        // Clear entire line
        const length = currentCommand.current.length;
        currentCommand.current = "";
        term.write("\b".repeat(length) + " ".repeat(length) + "\b".repeat(length));
      } else if (!isArrowKey && code >= 32 && code < 127) {
        // Printable characters
        currentCommand.current += data;
        term.write(data);
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
