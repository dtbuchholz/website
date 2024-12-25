import { readdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

// Define the root directory for terminal access
const TERMINAL_ROOT = join(process.cwd(), "app", "vfs");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedPath = searchParams.get("path") || "/";

  try {
    // Ensure the requested path doesn't escape the terminal directory
    const normalizedPath = join(TERMINAL_ROOT, requestedPath).replace(/\\/g, "/"); // Normalize path separators

    // Security check: ensure path is within terminal directory
    if (!normalizedPath.startsWith(TERMINAL_ROOT)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const files = await readdir(normalizedPath, { withFileTypes: true });

    const contents = files
      .filter((file) => !file.name.startsWith(".")) // Hide dot files
      .map((file) => ({
        name: file.name,
        type: file.isDirectory() ? "directory" : "file",
      }));

    return NextResponse.json(contents);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: `Directory not found: ${error.message}` }, { status: 404 });
  }
}
