import { getBlogPosts } from "app/blog/utils";
import { baseUrl } from "app/sitemap";

export async function GET(): Promise<Response> {
  const allBlogs = getBlogPosts();

  const itemsXml = allBlogs
    .sort((a, b) => {
      if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
        return -1;
      }
      return 1;
    })
    .map(
      (post) =>
        `<item>
          <title>${post.metadata.title}</title>
          <link>${baseUrl}/blog/${post.slug}</link>
          <description>${post.metadata.description || ""}</description>
          <pubDate>${new Date(post.metadata.publishedAt).toUTCString()}</pubDate>
          <content:encoded><![CDATA[${post.content}]]></content:encoded>
        </item>`
    )
    .join("\n");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0"
      xmlns:content="http://purl.org/rss/1.0/modules/content/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Dan Buchholz Website and Blog</title>
        <link>${baseUrl}</link>
        <description>Collection of thoughts and ideas by Dan Buchholz</description>
        <atom:link href="${baseUrl}/rss" rel="self" type="application/rss+xml" />
        ${itemsXml}
    </channel>
  </rss>`;

  return new Response(rssFeed, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
