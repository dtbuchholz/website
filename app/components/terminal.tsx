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
  const cursorOffset = useRef(0); // Position from the end of the command

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
            const output = commands[cmd].execute(args);
            term.writeln(output);
          } else {
            term.writeln(`Command not found: ${cmd}`);
          }
        }

        currentCommand.current = "";
        cursorOffset.current = 0;
        term.write("$ ");
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
