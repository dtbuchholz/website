import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate, getBlogPosts } from "@/blog/utils";
import { MDX } from "@/components/mdx";
import { baseUrl } from "@/sitemap";

type PageParams = {
  slug: string;
};

export async function generateStaticParams(): Promise<PageParams[]> {
  const posts = getBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export function generateMetadata({ params }: { params: PageParams }): Metadata | undefined {
  const post = getBlogPosts().find((post) => post.slug === params.slug);
  if (!post) {
    return;
  }

  const { title, publishedAt: publishedTime, description, image } = post.metadata;
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
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
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

export default function Blog({ params }: { params: PageParams }): React.ReactNode {
  const post = getBlogPosts().find((post) => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <section className="w-full">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.description,
            image: post.metadata.image
              ? `${baseUrl}${post.metadata.image}`
              : `/og?title=${encodeURIComponent(post.metadata.title)}`,
            url: `${baseUrl}/blog/${post.slug}`,
            author: {
              "@type": "Person",
              name: "Dan Buchholz",
            },
          }),
        }}
      />

      <h1 className="title font-semibold text-2xl tracking-tighter">{post.metadata.title}</h1>
      <h3 className="title text-lg my-4">{post.metadata.description}</h3>
      <div className="flex justify-between items-center my-4 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt)}{" "}
          {post.metadata.sourceCode && (
            <>
              | <a href={post.metadata.sourceCode}>source code</a>
            </>
          )}
        </p>
        <div className="flex justify-end items-center text-sm">
          <Link href="/blog" className="back-to-home">
            ← Back to posts
          </Link>
        </div>
      </div>
      <article className="prose w-full">
        <hr className="my-8" />
        <MDX source={post.content} />
      </article>
    </section>
  );
}
