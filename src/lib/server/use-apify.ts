import { env } from '$env/dynamic/private';

/** Live Apify scraping — only when `USE_APIFY=true` in `.env`. Otherwise stub data is used. */
export function useApify(): boolean {
  const v = env.USE_APIFY;
  return v === 'true' || v === '1' || v === 'yes';
}
