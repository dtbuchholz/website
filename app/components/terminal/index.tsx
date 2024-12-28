"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

import { commands } from "./command";
import { CompletionState, createTabCompletionHandler, getCompletions } from "./completion";
import { CommandHistory, createKeyHandlers } from "./keypress";

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);
  const currentCommand = useRef("");
  const cursorOffset = useRef(0); // Position from the end of the command
  const currentPath = useRef<string[]>([]); // Initialize empty path array
  const completionState = useRef<CompletionState | null>(null);
  const commandHistory = useRef<CommandHistory>(new CommandHistory(100));
  const historyIndex = useRef<number>(0);

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
    term.focus();

    // Handle input
    const keyHandler = createKeyHandlers({
      term,
      currentCommand,
      cursorOffset,
      currentPath,
      completionState,
      commandHistory,
      historyIndex,
      commands,
      handleTabCompletion,
    });

    const disposable = term.onData(keyHandler);

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    term.onResize(handleResize);

    return () => {
      disposable.dispose();
    };
  }, [term, handleTabCompletion]);

  return (
    <div
      ref={terminalRef}
      className="h-[400px] w-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800"
    />
  );
}
