import Link from "next/link";

import { getProjects } from "@/lib/content";

export function Projects() {
  const projects = getProjects();

  return (
    <div>
      {projects
        .sort((a, b) => {
          if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
            return -1;
          }
          return 1;
        })
        .map((project) => (
          <Link
            key={project.slug}
            className="flex flex-col space-y-1 mb-4"
            href={`/projects/${project.slug}`}
          >
            <div className="card">
              <div className="w-full flex flex-col sm:flex-row space-x-0 sm:space-x-2">
                <p className="text-theme-900 dark:text-theme-100 tracking-tight">
                  {project.metadata.title}: {project.metadata.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
    </div>
  );
}
