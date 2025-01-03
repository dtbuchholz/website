import Link from "next/link";
import { cache } from "react";
import { IconType } from "react-icons";
import { FaGithub } from "react-icons/fa6";
import {
  SiJavascript,
  SiNextdotjs,
  SiPython,
  SiReact,
  SiRust,
  SiSolidity,
  SiTypescript,
} from "react-icons/si";

import { formatDate, getProjects } from "@/lib/content";

function getGithubApiKey() {
  return process.env.GITHUB_TOKEN;
}

const languages: Record<string, IconType> = {
  react: SiReact,
  rust: SiRust,
  js: SiJavascript,
  javascript: SiJavascript,
  ts: SiTypescript,
  typescript: SiTypescript,
  python: SiPython,
  solidity: SiSolidity,
  nextjs: SiNextdotjs,
};

function LanguageTags({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => {
        if (!(tag in languages)) return null;
        const Icon = languages[tag];

        return (
          <span key={tag} className="inline-flex items-center text-theme-600 dark:text-theme-300">
            {typeof Icon === "function" ? <Icon size={30} /> : Icon}
          </span>
        );
      })}
    </div>
  );
}

const getLatestCommit = cache(async (sourceCodeUrl: string) => {
  try {
    const match = sourceCodeUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repo] = match;
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(getGithubApiKey() && {
            Authorization: `token ${getGithubApiKey()}`,
          }),
        },
        next: { revalidate: 604800 }, // Cache for 1 week
      }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const result = {
      message: data[0].commit.message.split("\n")[0], // Get first line of commit message
      date: new Date(data[0].commit.author.date).toISOString(),
      sha: data[0].sha,
    };
    return result;
  } catch (error) {
    console.error("Error fetching commit:", error);
    return null;
  }
});

export async function Projects() {
  const projects = getProjects();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {await Promise.all(
        projects.map(async (project) => {
          const latestCommit = project.metadata.sourceCode
            ? await getLatestCommit(project.metadata.sourceCode)
            : null;
          return (
            <div
              key={project.slug}
              className="card h-full flex flex-col bg-theme-200 dark:bg-theme-800 border rounded-sm border-theme-400 dark:border-theme-700 transition-all hover:border-theme-900 dark:hover:border-theme-500"
            >
              <Link
                href={`/projects/${project.slug}`}
                className="group hover:no-underline flex-1 p-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <h3 className="font-bold text-lg text-theme-900 dark:text-theme-100 mb-2">
                      {project.metadata.title}
                    </h3>
                    <p className="text-theme-600 dark:text-theme-300 text-sm mb-4">
                      {project.metadata.description}
                    </p>
                  </div>
                  {project.metadata.tags && (
                    <div className="flex items-center justify-center">
                      <LanguageTags tags={project.metadata.tags} />
                    </div>
                  )}
                </div>
              </Link>
              <div className="px-4 pb-4 flex flex-col gap-2">
                {project.metadata.sourceCode && (
                  <Link
                    href={project.metadata.sourceCode}
                    target="_blank"
                    className="flex items-center space-x-2 text-xs text-theme-600 dark:text-theme-300 transition-all hover:text-theme-900 dark:hover:text-theme-100"
                  >
                    <FaGithub size={16} />
                    <span>View source</span>
                  </Link>
                )}
                {latestCommit && (
                  <>
                    <p className="text-xs text-theme-500 truncate">{latestCommit.message}</p>
                    <p className="text-xs text-theme-500 truncate">
                      {formatDate(latestCommit.date, true)}{" "}
                      <span className="text-theme-600 dark:text-theme-300 transition-all hover:text-theme-900 dark:hover:text-theme-100">
                        <Link
                          href={`${project.metadata.sourceCode}/commit/${latestCommit.sha}`}
                          target="_blank"
                        >
                          ({latestCommit.sha.slice(0, 7)})
                        </Link>
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
