declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
      GITHUB_API_TOKEN: string;
      RESEARCH_DIR: string;
    }
  }
}

export {};
