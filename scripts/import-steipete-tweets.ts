import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeMongo, configureMongoUri } from '../src/lib/server/mongo-connection.js';
import {
	parseBillGatesTweetExportFile,
	parseTweetExportFile
} from '../src/lib/server/parse-tweet-export.js';
import { upsertTweetArchive } from '../src/lib/server/tweet-archive-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uri = process.env.MONGODB_URI;
if (!uri?.trim()) {
	console.error('MONGODB_URI is required. Copy .env.example to .env and set MONGODB_URI.');
	process.exit(1);
}
configureMongoUri(uri);

const sourceFile = process.argv[2] ?? 'steipete_tweets_2025.txt';
const handle = process.argv[3] ?? 'steipete';

const filePath = join(__dirname, '..', sourceFile);
const text = readFileSync(filePath, 'utf8');
const parse =
	sourceFile.toLowerCase().includes('billgates') ||
	sourceFile.toLowerCase().includes('bill_gates')
		? parseBillGatesTweetExportFile
		: parseTweetExportFile;
const { tweets, footer } = parse(text);
const _id = `${handle}:${sourceFile}`;

await upsertTweetArchive({
	_id,
	handle,
	sourceFile,
	importedAt: new Date(),
	tweetCount: tweets.length,
	tweets,
	footer
});

console.log(
	`Imported ${tweets.length} tweets for @${handle} → collection tweet_archives, _id="${_id}"`
);
if (footer?.profileLine) console.log(`Profile: ${footer.profileLine}`);

await closeMongo();
