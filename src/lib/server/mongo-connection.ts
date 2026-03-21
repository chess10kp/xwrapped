import { MongoClient, type Db } from 'mongodb';

/**
 * Optional override (scripts/tests). Otherwise uses `MONGODB_URI` from `.env` via
 * `process.env` (Vite dev/preview, production, and `tsx` + dotenv all set this).
 */
let configuredUri: string | null = null;
let client: MongoClient | null = null;
let indexesEnsured = false;

export function configureMongoUri(uri: string): void {
	configuredUri = uri;
}

function getUri(): string {
	const uri = configuredUri ?? process.env.MONGODB_URI;
	if (!uri?.trim()) {
		throw new Error(
			'MongoDB URI is not configured. Add MONGODB_URI to .env (see .env.example) or call configureMongoUri() before using the store.'
		);
	}
	return uri;
}

export async function getMongoClient(): Promise<MongoClient> {
	if (!client) {
		client = new MongoClient(getUri());
		await client.connect();
	}
	return client;
}

export async function getDb(): Promise<Db> {
	const c = await getMongoClient();
	const db = c.db('xwrapped');
	if (!indexesEnsured) {
		const wrapped = db.collection('wrapped');
		await Promise.all([
			wrapped.createIndex({ handle: 1 }),
			wrapped.createIndex({ createdAt: -1 }),
			wrapped.createIndex({ status: 1 }),
			db.collection('tweet_archives').createIndex({ handle: 1 }),
			db.collection('tweet_archives').createIndex({ importedAt: -1 }),
		]);
		indexesEnsured = true;
	}
	return db;
}

export async function closeMongo(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		indexesEnsured = false;
	}
}

if (typeof process !== 'undefined') {
	for (const sig of ['SIGINT', 'SIGTERM'] as const) {
		process.once(sig, () => {
			void closeMongo().finally(() => process.exit(0));
		});
	}
}
