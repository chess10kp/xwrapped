import { getDb } from './mongo-connection';
import type { TweetArchiveDocument } from './tweet-archive';

const COLLECTION = 'tweet_archives';

type TweetArchiveMongoDoc = TweetArchiveDocument & { _id: string };

export async function upsertTweetArchive(doc: TweetArchiveDocument): Promise<void> {
	const db = await getDb();
	const mongoDoc: TweetArchiveMongoDoc = { ...doc, _id: doc._id };
	await db
		.collection<TweetArchiveMongoDoc>(COLLECTION)
		.replaceOne({ _id: doc._id }, mongoDoc, { upsert: true });
}

export async function getTweetArchiveById(id: string): Promise<TweetArchiveDocument | undefined> {
	const db = await getDb();
	const doc = await db.collection<TweetArchiveMongoDoc>(COLLECTION).findOne({ _id: id });
	if (!doc) return undefined;
	const { _id, ...rest } = doc;
	return { ...rest, _id };
}
