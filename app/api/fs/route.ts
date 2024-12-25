import { readdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "/";

  try {
    // Ensure we're only looking within the app directory
    const safePath = join(process.cwd(), "app", path);
    const files = await readdir(safePath, { withFileTypes: true });

    const contents = files.map((file) => ({
      name: file.name,
      type: file.isDirectory() ? "directory" : "file",
    }));

    return NextResponse.json(contents);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: `Directory not found: ${error.message}` }, { status: 404 });
  }
}
