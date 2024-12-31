"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

import { LoadingSpinner } from "@/components/loading";
import { commands } from "./command";
import { CompletionState, createTabCompletionHandler, getCompletions } from "./completion";
import { CommandHistory, createKeyHandlers } from "./keypress";

export default function Terminal() {
  const [isReady, setIsReady] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
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
    fitAddonRef.current = fitAddon;

    return () => {
      terminal.dispose();
    };
  }, []);

  // Handle DOM interaction and events
  useEffect(() => {
    if (!term || !terminalRef.current) return;

    // Open terminal in div
    term.open(terminalRef.current);
    fitAddonRef.current?.fit();

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
    setIsReady(true);

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      disposable.dispose();
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [term, handleTabCompletion]);

  return (
    <div className="relative h-[400px] w-full">
      <div
        ref={terminalRef}
        className="z-0 h-full w-full rounded-lg overflow-hidden border border-neutral-800"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
