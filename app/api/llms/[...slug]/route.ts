import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
const MARKDOWN_ROOT = join(process.cwd(), "app", "vfs", "llms");

export async function GET(_: Request, { params }: { params: { slug: string[] } }) {
  const requestedFile = params.slug.join("/");

  const allowedFiles = ["terminal.md"];
  if (!allowedFiles.includes(requestedFile)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const pathToFile = join(MARKDOWN_ROOT, requestedFile);
    const content = await readFile(pathToFile, "utf-8");

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown",
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    const errorResponse: ApiError = {
      name: "FileNotFound",
      message: "File not found",
      status: 404,
      details: error.message,
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }
}
