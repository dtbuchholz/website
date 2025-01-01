/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow .mdx extensions for files
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Optionally, add any other Next.js config below
  experimental: {
    outputFileTracingIncludes: {
      "/api/fs": ["./app/blog/**/*", "./app/about/**/*", "./app/vfs/**/*"],
      "/api/ai": ["./app/blog/**/*", "./app/about/**/*", "./app/vfs/**/*"],
    },
  },
};

export default nextConfig;
