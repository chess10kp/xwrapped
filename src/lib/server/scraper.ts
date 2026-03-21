import { ApifyClient } from 'apify-client';
import { APIFY_API_TOKEN } from '$lib/server/env.server';
import type { ProfileData, TweetData } from './types';

let client: ApifyClient | null = null;

function getApifyClient(): ApifyClient {
  if (client) return client;
  const token = APIFY_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'APIFY_API_TOKEN is missing or empty. Add it to .env (see .env.example). Get a token: https://console.apify.com/settings/integrations'
    );
  }
  client = new ApifyClient({ token });
  return client;
}

export async function scrapeProfile(handle: string): Promise<ProfileData> {
  const run = await getApifyClient().actor('automation-lab/twitter-scraper').call({
    mode: 'profiles',
    usernames: [handle],
  });
  
  const { items } = await getApifyClient().dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`Profile not found for handle: @${handle}`);
  }

  return items[0] as unknown as ProfileData;
}

export async function scrapeTweets(handle: string): Promise<TweetData[]> {
  const run = await getApifyClient().actor('automation-lab/twitter-scraper').call({
    mode: 'user-tweets',
    usernames: [handle],
    maxResults: 50,
  });
  
  const { items } = await getApifyClient().dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`No tweets found for handle: @${handle}`);
  }

  return items as unknown as TweetData[];
}
