import 'dotenv/config';
import { configureMongoUri } from '../src/lib/server/mongo-connection.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
	console.error('MONGODB_URI is required. Copy .env.example to .env and set MONGODB_URI.');
	process.exit(1);
}
configureMongoUri(uri);

const { processHandle } = await import('../src/lib/server/pipeline.js');
const { store } = await import('../src/lib/server/db.js');

const DEMO_HANDLES = [
	'elonmusk',
	'sama',
	'kaborerichard',
	'levelsio',
	'naval',
	'pmarca',
];

async function preCache() {
	for (const handle of DEMO_HANDLES) {
		console.log(`Pre-caching @${handle}...`);
		const id = crypto.randomUUID();
		await store.set(id, {
			id,
			handle,
			status: 'scraping',
			createdAt: new Date(),
		});
		await processHandle(id, handle);
		console.log(`✅ @${handle} cached with ID: ${id}`);
	}
	console.log('🎉 Pre-cache complete!');
}

preCache().catch(console.error);
