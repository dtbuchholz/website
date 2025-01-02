import Link from "next/link";

import { formatDate, getBlogPosts } from "@/lib/content";

export function BlogPosts({ count }: { count?: number }) {
  const allBlogs = getBlogPosts();

  return (
    <div>
      {allBlogs
        .sort((a, b) => {
          if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
            return -1;
          }
          return 1;
        })
        .slice(0, count || allBlogs.length)
        .map((post) => (
          <Link
            key={post.slug}
            className="flex flex-col space-y-1 mb-4"
            href={`/blog/${post.slug}`}
          >
            <div className="card">
              <div className="w-full flex flex-col sm:flex-row space-x-0 sm:space-x-2">
                <p className="text-theme-600 dark:text-theme-300 tabular-nums shrink-0 mr-6">
                  {formatDate(post.metadata.publishedAt, false)}
                </p>
                <p className="text-theme-900 dark:text-theme-100 tracking-tight">
                  {post.metadata.title}: {post.metadata.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
    </div>
  );
}
