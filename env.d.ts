declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
      RESEARCH_DIR: string;
    }
  }
}

export {};
