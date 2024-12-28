"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

import { commands } from "./command";
import { createTabCompletionHandler, getCompletions } from "./completion";

type CompletionState = {
  matches: string[];
  currentIndex: number;
  originalInput: string;
  linePositionY: number;
};

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);
  const currentCommand = useRef("");
  const cursorOffset = useRef(0); // Position from the end of the command
  const currentPath = useRef<string[]>([]); // Initialize empty path array
  const completionState = useRef<CompletionState | null>(null);

  const handleTabCompletion = useCallback(
    async (command: string) => {
      return createTabCompletionHandler({
        term,
        currentPath,
        completionState,
        currentCommand,
        getCompletions,
      })(command);
    },
    [term, currentPath, completionState, currentCommand]
  );

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
  }, [term, handleTabCompletion]);

  return (
    <div
      ref={terminalRef}
      className="h-[400px] w-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800"
    />
  );
}
