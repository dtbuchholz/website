import { Terminal as XTerm } from "@xterm/xterm";
import { Command } from "./command";
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

export function createKeyHandlers(deps: KeyHandlerDeps) {
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
    term.writeln("");

    if (command) {
      // Add to history if it's not the same as the last command
      commandHistory.current.add(command);
      historyIndex.current = commandHistory.current.length;

      // Execute command
      const [cmd, ...args] = command.split(" ");
      if (commands[cmd]) {
        const context = { currentPath: currentPath.current };
        Promise.resolve(commands[cmd].execute(args, context, term))
          .then((output) => {
            term.writeln(output);
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

        term.write("\b".repeat(pos));
        term.write(" ".repeat(currentCommand.current.length + 1));
        term.write("\b".repeat(currentCommand.current.length + 1));
        term.write(currentCommand.current);
        term.write("\b".repeat(cursorOffset.current));
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

    term.write("\x1b[K");
    term.write(data);

    if (cursorOffset.current > 0) {
      const remainingText = currentCommand.current.slice(pos + 1);
      term.write(remainingText);
      term.write("\b".repeat(remainingText.length));
    }
  };

  return (data: string) => {
    const code = data.charCodeAt(0);
    const isArrowKey = code === 27;

    if (data === "\t") {
      handleTab();
      return;
    }

    if (completionState.current) {
      completionState.current = null;
    }

    if (isArrowKey) {
      handleArrowKeys(data);
      return;
    }

    if (data === "\r") {
      handleEnter();
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
