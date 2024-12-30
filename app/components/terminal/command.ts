import { Terminal as XTerm } from "@xterm/xterm";

export type CommandContext = {
  currentPath: string[];
};

export type Command = {
  name: string;
  description: string;
  execute: (args: string[], context: CommandContext, term: XTerm) => string | Promise<string>;
};

export const commands: Record<string, Command> = {
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
        const response = await fetch(`/api/fs?path=${encodeURIComponent(fullPath)}`);
        if (!response.ok) throw new Error("File or directory not found");

        const contents = await response.json();

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
  clear: {
    name: "clear",
    description: "Clear the terminal screen",
    execute: (_, __, term) => {
      term?.clear();
      term?.write("\x1b[H"); // Move cursor to home position (0,0)
      return ""; // Return empty string since we don't want to write anything
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
        const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
        if (!response.ok)
          throw new Error("Failed to list directory" + `/api/fs?path=${encodeURIComponent(path)}`);

        const contents = await response.json();
        return contents
          .map(({ name, type }) => (type === "directory" ? `${name}/` : name))
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
};

async function handleAbout(term: XTerm) {
  try {
    term.write("Analyzing about page...\r\n");
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ type: "about" }),
    });

    if (!response.ok) throw new Error("Failed to analyze about page");
    const { summary: rawSummary } = await response.json();
    const summary = rawSummary
      .split("\n")
      .map((para) => para.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .join("\r\n\r\n");
    return summary;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function handleSummarize(path: string, term: XTerm) {
  if (!path || path.trim() === "") {
    return "Usage: ai summarize <path> (alias: 'sum')";
  }
  try {
    term.write("Summarizing...\r\n");

    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ path, type: "summarize" }),
    });
    if (!response.ok) throw new Error("File or directory not found");
    // Handle streaming response
    const reader = response.body?.getReader();
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const response = JSON.parse(new TextDecoder().decode(result?.value));
      const summary = response.summary
        .split("\n")
        .map((para) => para.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join("\r\n\r\n");
      term.write(summary);
    }

    return "";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function handleAsk(path: string, question: string, term: XTerm) {
  if (!question || question.trim() === "" || !path || path.trim() === "") {
    return "Usage: ai ask <path> <question>";
  }
  try {
    term.write("Asking...\r\n");
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ path, type: "ask", question }),
    });
    if (!response.ok) throw new Error("File or directory not found");

    const reader = response.body?.getReader();
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const response = JSON.parse(new TextDecoder().decode(result?.value));
      const answer = response.answer
        .split("\n")
        .map((para) => para.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join("\r\n\r\n");
      term.write(answer);
    }
    return "";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
