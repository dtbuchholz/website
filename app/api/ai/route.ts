import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { FsItem } from "../fs/route";

const APP_ROOT = join(process.cwd(), "app");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LlmRequest = {
  path: string;
  type: "about" | "ask" | "summarize";
  question?: string;
};

async function typeHandler(
  type: "about" | "ask" | "summarize",
  content: string,
  question?: string
) {
  if (type === "about") {
    return summarizeAbout(content);
  }
  if (type === "ask" && question) {
    return ask(content, question);
  }
  if (type === "summarize") {
    return summarize(content);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

async function summarizeAbout(content: string) {
  const systemMessage =
    "You are a helpful assistant that summarizes an about page in plain English. " +
    "You MUST NOT make up information that is not provided in the text." +
    "You MUST only consider the content in the variable `headerInfo` and `timelineEvents`. " +
    "You MUST describe the author in biographical terms. " +
    "For example, `<name> is a software engineer...` or `<name> spent time doing...`";
  const prompt = `Please explain the about page and what it describes about the author:\n\n${content}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  return NextResponse.json({ summary: completion.choices[0].message.content });
}

async function summarize(content: string) {
  // Generate summary using OpenAI
  const systemMessage = `
    You are a helpful assistant that summarizes text content concisely. 
    You MUST NOT make up information that is not provided in the text.
    `;
  const prompt = `Please summarize the following text:\n\n${content}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  const summary = completion.choices[0].message.content;
  return NextResponse.json({ summary });
}

async function ask(content: string, question: string) {
  const prompt = `Question: ${question}`;
  const systemMessage = `
    You are a helpful assistant that answers questions about text content. 
    User questions are provided in the format of 'Question: <question>'.
    You MUST answer the question based on the provided text. 
    You MUST NOT make up information that is not provided in the text.
    The relevant text is provided below:
    ${content}
    `;
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });
  return NextResponse.json({ answer: completion.choices[0].message.content });
}

export async function POST(req: Request) {
  const { path, type, question } = (await req.json()) as LlmRequest;

  try {
    // Read file content
    let content: string;
    console.log("path", path);
    console.log("before if");
    if (type === "about") {
      // Special case for about page
      const aboutPath = join(APP_ROOT, "about/page.tsx");
      content = await readFile(aboutPath, "utf-8");
    } else {
      // Make request to fs api
      const url = new URL(req.url);
      const fsApiUrl = new URL("/api/fs", url.origin);
      fsApiUrl.searchParams.set("path", path);
      const response = await fetch(fsApiUrl);
      if (!response.ok) throw new Error("File or directory not found");

      const data = (await response.json()) as FsItem[];
      // Join all the file contents
      content = data
        .filter((item) => item.fileContents)
        .map((item) => `# Filename: ${item.name}\n${item.fileContents}`)
        .join("\n");
    }
    return typeHandler(type, content, question);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Full error object:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        error: `Failed to run inference: ${error.message}`,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
