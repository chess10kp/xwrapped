import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeMongo, configureMongoUri } from '../src/lib/server/mongo-connection.js';
import { parseTweetExportFile } from '../src/lib/server/parse-tweet-export.js';
import { upsertTweetArchive } from '../src/lib/server/tweet-archive-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uri = process.env.MONGODB_URI;
if (!uri?.trim()) {
	console.error('MONGODB_URI is required. Copy .env.example to .env and set MONGODB_URI.');
	process.exit(1);
}
configureMongoUri(uri);

const filePath = join(__dirname, '../steipete_tweets_2025.txt');
const text = readFileSync(filePath, 'utf8');
const { tweets, footer } = parseTweetExportFile(text);

const handle = 'steipete';
const sourceFile = 'steipete_tweets_2025.txt';
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
