import { Terminal as XTerm } from "@xterm/xterm";

import { FsItem } from "@/api/fs/route";

const COMPLETABLE_COMMANDS = ["ai", "cat", "cd", "ls", "open"];

export type CompletionState = {
  matches: string[];
  currentIndex: number;
  originalInput: string;
  linePositionY: number;
};

type TabCompletionDeps = {
  term: XTerm | null;
  currentPath: React.MutableRefObject<string[]>;
  completionState: React.MutableRefObject<CompletionState | null>;
  currentCommand: React.MutableRefObject<string>;
  getCompletions: (path: string, currentPath: string[]) => Promise<string[]>;
};

export const getCompletions = async (path: string, currentPath: string[]): Promise<string[]> => {
  try {
    const searchPath = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/") + 1)
      : currentPath.join("/");

    const response = await fetch(`/api/fs?path=${encodeURIComponent(searchPath)}`);
    if (!response.ok) return [];

    const contents = (await response.json()) as FsItem[];
    const searchTerm = path.split("/").pop() || "";

    return contents
      .filter(({ name }) => name.toLowerCase().startsWith(searchTerm.toLowerCase()))
      .map(({ name, type }) => (type === "directory" ? `${name}/` : name))
      .sort((a: string, b: string) => a.localeCompare(b));
  } catch {
    return [];
  }
};

export function createTabCompletionHandler(deps: TabCompletionDeps): (command: string) => void {
  const { term, currentPath, completionState, currentCommand, getCompletions } = deps;

  const handleFirstTabPress = async (cmd: string, subcommand: string | null, partial: string) => {
    const matches = await getCompletions(partial, currentPath.current);
    if (matches.length === 0) return;

    const posY =
      term!.buffer.active.baseY === 0
        ? term!.buffer.active.cursorY + 1
        : term!.buffer.active.length;

    completionState.current = {
      matches,
      currentIndex: 0,
      originalInput: cmd,
      linePositionY: posY,
    };

    // Show matches and select first one
    term?.writeln("");
    term?.write(matches.join("  "));
    term?.select(0, posY, matches[0].length);

    // Update command with selected match
    const newCommand = subcommand ? `${cmd} ${subcommand} ${matches[0]}` : `${cmd} ${matches[0]}`;
    currentCommand.current = newCommand;
    term?.writeln("");
    term?.write("\r\x1b[K$ " + newCommand);
  };

  const handleSubsequentTabPress = (cmd: string, subcommand: string | null) => {
    const { matches, linePositionY } = completionState.current!;
    completionState.current!.currentIndex =
      (completionState.current!.currentIndex + 1) % matches.length;

    const currentMatch = matches[completionState.current!.currentIndex];
    const prevMatches = matches.slice(0, completionState.current!.currentIndex);
    const matchStart = prevMatches.reduce((acc, m) => acc + m.length + 2, 0);

    term?.select(matchStart, linePositionY, currentMatch.length);

    // Update command with selected match
    const newCommand = subcommand
      ? `${cmd} ${subcommand} ${currentMatch}`
      : `${cmd} ${currentMatch}`;
    currentCommand.current = newCommand;
    term?.write("\r\x1b[K$ " + newCommand);
  };

  const handleAiCompletion = async (cmd: string, args: string[]) => {
    // No subcommand yet, don't complete
    if (args.length === 0) return;

    // First argument should be subcommand
    const [subcommand, ...restArgs] = args;
    if (!["sum", "summarize", "ask"].includes(subcommand)) return;

    // Get the partial path from the last argument
    const partial = restArgs[restArgs.length - 1] || "";

    if (!completionState.current) {
      await handleFirstTabPress(cmd, subcommand, partial);
    } else {
      handleSubsequentTabPress(cmd, subcommand);
    }
  };

  const handleRegularCompletion = async (cmd: string, args: string[]) => {
    const partial = args[args.length - 1] || "";

    if (!completionState.current) {
      await handleFirstTabPress(cmd, null, partial);
    } else {
      handleSubsequentTabPress(cmd, null);
    }
  };

  return async (command: string) => {
    const [cmd, ...args] = command.split(" ");

    if (!COMPLETABLE_COMMANDS.includes(cmd)) return;

    if (cmd === "ai") {
      await handleAiCompletion(cmd, args);
    } else {
      await handleRegularCompletion(cmd, args);
    }
  };
}
