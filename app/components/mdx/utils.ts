import fs from "fs";
import path from "path";

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
  return fs.readdirSync(dir).filter((file) => path.extname(file) === ".mdx");
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
