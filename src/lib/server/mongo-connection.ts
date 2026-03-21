import { MongoClient, type Db } from 'mongodb';

let configuredUri: string | null = null;
let client: MongoClient | null = null;
let indexesEnsured = false;

export function configureMongoUri(uri: string): void {
	configuredUri = uri;
}

function getUri(): string {
	if (!configuredUri) {
		throw new Error(
			'MongoDB URI is not configured. Add MONGODB_URI to .env (see .env.example) or call configureMongoUri() before using the store.'
		);
	}
	return configuredUri;
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
		const coll = db.collection('wrapped');
		await Promise.all([
			coll.createIndex({ handle: 1 }),
			coll.createIndex({ createdAt: -1 }),
			coll.createIndex({ status: 1 }),
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
