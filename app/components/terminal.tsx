"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

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
      if (data === "\r") {
        // Enter key
        term.writeln("");
        currentCommand.current = ""; // Reset command
        term.write("$ ");
      } else if (data === "\u007F") {
        // Backspace
        // Only backspace if there's text to delete
        if (currentCommand.current.length > 0) {
          currentCommand.current = currentCommand.current.slice(0, -1);
          term.write("\b \b");
        }
      } else {
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
