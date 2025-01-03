import Link from "next/link";
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

import { getProjects } from "@/lib/content";

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

export function Projects() {
  const projects = getProjects();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {projects
        .sort((a, b) => {
          if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
            return -1;
          }
          return 1;
        })
        .map((project) => (
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
            {project.metadata.sourceCode && (
              <div className="px-4 pb-4">
                <Link
                  href={project.metadata.sourceCode}
                  target="_blank"
                  className="flex items-center space-x-2 text-xs transition-all text-theme-400 hover:text-theme-300"
                >
                  <FaGithub size={16} />
                  <span>View source</span>
                </Link>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
