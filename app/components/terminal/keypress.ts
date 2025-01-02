import { Terminal as XTerm } from "@xterm/xterm";

import { Command, CommandOutput } from "./command";
import { CompletionState } from "./completion";

type KeyHandlerDeps = {
  term: XTerm;
  currentCommand: React.MutableRefObject<string>;
  cursorOffset: React.MutableRefObject<number>;
  currentPath: React.MutableRefObject<string[]>;
  completionState: React.MutableRefObject<CompletionState | null>;
  commandHistory: React.MutableRefObject<CommandHistory>;
  historyIndex: React.MutableRefObject<number>;
  commands: Record<string, Command>;
  handleTabCompletion: (command: string) => Promise<void>;
  handleCommandOutput: (output: CommandOutput) => void;
};

export class CommandHistory {
  private history: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  add(command: string): void {
    // Don't add if it's the same as the last command
    if (this.history.length > 0 && this.history[this.history.length - 1] === command) {
      return;
    }
    this.history.push(command);
    // Remove oldest command if we exceed maxSize
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }

  get(index: number): string {
    return this.history[index];
  }

  get length(): number {
    return this.history.length;
  }

  get all(): string[] {
    return [...this.history];
  }
}

export function createKeyHandlers(deps: KeyHandlerDeps): (data: string) => void {
  const {
    term,
    currentCommand,
    cursorOffset,
    currentPath,
    completionState,
    commandHistory,
    historyIndex,
    commands,
    handleTabCompletion,
    handleCommandOutput,
  } = deps;

  const handleTab = () => {
    const command = currentCommand.current.trim();
    if (!command) return;
    handleTabCompletion(command);
  };

  const handleArrowKeys = (data: string) => {
    const arrowKey = data.slice(1);
    if (arrowKey === "[A") {
      // Up arrow
      if (commandHistory.current.length > 0) {
        if (historyIndex.current > 0) {
          historyIndex.current--;
          const historicCommand = commandHistory.current.get(historyIndex.current);

          // Clear current line
          term.write("\r\x1b[K$ ");
          term.write(historicCommand);
          currentCommand.current = historicCommand;
          cursorOffset.current = 0;
        }
      }
    } else if (arrowKey === "[B") {
      // Down arrow
      if (historyIndex.current < commandHistory.current.length) {
        historyIndex.current++;
        const historicCommand =
          historyIndex.current === commandHistory.current.length
            ? ""
            : commandHistory.current.get(historyIndex.current);

        // Clear current line
        term.write("\r\x1b[K$ ");
        term.write(historicCommand);
        currentCommand.current = historicCommand;
        cursorOffset.current = 0;
      }
    } else if (arrowKey === "[C") {
      // Right arrow
      if (cursorOffset.current > 0) {
        cursorOffset.current--;
        term.write(data);
      }
    } else if (arrowKey === "[D") {
      // Left arrow
      if (term.buffer.active.cursorX > 2) {
        cursorOffset.current++;
        term.write(data);
      }
    }
  };

  const handleEnter = () => {
    const command = currentCommand.current.trim();

    // If we have an active completion, just append it to the current command
    if (completionState.current) {
      const { matches, currentIndex, currentPath, isDirectory } = completionState.current;
      const selectedMatch = matches[currentIndex];

      // Clear the completion display
      term.write("\x1b[K");
      if (isDirectory) {
        // If it's a directory, update the command but don't execute
        const [cmd, ...parts] = command.split(" ");
        parts.pop(); // Remove the incomplete part
        const newPath = currentPath + selectedMatch;
        currentCommand.current = `${cmd} ${newPath}`;
        // clear the existing line
        term.write("\r\x1b[K$ " + currentCommand.current);
      } else {
        // If it's a file, execute the command
        term.write("\r\n");
        executeCommand(command);
      }

      completionState.current = null;
      return;
    }

    // Normal command execution
    term.writeln("");
    executeCommand(command);
  };

  const executeCommand = (command: string) => {
    if (command) {
      // Add to history if it's not the same as the last command
      commandHistory.current.add(command);
      historyIndex.current = commandHistory.current.length;

      // Execute command
      const [cmd, ...args] = command.split(" ");
      if (cmd in commands) {
        const context = { currentPath: currentPath.current };
        Promise.resolve(commands[cmd].execute({ args, context, term }))
          .then((output) => {
            handleCommandOutput(output);
            term.write("$ ");
          })
          .catch((error) => {
            term.writeln(`Error executing command: ${error.message}`);
            term.write("$ ");
          });
      } else {
        term.writeln(`Command not found: ${cmd}`);
        term.write("$ ");
      }
    } else {
      term.write("$ ");
    }

    currentCommand.current = "";
    cursorOffset.current = 0;
  };

  const handleBackspace = () => {
    if (currentCommand.current.length > 0 && term.buffer.active.cursorX > 2) {
      const pos = currentCommand.current.length - cursorOffset.current;
      if (pos > 0) {
        currentCommand.current =
          currentCommand.current.slice(0, pos - 1) + currentCommand.current.slice(pos);

        // Move cursor back
        term.write("\b");
        if (cursorOffset.current > 0) {
          // Write remaining text
          term.write(currentCommand.current.slice(pos - 1));
          // Add space to clear last character
          term.write(" ");
          // Move cursor back to position
          term.write("\b".repeat(cursorOffset.current + 1));
        } else {
          // Just clear the last character
          term.write(" \b");
        }
      }
    }
  };

  const handleWordDelete = () => {
    if (currentCommand.current.length > 0) {
      const pos = currentCommand.current.length - cursorOffset.current;
      let newPos = pos;

      while (newPos > 0 && currentCommand.current[newPos - 1] === " ") newPos--;
      while (newPos > 0 && currentCommand.current[newPos - 1] !== " ") newPos--;

      if (newPos >= 0) {
        currentCommand.current =
          currentCommand.current.slice(0, newPos) + currentCommand.current.slice(pos);

        term.write("\b".repeat(pos));
        term.write(" ".repeat(pos));
        term.write("\b".repeat(pos));
        term.write(currentCommand.current);
        term.write("\b".repeat(cursorOffset.current));
      }
    }
  };

  const handlePrintableChar = (data: string) => {
    const pos = currentCommand.current.length - cursorOffset.current;
    currentCommand.current =
      currentCommand.current.slice(0, pos) + data + currentCommand.current.slice(pos);

    // Only rewrite what's necessary
    if (cursorOffset.current > 0) {
      // Save cursor position
      term.write(data + currentCommand.current.slice(pos + 1));
      // Move cursor back to correct position
      term.write("\b".repeat(cursorOffset.current));
    } else {
      // If we're at the end, just write the character
      term.write(data);
    }
  };

  return (data: string) => {
    const code = data.charCodeAt(0);
    const isArrowKey = code === 27;

    if (data === "\t") {
      handleTab();
      return;
    }

    if (data === "\r") {
      handleEnter();
      return;
    }

    if (completionState.current) {
      completionState.current = null;
    }

    if (isArrowKey) {
      handleArrowKeys(data);
      return;
    }

    if (data === "\u007F") {
      handleBackspace();
      return;
    }

    if (data === "\u0017" || data === "\u001b\u007F" || data === "\u0008") {
      handleWordDelete();
      return;
    }

    if (!isArrowKey && code >= 32 && code < 127) {
      handlePrintableChar(data);
    }
  };
}
