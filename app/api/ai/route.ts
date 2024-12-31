import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { FsItem } from "@/api/fs/route";
import { ApiError } from "@/lib/api";

const APP_ROOT = join(process.cwd(), "app");

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export type LlmRequest = {
  path?: string;
  type: "about" | "ask" | "summarize";
  question?: string;
};

export type LlmSummarizeResponse = {
  summary: string;
};

export type LlmAskResponse = {
  answer: string;
};

export type LlmResponse = LlmSummarizeResponse | LlmAskResponse;

async function typeHandler(
  client: OpenAI,
  type: "about" | "ask" | "summarize",
  content: string,
  question?: string
) {
  if (type === "about") {
    return summarizeAbout(client, content);
  }
  if (type === "ask" && question) {
    return ask(client, content, question);
  }
  if (type === "summarize") {
    return summarize(client, content);
  }

  const errorResponse: ApiError = {
    name: "InvalidRequest",
    message: "Invalid request",
    status: 400,
  };
  return NextResponse.json(errorResponse);
}

async function summarizeAbout(
  client: OpenAI,
  content: string
): Promise<NextResponse<LlmSummarizeResponse | ApiError>> {
  try {
    const systemMessage =
      "You are a helpful assistant that summarizes an about page in plain English. " +
      "You MUST NOT make up information that is not provided in the text." +
      "You MUST only consider the content in the variable `headerInfo` and `timelineEvents`. " +
      "You MUST describe the author in biographical terms. " +
      "For example, `<name> is a software engineer...` or `<name> spent time doing...`";
    const prompt = `Please explain the about page and what it describes about the author:\n\n${content}`;

    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    if (!completion.choices[0].message.content) {
      throw new Error("No content returned from llm provider");
    }
    const summary = completion.choices[0].message.content;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error summarizing about page:", error);
    const errorResponse: ApiError = {
      name: "FailedToSummarizeAboutPage",
      message: "Failed to summarize about page",
      status: 500,
      details: error.message,
    };
    return NextResponse.json(errorResponse);
  }
}

async function summarize(
  client: OpenAI,
  content: string
): Promise<NextResponse<LlmSummarizeResponse | ApiError>> {
  if (!content) {
    return NextResponse.json({ summary: "No content found" });
  }
  try {
    // Generate summary using OpenAI
    const systemMessage = `
    You are a helpful assistant that summarizes text content concisely. 
    You MUST NOT make up information that is not provided in the text.
    `;
    const prompt = `Please summarize the following text:\n\n${content}`;
    const completion = await client.chat.completions.create({
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
    if (!completion.choices[0].message.content) {
      throw new Error("No content returned from llm provider");
    }
    const summary = completion.choices[0].message.content;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error summarizing text:", error);
    const errorResponse: ApiError = {
      name: "FailedToSummarizeText",
      message: "Failed to summarize text",
      status: 500,
      details: error.message,
    };
    return NextResponse.json(errorResponse);
  }
}

async function ask(
  client: OpenAI,
  content: string,
  question: string
): Promise<NextResponse<LlmAskResponse | ApiError>> {
  if (!content) {
    return NextResponse.json({ answer: "No content found" });
  }
  try {
    const prompt = `Question: ${question}`;
    const systemMessage = `
    You are a helpful assistant that answers questions about text content. 
    User questions are provided in the format of 'Question: <question>'.
    You MUST answer the question based on the provided text. 
    You MUST NOT make up information that is not provided in the text.
    The relevant text is provided below:
    ${content}
    `;
    const completion = await client.chat.completions.create({
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
    if (!completion.choices[0].message.content) {
      throw new Error("No content returned from llm provider");
    }
    const answer = completion.choices[0].message.content;
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Error answering question:", error);
    const errorResponse: ApiError = {
      name: "FailedToAnswerQuestion",
      message: "Failed to answer question",
      status: 500,
      details: error.message,
    };
    return NextResponse.json(errorResponse);
  }
}

export async function POST(req: Request): Promise<NextResponse<LlmResponse | ApiError>> {
  const client = getOpenAIClient();
  const { path, type, question } = (await req.json()) as LlmRequest;

  try {
    // Read file content
    let content: string;
    if (type === "about") {
      // Special case for about page
      const aboutPath = join(APP_ROOT, "about/page.tsx");
      content = await readFile(aboutPath, "utf-8");
    } else {
      // Make request to fs api
      if (!path) {
        throw new ApiError("Path is required");
      }
      const url = new URL(req.url);
      const fsApiUrl = new URL("/api/fs", url.origin);
      fsApiUrl.searchParams.set("path", path);
      const response = await fetch(fsApiUrl);
      if (!response.ok)
        throw new ApiError(
          `Error fetching file or directory: ${response.statusText}, ${response.body}, ${fsApiUrl}`
        );

      const data = (await response.json()) as FsItem[];
      // Join all the file contents
      content = data
        .filter((item) => item.fileContents)
        .map((item) => `# Filename: ${item.name}\n${item.fileContents}`)
        .join("\n");
    }
    return typeHandler(client, type, content, question);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error handling ai request:", error);
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          name: error.name,
          message: error.message,
          status: error.status,
          details: error.details,
        },
        { status: error.status }
      );
    }

    // Unknown errors default to 500
    const errorResponse: ApiError = {
      name: "InternalServerError",
      message: "Internal server error",
      status: 500,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

export async function GET(_: Request): Promise<NextResponse<ApiError>> {
  const errorResponse: ApiError = {
    name: "NotFound",
    message: "Not found",
    status: 404,
  };
  return NextResponse.json(errorResponse);
}
