import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

const MARKDOWN_ROOT = join(process.cwd(), "app", "vfs", "llms");

export async function GET(_: Request, { params }: { params: { slug: string[] } }) {
  console.log(MARKDOWN_ROOT);
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
    return new NextResponse("File not found", { status: 404 });
  }
}
