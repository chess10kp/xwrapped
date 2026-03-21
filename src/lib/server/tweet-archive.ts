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
