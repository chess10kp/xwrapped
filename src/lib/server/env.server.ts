/**
 * Single import point for private environment variables (including the MongoDB Atlas URI).
 * Use this from server routes and `$lib/server/*` instead of importing `$env/static/private` directly.
 *
 * - Do not import this file from client-side code.
 * - Never expose `MONGODB_URI` via `PUBLIC_*` — it would ship credentials to the browser.
 *
 * Standalone scripts (`tsx scripts/...`) should use `import 'dotenv/config'` and `process.env.MONGODB_URI`,
 * then `configureMongoUri()` before touching the DB.
 */
export {
  APIFY_API_TOKEN,
  DEMO_MODE,
  MAGIC_HOUR_API_KEY,
  MONGODB_URI,
  OPENROUTER_API_KEY,
  TWITTERAPI_IO_KEY,
} from "$env/static/private";
