/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAX_RECIPIENTS_PER_CAMPAIGN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
