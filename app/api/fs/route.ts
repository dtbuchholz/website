import { readdir, readFile, stat } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";

// Define the root directory for terminal access
const TERMINAL_ROOT = join(process.cwd(), "app", "vfs");
const BLOG_POSTS_PATH = join(process.cwd(), "app", "blog", "posts");

export type FsItem = {
  name: string;
  type: string;
  extension: string;
  fileContents: string | null;
};

export async function GET(request: Request): Promise<NextResponse<FsItem[] | { error: string }>> {
  const { searchParams } = new URL(request.url);
  let requestedPath = searchParams.get("path") || "/";
  // Normalize path: remove trailing slash unless it's root
  requestedPath = requestedPath === "/" ? "/" : requestedPath.replace(/\/$/, "");

  try {
    // Handle virtual paths
    if (/^\/?(blog\/?)/i.test(requestedPath)) {
      // Redirect to actual blog posts directory
      const relativePath = requestedPath.replace("blog", "");
      const actualPath = join(BLOG_POSTS_PATH, relativePath);

      // Security check for the actual path
      if (!actualPath.startsWith(BLOG_POSTS_PATH)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const stats = await stat(actualPath);

      if (stats.isDirectory()) {
        const contents = await readdir(actualPath);
        const items = await Promise.all(
          contents.map(async (name) => {
            const fullPath = join(actualPath, name);
            const itemStats = await stat(fullPath);
            const type = itemStats.isDirectory() ? "directory" : "file";
            const extension = extname(name);
            const fileContents = type === "file" ? await readFile(fullPath, "utf-8") : null;
            return {
              name,
              type,
              extension,
              fileContents,
            };
          })
        );
        return NextResponse.json(items);
      }

      // Handle single file
      return NextResponse.json([
        {
          name: requestedPath.split("/").pop() || "",
          type: "file",
          extension: extname(requestedPath),
          fileContents: await readFile(actualPath, "utf-8"),
        },
      ]);
    }

    // Handle regular paths
    const normalizedPath = join(TERMINAL_ROOT, requestedPath).replace(/\\/g, "/");
    if (!normalizedPath.startsWith(TERMINAL_ROOT)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if path exists
    const stats = await stat(normalizedPath);

    if (stats.isDirectory()) {
      const contents = await readdir(normalizedPath);
      const items = await Promise.all(
        contents.map(async (name) => {
          const fullPath = join(normalizedPath, name);
          const itemStats = await stat(fullPath);
          const type = itemStats.isDirectory() ? "directory" : "file";
          const extension = extname(name);
          const fileContents = type === "file" ? await readFile(fullPath, "utf-8") : null;
          return {
            name,
            type,
            extension,
            fileContents,
          };
        })
      );

      // Add virtual blog directory at root
      if (requestedPath === "/") {
        items.push({
          name: "blog",
          type: "directory",
          extension: "",
          fileContents: "",
        });
      }

      return NextResponse.json(items);
    }

    // Handle single file
    return NextResponse.json([
      {
        name: requestedPath.split("/").pop() || "",
        type: "file",
        extension: extname(requestedPath),
        fileContents: await readFile(normalizedPath, "utf-8"),
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: `Directory not found: ${error.message}` }, { status: 404 });
  }
}
