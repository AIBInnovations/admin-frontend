/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Local testing only: point the admin at another API (see src/lib/config.ts). */
  readonly VITE_ADMIN_API_URL?: string
}
