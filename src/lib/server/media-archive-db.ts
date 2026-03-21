import { Binary } from 'mongodb';
import { getDb } from './mongo-connection';
import type { ArchiveMediaDocument } from './media-archive';

const COLLECTION = 'archive_media';

type MongoDoc = ArchiveMediaDocument;

export async function upsertArchiveMedia(input: {
	_id: string;
	handle: string;
	filename: string;
	contentType: string;
	data: Buffer;
	importedAt: Date;
}): Promise<void> {
	const db = await getDb();
	const doc: MongoDoc = {
		_id: input._id,
		handle: input.handle,
		filename: input.filename,
		contentType: input.contentType,
		size: input.data.length,
		data: new Binary(input.data),
		importedAt: input.importedAt
	};
	await db.collection<MongoDoc>(COLLECTION).replaceOne({ _id: doc._id }, doc, { upsert: true });
}

export async function getArchiveMediaById(id: string): Promise<ArchiveMediaDocument | undefined> {
	const db = await getDb();
	return (await db.collection<MongoDoc>(COLLECTION).findOne({ _id: id })) ?? undefined;
}
