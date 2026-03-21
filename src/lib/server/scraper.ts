import { ApifyClient } from 'apify-client';
import { APIFY_API_TOKEN } from '$lib/server/env.server';
import type { ProfileData, TweetData } from './types';

const client = new ApifyClient({ token: APIFY_API_TOKEN });

export async function scrapeProfile(handle: string): Promise<ProfileData> {
  const run = await client.actor('automation-lab/twitter-scraper').call({
    mode: 'profiles',
    usernames: [handle],
  });
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`Profile not found for handle: @${handle}`);
  }

  return items[0] as unknown as ProfileData;
}

export async function scrapeTweets(handle: string): Promise<TweetData[]> {
  const run = await client.actor('automation-lab/twitter-scraper').call({
    mode: 'user-tweets',
    usernames: [handle],
    maxResults: 50,
  });
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`No tweets found for handle: @${handle}`);
  }

  return items as unknown as TweetData[];
}
