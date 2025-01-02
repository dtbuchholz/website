import { getBlogPosts } from "@/lib/content";
import { baseUrl } from "@/sitemap";

export async function GET(): Promise<Response> {
  const allBlogs = getBlogPosts();
  const imageUrl = (title: string, description?: string, image?: string) => {
    if (image) {
      return `${baseUrl}/img/${image}`;
    }
    if (title && description) {
      // Create the URL with proper XML escaping
      const encodedTitle = encodeURIComponent(title).replace(/&/g, "&amp;");
      const encodedDesc = encodeURIComponent(description).replace(/&/g, "&amp;");
      return `${baseUrl}/og?title=${encodedTitle}&amp;description=${encodedDesc}`;
    }
    return `${baseUrl}/og`;
  };

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
          <image>
            <url>${imageUrl(post.metadata.title, post.metadata.description, post.metadata.image)}</url>
            <title>${post.metadata.title}</title>
            <link>${baseUrl}/blog/${post.slug}</link>
          </image>
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
