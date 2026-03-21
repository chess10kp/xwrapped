/**
 * Shared twitterapi.io client used by both the pipeline and the /api/scrape endpoint.
 * Requires TWITTERAPI_IO_KEY to be set in the environment.
 */
import { TWITTERAPI_IO_KEY } from '$lib/server/env.server';
import type { ProfileData, TweetData } from './types';

const TWITTERAPI_BASE = 'https://api.twitterapi.io';

// ---------------------------------------------------------------------------
// Internal API shapes
// ---------------------------------------------------------------------------

interface TwitterApiTweet {
  id: string;
  url: string;
  text: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  inReplyToId?: string;
  conversationId?: string;
  inReplyToUserId?: string;
  inReplyToUsername?: string;
  entities?: {
    hashtags?: Array<{ text: string }>;
    user_mentions?: Array<{ screen_name: string }>;
    [key: string]: unknown;
  };
}

interface TwitterApiTweetsResponse {
  tweets: TwitterApiTweet[];
  has_next_page: boolean;
  next_cursor: string;
  status: 'success' | 'error';
  message?: string;
}

interface TwitterApiUserInfo {
  userName: string;
  name: string;
  description: string;
  followers: number;
  following: number;
  statusesCount: number;
  profilePicture: string;
  isBlueVerified: boolean;
  createdAt: string;
}

interface TwitterApiUserInfoResponse {
  data?: TwitterApiUserInfo;
  status: 'success' | 'error';
  message?: string;
  // twitterapi.io sometimes returns the user object at the top level
  userName?: string;
  name?: string;
  description?: string;
  followers?: number;
  following?: number;
  statusesCount?: number;
  profilePicture?: string;
  isBlueVerified?: boolean;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Raw tweet fetcher (all pages)
// ---------------------------------------------------------------------------

export interface RawTweet extends TwitterApiTweet {}

/**
 * Fetch all raw tweets for a handle, paginating through all pages.
 * Returns the raw twitterapi.io tweet objects — useful when the caller needs
 * the full data (e.g. for storage in MongoDB).
 */
export async function fetchRawTweets(handle: string): Promise<RawTweet[]> {
  const allTweets: TwitterApiTweet[] = [];
  let cursor = '';
  let hasNextPage = true;

  while (hasNextPage) {
    const params = new URLSearchParams({ userName: handle, includeReplies: 'false' });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${TWITTERAPI_BASE}/twitter/user/last_tweets?${params}`, {
      headers: { 'x-api-key': TWITTERAPI_IO_KEY }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`twitterapi.io error ${res.status}: ${text}`);
    }

    const data: TwitterApiTweetsResponse = await res.json();

    if (data.status === 'error') {
      throw new Error(`twitterapi.io: ${data.message ?? 'unknown error'}`);
    }

    allTweets.push(...data.tweets);
    hasNextPage = data.has_next_page;
    cursor = data.next_cursor ?? '';
  }

  return allTweets;
}

// ---------------------------------------------------------------------------
// Pipeline-facing helpers
// ---------------------------------------------------------------------------

/**
 * Fetch tweets for a handle and return them as pipeline-ready `TweetData[]`.
 */
export async function fetchTweets(handle: string): Promise<TweetData[]> {
  const raw = await fetchRawTweets(handle);
  return raw.map((t) => ({
    text: t.text,
    createdAt: t.createdAt,
    likeCount: t.likeCount,
    retweetCount: t.retweetCount,
    replyCount: t.replyCount,
    viewCount: t.viewCount,
    hashtags: t.entities?.hashtags?.map((h) => h.text) ?? [],
    mentions: t.entities?.user_mentions?.map((m) => m.screen_name) ?? []
  }));
}

/**
 * Fetch the public profile for a handle and return it as pipeline-ready `ProfileData`.
 */
export async function fetchProfile(handle: string): Promise<ProfileData> {
  const params = new URLSearchParams({ userName: handle });
  const res = await fetch(`${TWITTERAPI_BASE}/twitter/user/info?${params}`, {
    headers: { 'x-api-key': TWITTERAPI_IO_KEY }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`twitterapi.io user/info error ${res.status}: ${text}`);
  }

  const data: TwitterApiUserInfoResponse = await res.json();

  if (data.status === 'error') {
    throw new Error(`twitterapi.io user/info: ${data.message ?? 'unknown error'}`);
  }

  // twitterapi.io may nest the user under `data` or return it at the top level
  const user = data.data ?? (data as unknown as TwitterApiUserInfo);

  return {
    username: user.userName ?? handle,
    name: user.name ?? handle,
    bio: user.description ?? '',
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    tweetsCount: user.statusesCount ?? 0,
    profilePicture: user.profilePicture ?? '',
    isBlueVerified: user.isBlueVerified ?? false,
    joinedAt: user.createdAt ?? ''
  };
}
