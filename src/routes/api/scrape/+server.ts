import { json } from '@sveltejs/kit';
import { TWITTERAPI_IO_KEY } from '$lib/server/env.server';
import { fetchRawTweets, type RawTweet } from '$lib/server/twitterapi';
import { getDb } from '$lib/server/mongo-connection';

/** Document shape stored in the "scraped_tweets" MongoDB collection. */
interface ScrapedTweetDoc {
	_id: string;
	tweetId: string;
	handle: string;
	url: string;
	text: string;
	source: string;
	retweetCount: number;
	replyCount: number;
	likeCount: number;
	quoteCount: number;
	viewCount: number;
	bookmarkCount: number;
	createdAt: string;
	lang: string;
	isReply: boolean;
	inReplyToId: string | null;
	conversationId: string | null;
	inReplyToUserId: string | null;
	inReplyToUsername: string | null;
	entities: Record<string, unknown> | null;
	scrapedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST({ request }: { request: any }) {
	const body = await request.json().catch(() => null);

	if (!body || typeof body.handle !== 'string') {
		return json({ error: 'Body must be JSON with a "handle" string field' }, { status: 400 });
	}

	const handle = (body.handle as string).trim().replace(/^@/, '').toLowerCase();

	if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
		return json({ error: 'Invalid Twitter handle format' }, { status: 400 });
	}

	if (!TWITTERAPI_IO_KEY?.trim()) {
		return json({ error: 'TWITTERAPI_IO_KEY is not configured on the server' }, { status: 503 });
	}

	let tweets: RawTweet[];
	try {
		tweets = await fetchRawTweets(handle);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[api/scrape] fetch failed for @${handle}:`, message);
		return json({ error: message }, { status: 502 });
	}

	if (tweets.length === 0) {
		return json({ handle, inserted: 0, message: 'No tweets found' });
	}

	// Store in MongoDB collection "scraped_tweets".
	// Each document uses the tweet id as _id to allow safe upserts.
	try {
		const db = await getDb();
		const col = db.collection<ScrapedTweetDoc>('scraped_tweets');

		// Ensure indexes exist for efficient lookups
		await Promise.all([
			col.createIndex({ handle: 1 }),
			col.createIndex({ tweetId: 1 }, { unique: true }),
			col.createIndex({ createdAt: -1 })
		]);

		const ops = tweets.map((tweet) => ({
			replaceOne: {
				filter: { tweetId: tweet.id },
				replacement: {
					_id: tweet.id,
					tweetId: tweet.id,
					handle,
					url: tweet.url,
					text: tweet.text,
					source: tweet.source,
					retweetCount: tweet.retweetCount,
					replyCount: tweet.replyCount,
					likeCount: tweet.likeCount,
					quoteCount: tweet.quoteCount,
					viewCount: tweet.viewCount,
					bookmarkCount: tweet.bookmarkCount,
					createdAt: tweet.createdAt,
					lang: tweet.lang,
					isReply: tweet.isReply,
					inReplyToId: tweet.inReplyToId ?? null,
					conversationId: tweet.conversationId ?? null,
					inReplyToUserId: tweet.inReplyToUserId ?? null,
					inReplyToUsername: tweet.inReplyToUsername ?? null,
					entities: tweet.entities ?? null,
					scrapedAt: new Date()
				} satisfies ScrapedTweetDoc,
				upsert: true
			}
		}));

		const result = await col.bulkWrite(ops, { ordered: false });

		const inserted = result.upsertedCount + result.modifiedCount;
		return json({ handle, inserted, total: tweets.length });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[api/scrape] mongo write failed for @${handle}:`, message);
		return json({ error: 'Database write failed', detail: message }, { status: 503 });
	}
}
