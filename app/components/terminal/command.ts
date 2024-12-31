import { Terminal as XTerm } from "@xterm/xterm";

import { FsItem } from "@/api/fs/route";
import { LlmRequest, LlmSummarizeResponse } from "@/api/ai/route";
import { formatText } from "./utils";

export type CommandContext = {
  currentPath: string[];
};

export type Command = {
  name: string;
  description: string;
  execute: (args: string[], context: CommandContext, term: XTerm) => string | Promise<string>;
};

export const commands: Record<string, Command> = {
  // Utility commands
  clear: {
    name: "clear",
    description: "Clear the terminal screen",
    execute: (_, __, term) => {
      term?.clear();
      term?.write("\x1b[H"); // Move cursor to home position (0,0)
      return ""; // Return empty string since we don't want to write anything
    },
  },
  help: {
    name: "help",
    description: "List all available commands",
    execute: () => {
      return Object.entries(commands)
        .filter(([name]) => name !== "help")
        .map(([name, cmd]) => `${name.padEnd(8)} - ${cmd.description}`)
        .sort((a: string, b: string) => a.localeCompare(b))
        .join("\r\n");
    },
  },
  // File system commands
  cat: {
    name: "cat",
    description: "Display file contents",
    execute: async (args, { currentPath }, term) => {
      if (!args[0]) {
        return "Usage: cat <filename>";
      }

      try {
        let fullPath: string;
        if (currentPath.length > 0) {
          // In a subdirectory - join paths
          fullPath = `${currentPath.join("/")}/${args[0]}`;
        } else {
          // At root - use path directly
          fullPath = args[0];
        }

        const encodedPath = encodeURIComponent(fullPath);
        const response = await fetch(`/api/fs?path=${encodedPath}`);
        if (!response.ok) throw new Error("File not found");

        const contents = (await response.json()) as FsItem[];
        // Check if the target is a directory
        const targetItem = contents.find((item) => item.name === args[0].replace(/\/$/, ""));
        if (!targetItem || targetItem.type !== "file") {
          return `cat: ${args[0]}: Is a directory`;
        }

        // For files, the contents array should contain the file content
        if (Array.isArray(contents) && contents.length >= 1 && contents[0].fileContents) {
          return formatText(contents[0].fileContents);
        }

        throw new Error("Invalid file format");
      } catch (error) {
        return `cat: ${args[0]}: ${error.message}`;
      }
    },
  },
  cd: {
    name: "cd",
    description: "Change directory",
    execute: async (args, { currentPath }) => {
      const path = args[0];

      // No args - return to root
      if (!path) {
        currentPath.length = 0;
        return "";
      }

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
        let fullPath: string;
        if (currentPath.length > 0) {
          // In a subdirectory - join paths
          fullPath = `${currentPath.join("/")}/${path}`;
        } else {
          // At root - use path directly
          fullPath = path;
        }
        const encodedPath = encodeURIComponent(fullPath);
        const response = await fetch(`/api/fs?path=${encodedPath}`);
        if (!response.ok) throw new Error("File or directory not found");

        const contents = (await response.json()) as FsItem[];

        // Check if the target itself is a file (not its contents)
        const targetItem = contents.find((item) => item.name === path.replace(/\/$/, ""));
        if (targetItem?.type === "file") {
          return `cd: ${path}: Not a directory`;
        }

        // Update current path with just the new segment
        currentPath.push(...path.split("/").filter(Boolean));
        return "";
      } catch {
        return `cd: ${path}: No such directory`;
      }
    },
  },
  ls: {
    name: "ls",
    description: "List directory contents",
    execute: async (args, { currentPath }) => {
      let path: string;
      if (!args[0]) {
        // No args - list current directory
        path = currentPath.join("/");
      } else {
        // Args provided - construct full path from current location
        path = currentPath.length > 0 ? `${currentPath.join("/")}/${args[0]}` : args[0];
      }
      try {
        const encodedPath = encodeURIComponent(path);
        const response = await fetch(`/api/fs?path=${encodedPath}`);
        if (!response.ok) throw new Error("Failed to list directory");

        const contents = (await response.json()) as FsItem[];
        return contents
          .map(({ name, type }) => (type === "directory" ? `${name}/` : name))
          .sort((a: string, b: string) => a.localeCompare(b))
          .join("\r\n");
      } catch {
        return `ls: cannot access '${path}': No such file or directory`;
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
  // AI-assisted command
  about: {
    name: "about",
    description: "Learn more about me",
    execute: async (_, __, term) => {
      return handleAbout(term);
    },
  },
  ai: {
    name: "ai",
    description: "Get content summaries or ask questions",
    execute: async (args, { currentPath }, term) => {
      const [subcommand, path] = args;
      let fullPath: string;
      if (currentPath.length > 0) {
        // In a subdirectory - join paths
        fullPath = `${currentPath.join("/")}/${path}`;
      } else {
        // At root - use path directly
        fullPath = path;
      }

      switch (subcommand) {
        case "sum":
        case "summarize":
          return handleSummarize(fullPath, term);
        case "ask":
          const question = args.slice(2).join(" ");
          return handleAsk(fullPath, question, term);
        default:
          return "Usage: ai [ask|summarize] <path> [question]";
      }
    },
  },
};

async function handleAbout(term: XTerm): Promise<string> {
  try {
    term.write("Analyzing about page...\r\n");
    const request: LlmRequest = {
      type: "about",
    };
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error("Failed to analyze about page");
    const body = (await response.json()) as LlmSummarizeResponse;
    const { summary: rawSummary } = body;
    const summary = formatText(rawSummary);
    return summary;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function handleSummarize(path: string, term: XTerm): Promise<string> {
  if (!path || path.trim() === "") {
    return "Usage: ai summarize <path> (alias: 'sum')";
  }
  try {
    term.write("Summarizing...\r\n");

    const request: LlmRequest = {
      path,
      type: "summarize",
    };
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("File or directory not found");
    // Handle streaming response
    const reader = response.body?.getReader();
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const response = JSON.parse(new TextDecoder().decode(result?.value));
      const summary = formatText(response.summary);
      term.write(summary);
    }

    return "";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function handleAsk(path: string, question: string, term: XTerm): Promise<string> {
  if (!question || question.trim() === "" || !path || path.trim() === "") {
    return "Usage: ai ask <path> <question>";
  }
  try {
    term.write("Asking...\r\n");
    const request: LlmRequest = {
      path,
      type: "ask",
      question,
    };
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("File or directory not found");

    const reader = response.body?.getReader();
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const response = JSON.parse(new TextDecoder().decode(result?.value));
      const answer = formatText(response.answer);
      term.write(answer);
    }
    return "";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
