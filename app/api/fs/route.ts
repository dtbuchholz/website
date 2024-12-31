import { readdir, readFile, stat } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";

// Define the root directory for terminal access
const TERMINAL_ROOT = join(process.cwd(), "app", "vfs");
const BLOG_POSTS_PATH = join(process.cwd(), "app", "blog", "posts");

export type FsItem = {
  name: string;
  type: string;
  extension: string;
  fileContents: string | null;
};

async function getFileItem(path: string, name?: string): Promise<FsItem> {
  const fileName = name || path.split("/").pop() || "";
  return {
    name: fileName,
    type: "file",
    extension: extname(fileName),
    fileContents: await readFile(path, "utf-8"),
  };
}

async function getDirectoryContents(path: string, isRoot = false): Promise<FsItem[]> {
  const contents = await readdir(path);
  const items = await Promise.all(
    contents.map(async (name) => {
      const fullPath = join(path, name);
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

  // Add virtual blog directory at root level
  if (isRoot) {
    items.push({
      name: "blog",
      type: "directory",
      extension: "",
      fileContents: "",
    });
  }

  return items;
}

export async function GET(request: Request): Promise<NextResponse<FsItem[] | ApiError>> {
  const { searchParams } = new URL(request.url);
  let requestedPath = searchParams.get("path") || "/";
  // Decode the URL-encoded path
  requestedPath = decodeURIComponent(requestedPath);
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
        const errorResponse: ApiError = {
          name: "AccessDenied",
          message: "Access denied",
          status: 403,
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }

      const stats = await stat(actualPath);

      if (stats.isDirectory()) {
        const items = await getDirectoryContents(actualPath);
        return NextResponse.json(items);
      }

      // Handle single file
      const fileItem = await getFileItem(actualPath);
      return NextResponse.json([fileItem]);
    }

    // Handle regular paths
    const normalizedPath = join(TERMINAL_ROOT, requestedPath).replace(/\\/g, "/");
    if (!normalizedPath.startsWith(TERMINAL_ROOT)) {
      const errorResponse: ApiError = {
        name: "AccessDenied",
        message: "Access denied",
        status: 403,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Check if path exists
    const stats = await stat(normalizedPath);

    if (stats.isDirectory()) {
      const items = await getDirectoryContents(normalizedPath, requestedPath === "/");
      return NextResponse.json(items);
    }

    // Handle single file
    const fileItem = await getFileItem(normalizedPath);
    return NextResponse.json([fileItem]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const errorResponse: ApiError = {
      name: "DirectoryNotFound",
      message: `Directory not found: ${error.message}`,
      status: 404,
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }
}
