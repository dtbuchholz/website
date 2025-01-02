import { readdir, readFile, stat } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { BLOG_POSTS_DIR, NOTES_DIR, PROJECTS_DIR } from "@/lib/content";

// Define allowed root directories
const ALLOWED_DIRS = {
  blog: BLOG_POSTS_DIR,
  notes: NOTES_DIR,
  projects: PROJECTS_DIR,
} as const;

export type FsItem = {
  name: string;
  type: string;
  extension: string;
  fileContents: string | null;
};

async function getDirectoryContents(path: string, isRoot = false): Promise<FsItem[]> {
  // Handle root directory specially
  if (isRoot) {
    return Object.keys(ALLOWED_DIRS).map((name) => ({
      name,
      type: "directory",
      extension: "",
      fileContents: null,
    }));
  }

  const contents = await readdir(path);
  return Promise.all(
    contents.map(async (name) => {
      const fullPath = join(path, name);
      const itemStats = await stat(fullPath);
      return {
        name,
        type: itemStats.isDirectory() ? "directory" : "file",
        extension: extname(name),
        fileContents: itemStats.isDirectory() ? null : await readFile(fullPath, "utf-8"),
      };
    })
  );
}

export async function GET(request: Request): Promise<NextResponse<FsItem[] | ApiError>> {
  const { searchParams } = new URL(request.url);
  let requestedPath = searchParams.get("path") || "";
  requestedPath = decodeURIComponent(requestedPath);
  requestedPath = requestedPath.replace(/^\/+|\/+$/g, ""); // Remove leading/trailing slashes

  try {
    // Handle empty path or root
    if (!requestedPath) {
      return NextResponse.json(await getDirectoryContents("", true));
    }

    // Extract the root directory and remaining path
    const [rootDir, ...remainingPath] = requestedPath.split("/");
    const basePath = ALLOWED_DIRS[rootDir as keyof typeof ALLOWED_DIRS];

    if (!basePath) {
      return NextResponse.json(
        { name: "DirectoryNotFound", message: "No such file or directory", status: 404 },
        { status: 404 }
      );
    }

    // Construct the full path
    const fullPath = join(basePath, ...remainingPath);

    // Security check: ensure path doesn't escape allowed directory
    if (!fullPath.startsWith(basePath)) {
      return NextResponse.json(
        { name: "AccessDenied", message: "Access denied", status: 403 },
        { status: 403 }
      );
    }

    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      return NextResponse.json(await getDirectoryContents(fullPath));
    }

    // Handle single file
    return NextResponse.json([
      {
        name: fullPath.split("/").pop() || "",
        type: "file",
        extension: extname(fullPath),
        fileContents: await readFile(fullPath, "utf-8"),
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error handling fs api request:", error);
    return NextResponse.json(
      {
        name: "DirectoryNotFound",
        message: "No such file or directory",
        status: 404,
      },
      { status: 404 }
    );
  }
}
