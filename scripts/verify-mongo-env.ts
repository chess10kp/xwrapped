/**
 * Verifies MONGODB_URI from .env: connect + ping on DB "xwrapped" (same as the app).
 * Run from repo root: npm run verify:mongo
 */
import 'dotenv/config';
import { configureMongoUri, getMongoClient, closeMongo } from '../src/lib/server/mongo-connection.js';

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
	console.error('MONGODB_URI is missing or empty. Set it in .env (see .env.example).');
	process.exit(1);
}

configureMongoUri(uri);

try {
	const client = await getMongoClient();
	const db = client.db('xwrapped');
	const ping = await db.command({ ping: 1 });
	if (ping.ok !== 1) {
		console.error('Unexpected ping result:', ping);
		process.exit(1);
	}
	console.log('MongoDB: credentials OK — connected and ping succeeded on database "xwrapped".');
} catch (err) {
	const name = err instanceof Error ? err.name : 'Error';
	const message = err instanceof Error ? err.message : String(err);
	console.error(`${name}: ${message}`);
	if (message.includes('Authentication') || message.includes('auth')) {
		console.error('Hint: reset the DB user password in Atlas, then URL-encode only the password:');
		console.error('  npm run encode:mongo-password -- \'your raw password\'');
		console.error('Paste the encoded string into mongodb+srv://USER:ENCODED@host/... then run: npm run verify:mongo');
	}
	process.exit(1);
} finally {
	await closeMongo().catch(() => {});
}
