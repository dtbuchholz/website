import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MDX } from "@/components/mdx";
import { formatDate, getBlogPosts } from "@/lib/content";
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
    <section className="w-full prose mb-16">
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

      <h1 className="title font-extrabold text-2xl tracking-tighter">{post.metadata.title}</h1>
      <p className="text-lg my-4 font-medium">{post.metadata.description}</p>
      <div className="flex justify-between items-center my-4 text-sm">
        <p className="text-sm text-theme-600 dark:text-theme-300">
          {formatDate(post.metadata.publishedAt)}{" "}
          {post.metadata.sourceCode && (
            <>
              |{" "}
              <Link href={post.metadata.sourceCode} target="_blank">
                source code
              </Link>
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
