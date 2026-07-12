/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed Vercel coach function, e.g. "https://<project>.vercel.app/api/coach". Unset until deployed — see README. */
  readonly VITE_COACH_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
