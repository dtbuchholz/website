/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/fs": ["./app/about/**/*", "./research/**/*", "./projects/**/*"],
      "/api/ai": ["./app/about/**/*", "./research/**/*", "./projects/**/*"],
      "/api/llms": ["./llms/**/*"],
    },
  },
  // Add these to help debug and ensure proper file handling
  poweredByHeader: false,
  reactStrictMode: true,
  logging: {
    level: "verbose",
  },
  // If you're using MDX files
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
};

export default nextConfig;
