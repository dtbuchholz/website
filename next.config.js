module.exports = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/fs": ["./app/blog/**/*", "./app/about/**/*", "./app/vfs/**/*"],
      "/api/ai": ["./app/blog/**/*", "./app/about/**/*", "./app/vfs/**/*"],
    },
  },
};
