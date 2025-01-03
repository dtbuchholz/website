import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MDX } from "@/components/mdx";
import { formatDate, getProjects } from "@/lib/content";
import { baseUrl } from "@/sitemap";

type PageParams = {
  slug: string;
};

export async function generateStaticParams(): Promise<PageParams[]> {
  const projects = getProjects();

  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export function generateMetadata({ params }: { params: PageParams }): Metadata | undefined {
  const project = getProjects().find((project) => project.slug === params.slug);
  if (!project) {
    return;
  }

  const { title, description, image } = project.metadata;
  const ogImage = image
    ? `${baseUrl}/img/${image}`
    : `${baseUrl}/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${baseUrl}/projects/${project.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function Project({ params }: { params: PageParams }): React.ReactNode {
  const project = getProjects().find((project) => project.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <section className="w-full prose mb-16">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: project.metadata.title,
            datePublished: project.metadata.publishedAt,
            dateModified: project.metadata.publishedAt,
            description: project.metadata.description,
            image: project.metadata.image
              ? `${baseUrl}${project.metadata.image}`
              : `/og?title=${encodeURIComponent(project.metadata.title)}`,
            url: `${baseUrl}/projects/${project.slug}`,
            author: {
              "@type": "Person",
              name: "Dan Buchholz",
            },
          }),
        }}
      />

      <h1 className="title font-extrabold text-2xl tracking-tighter">{project.metadata.title}</h1>
      <p className="title text-lg my-4 font-medium">{project.metadata.description}</p>
      <div className="flex justify-between items-center my-4 text-sm">
        <p className="text-sm text-theme-600 dark:text-theme-300">
          {formatDate(project.metadata.publishedAt)}{" "}
          {project.metadata.sourceCode && (
            <>
              | <a href={project.metadata.sourceCode}>source code</a>
            </>
          )}
        </p>
        <div className="flex justify-end items-center text-sm">
          <Link href="/projects" className="back-to-home">
            ← Back to projects
          </Link>
        </div>
      </div>
      <article className="prose w-full">
        <hr className="my-8" />
        <MDX source={project.content} />
      </article>
    </section>
  );
}
