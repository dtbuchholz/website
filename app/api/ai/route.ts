import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const TERMINAL_ROOT = join(process.cwd(), "app", "vfs");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LlmRequest = {
  path: string;
  type: "summarize" | "ask";
  question?: string;
};

async function typeHandler(type: "summarize" | "ask", content: string, question?: string) {
  if (type === "summarize") {
    return summarize(content);
  }
  if (type === "ask" && question) {
    return ask(content, question);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

async function summarize(content: string) {
  // Generate summary using OpenAI
  console.log("Starting summarization...");
  const systemMessage =
    "You are a helpful assistant that summarizes text content concisely. You MUST NOT make up information that is not provided in the text.";
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
  console.log("Summarization completed");

  const summary = completion.choices[0].message.content;
  return NextResponse.json({ summary });
}

async function ask(content: string, question: string) {
  console.log("Starting question answering...");
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
    const normalizedPath = join(TERMINAL_ROOT, path).replace(/\\/g, "/");
    if (!normalizedPath.startsWith(TERMINAL_ROOT)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const content = await readFile(normalizedPath, "utf-8");

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
