// export const API_BASE_URL = "http://localhost:5000/api/v1/";
// export const API_BASE_URL = "https://d3tcp24p0qlkvg.cloudfront.net/api/v1/";
const PRODUCTION_API_BASE_URL = "https://d1po9pb0pflxq5.cloudfront.net/api/v1/";

// Opt-in override for local testing only, e.g.
//   VITE_ADMIN_API_URL=http://localhost:5055/api/v1/ npm run dev
// Deliberately a NEW variable: .env already sets VITE_API_BASE_URL to a
// different host, and reading that one would silently re-point production
// builds. With VITE_ADMIN_API_URL unset, behaviour is unchanged.
const override = (import.meta.env.VITE_ADMIN_API_URL as string | undefined)?.trim()

export const API_BASE_URL = override
  ? (override.endsWith('/') ? override : `${override}/`)
  : PRODUCTION_API_BASE_URL;

export const IS_API_OVERRIDDEN = !!override;
