import fs from "fs";
import path from "path";

export const PROJECTS_DIR = path.join(process.cwd(), "projects");
export const RESEARCH_DIR = process.env.RESEARCH_DIR || path.join(process.cwd(), "research");
export const BLOG_POSTS_DIR = path.join(RESEARCH_DIR, "posts");
export const NOTES_DIR = path.join(RESEARCH_DIR, "notes");

export type Metadata = {
  title: string;
  publishedAt: string;
  description: string;
  image?: string;
  sourceCode?: string;
};

export type Frontmatter = {
  metadata: Metadata;
  content: string;
};

export type MDXData = {
  metadata: Metadata;
  slug: string;
  content: string;
};

export function formatDate(date: string, includeRelative = false): string {
  if (!date) {
    return "";
  }
  const currentDate = new Date();
  if (!date.includes("T")) {
    date = `${date}T00:00:00`;
  }
  const targetDate = new Date(date);

  const yearsAgo = currentDate.getFullYear() - targetDate.getFullYear();
  const monthsAgo = currentDate.getMonth() - targetDate.getMonth();
  const daysAgo = currentDate.getDate() - targetDate.getDate();

  let formattedDate = "";

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}y ago`;
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}mo ago`;
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`;
  } else {
    formattedDate = "Today";
  }

  const fullDate = targetDate.toLocaleString("en-us", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!includeRelative) {
    return fullDate;
  }

  return `${fullDate} (${formattedDate})`;
}

export function parseFrontmatter(fileContent: string): Frontmatter {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  const match = frontmatterRegex.exec(fileContent);
  const frontMatterBlock = match![1];
  const content = fileContent.replace(frontmatterRegex, "").trim();
  const frontMatterLines = frontMatterBlock.trim().split("\n");
  const metadata: Partial<Metadata> = {};

  frontMatterLines.forEach((line) => {
    const [key, ...valueArr] = line.split(": ");
    let value = valueArr.join(": ").trim();
    value = value.replace(/^['"](.*)['"]$/, "$1"); // Remove quotes
    metadata[key.trim() as keyof Metadata] = value;
  });

  return { metadata: metadata as Metadata, content };
}

export function getMDXFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((file) => path.extname(file) === ".mdx" || path.extname(file) === ".md");
}

export function readMDXFile(filePath: string): Frontmatter {
  const rawContent = fs.readFileSync(filePath, "utf-8");
  return parseFrontmatter(rawContent);
}

export function getMDXData(dir: string): MDXData[] {
  const mdxFiles = getMDXFiles(dir);
  return mdxFiles.map((file) => {
    const { metadata, content } = readMDXFile(path.join(dir, file));
    const slug = path.basename(file, path.extname(file));

    return {
      metadata,
      slug,
      content,
    };
  });
}

export function slugify(str: string) {
  if (!str) return ""; // This shouldn't happen, but if MDX errors (e.g., local dev), it will be empty
  return str
    .toString()
    .toLowerCase()
    .trim() // Remove whitespace from both ends of a string
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters except for -
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

export function getBlogPosts(): MDXData[] {
  return getMDXData(BLOG_POSTS_DIR);
}

export function getNotes() {
  return getMDXData(NOTES_DIR);
}

export function getProjects() {
  return getMDXData(PROJECTS_DIR);
}
