/**
 * Prints the URL-encoded form of a MongoDB password for use in MONGODB_URI.
 *
 *   npm run encode:mongo-password -- 'raw password here'
 *
 * For sensitive passwords (avoids shell history), use stdin:
 *
 *   printf %s "$PASS" | npx tsx scripts/encode-mongo-password.ts
 */
import { readFileSync } from 'node:fs';

const fromArgv = process.argv.slice(2).join(' ').trim();
const fromStdin = () => {
	try {
		return readFileSync(0, 'utf8').replace(/\r?\n$/, '');
	} catch {
		return '';
	}
};

const raw = fromArgv || fromStdin();

if (!raw) {
	console.error('Usage: npm run encode:mongo-password -- <raw password>');
	console.error('   or: printf %s "$PASS" | npx tsx scripts/encode-mongo-password.ts');
	process.exit(1);
}

process.stdout.write(`${encodeURIComponent(raw)}\n`);
