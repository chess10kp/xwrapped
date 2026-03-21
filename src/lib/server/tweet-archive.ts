import type { TweetData } from './types';

/** One tweet parsed from a text export (e.g. steipete_tweets_2025.txt). */
export interface ArchivedTweet extends TweetData {
	tweetIndex: number;
	kind: 'tweet' | 'repost';
	pinned?: boolean;
	dateRaw: string;
	link?: string;
	statsRaw: string;
	bookmarkCount?: number;
}

/** Optional footer profile block after the tweet list. */
export interface TweetExportFooter {
	profileLine?: string;
	description?: string;
	location?: string;
	joined?: string;
	followers?: string;
	following?: string;
}

/** Stored in MongoDB collection `tweet_archives`. */
export interface TweetArchiveDocument {
	_id: string;
	handle: string;
	sourceFile: string;
	importedAt: Date;
	tweetCount: number;
	tweets: ArchivedTweet[];
	footer?: TweetExportFooter;
}

/** Strip archive-only fields for UI / stats (matches `TweetData`). */
export function archivedTweetsToTweetData(tweets: ArchivedTweet[]): TweetData[] {
	return tweets.map((t) => ({
		text: typeof t.text === 'string' ? t.text : '',
		createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
		likeCount: Number(t.likeCount) || 0,
		retweetCount: Number(t.retweetCount) || 0,
		replyCount: Number(t.replyCount) || 0,
		viewCount: Number(t.viewCount) || 0,
		hashtags: Array.isArray(t.hashtags) ? t.hashtags : [],
		mentions: Array.isArray(t.mentions) ? t.mentions : []
	}));
}
