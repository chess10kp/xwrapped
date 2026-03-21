import { ApifyClient } from 'apify-client';
import { APIFY_API_TOKEN } from '$lib/server/env.server';
import { normalizeTweetData } from '$lib/tweet-stats';
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

function pickProfilePicture(raw: Record<string, unknown>): string {
  const keys = [
    'profilePicture',
    'profile_picture',
    'profileImageUrl',
    'profile_image_url_https',
    'profileImage',
    'avatar',
    'profile_image_url'
  ] as const;
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
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

  const raw = items[0] as Record<string, unknown>;
  const base = raw as unknown as ProfileData;
  const profilePicture = pickProfilePicture(raw) || base.profilePicture || '';
  return { ...base, profilePicture };
}

/** Map Apify / X payload to `TweetData` (handles alternate field names). */
function rawItemToTweetData(raw: Record<string, unknown>): TweetData {
	const text =
		(typeof raw.text === 'string' && raw.text) ||
		(typeof raw.fullText === 'string' && raw.fullText) ||
		(typeof raw.full_text === 'string' && raw.full_text) ||
		'';
	const createdAt =
		(typeof raw.createdAt === 'string' && raw.createdAt) ||
		(typeof raw.created_at === 'string' && raw.created_at) ||
		new Date().toISOString();
	const pickNum = (...keys: string[]): unknown => {
		for (const k of keys) {
			const v = raw[k];
			if (typeof v === 'number' && Number.isFinite(v)) return v;
			if (typeof v === 'string' && v.trim() !== '') {
				const n = Number(v.replace(/,/g, ''));
				if (Number.isFinite(n)) return n;
			}
		}
		return 0;
	};
	const likeCount = Number(pickNum('likeCount', 'like_count', 'likes', 'favorite_count')) || 0;
	const retweetCount = Number(pickNum('retweetCount', 'retweet_count', 'retweets')) || 0;
	const replyCount = Number(pickNum('replyCount', 'reply_count', 'replies')) || 0;
	const viewCount = Number(pickNum('viewCount', 'view_count', 'views', 'impression_count')) || 0;
	const entities = raw.entities as Record<string, unknown> | undefined;
	const entityTags = entities?.hashtags;
	const hashtags = Array.isArray(raw.hashtags)
		? (raw.hashtags as unknown[]).map(String)
		: Array.isArray(entityTags)
			? (entityTags as { text?: string }[])
					.map((h) => (h?.text != null ? String(h.text) : ''))
					.filter(Boolean)
			: [];
	const mentions = Array.isArray(raw.mentions)
		? (raw.mentions as unknown[]).map(String)
		: [];
	return normalizeTweetData({
		text,
		createdAt,
		likeCount,
		retweetCount,
		replyCount,
		viewCount,
		hashtags,
		mentions
	});
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

  return items.map((item) => rawItemToTweetData(item as Record<string, unknown>));
}
