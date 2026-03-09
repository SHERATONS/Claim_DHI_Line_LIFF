/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIFF_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_MODE: 'liff';
  readonly VITE_USE_MOCK_DATA: string;
  readonly VITE_USE_LOCAL_SAVE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
