/**
 * Base URL of the customer-facing Shopi web app, for every admin link that
 * points there (View on Shopi, Impersonate, social proof pages).
 *
 * Set NEXT_PUBLIC_SHOPI_WEB_URL per environment (on Vercel: Project → Settings
 * → Environment Variables). It is a NEXT_PUBLIC_ variable, so it is baked in at
 * build time: redeploy after changing it.
 *
 * Unset, a production build falls back to the live site rather than
 * localhost — a link to localhost from the deployed admin is always broken.
 */
const PRODUCTION_FALLBACK = "https://www.shopi.co.ke";
const DEVELOPMENT_FALLBACK = "http://localhost:3000";

export function webBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SHOPI_WEB_URL ||
    process.env.NEXT_PUBLIC_WEB_APP_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_FALLBACK : DEVELOPMENT_FALLBACK);
  return base.trim().replace(/\/+$/, "");
}

/** Absolute URL on the web app for a path like "/en/stores". */
export function webUrl(path: string): string {
  return `${webBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
