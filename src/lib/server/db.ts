import type { WrappedResult } from './types';
import { getDb } from './mongo-connection';

const COLLECTION = 'wrapped';

/** Stored shape: string UUID as MongoDB _id (not ObjectId). */
type WrappedMongoDoc = WrappedResult & { _id: string };

function toResult(doc: WrappedMongoDoc | null): WrappedResult | undefined {
	if (!doc) return undefined;
	const { _id, ...rest } = doc;
	return { ...rest, id: _id };
}

export class Store {
	async set(id: string, result: WrappedResult): Promise<void> {
		const db = await getDb();
		const doc: WrappedMongoDoc = { ...result, _id: id };
		await db
			.collection<WrappedMongoDoc>(COLLECTION)
			.replaceOne({ _id: id }, doc, { upsert: true });
	}

	async get(id: string): Promise<WrappedResult | undefined> {
		const db = await getDb();
		const doc = await db.collection<WrappedMongoDoc>(COLLECTION).findOne({ _id: id });
		return toResult(doc);
	}

	async update(id: string, updates: Partial<WrappedResult>): Promise<void> {
		const db = await getDb();
		const copy = { ...updates };
		delete (copy as { id?: string }).id;
		const set = Object.fromEntries(
			Object.entries(copy).filter(([, v]) => v !== undefined)
		) as Record<string, unknown>;
		if (Object.keys(set).length === 0) return;
		await db.collection<WrappedMongoDoc>(COLLECTION).updateOne({ _id: id }, { $set: set });
	}
}

export const store = new Store();
