import 'dotenv/config';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeMongo, configureMongoUri } from '../src/lib/server/mongo-connection.js';
import { upsertArchiveMedia } from '../src/lib/server/media-archive-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const uri = process.env.MONGODB_URI;
if (!uri?.trim()) {
	console.error('MONGODB_URI is required. Copy .env.example to .env and set MONGODB_URI.');
	process.exit(1);
}
configureMongoUri(uri);

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function contentTypeForExt(ext: string): string {
	switch (ext.toLowerCase()) {
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg';
		case '.png':
			return 'image/png';
		case '.gif':
			return 'image/gif';
		case '.webp':
			return 'image/webp';
		default:
			return 'application/octet-stream';
	}
}

function handleFromFilename(name: string): string | null {
	if (name.startsWith('steipete_')) return 'steipete';
	if (name.startsWith('billgates_')) return 'billgates';
	return null;
}

function collectImageFiles(dir: string): string[] {
	let names: string[] = [];
	try {
		names = readdirSync(dir);
	} catch {
		return [];
	}
	const out: string[] = [];
	for (const name of names) {
		const full = join(dir, name);
		let st: ReturnType<typeof statSync>;
		try {
			st = statSync(full);
		} catch {
			continue;
		}
		if (!st.isFile()) continue;
		const ext = extname(name);
		if (!IMAGE_EXT.has(ext.toLowerCase())) continue;
		out.push(full);
	}
	return out;
}

const dirs = [join(root, 'static', 'images'), join(root, 'images')];
const seen = new Set<string>();
const paths: string[] = [];
for (const dir of dirs) {
	for (const p of collectImageFiles(dir)) {
		const base = p.split(/[/\\]/).pop()!;
		if (seen.has(base)) continue;
		seen.add(base);
		paths.push(p);
	}
}

const importedAt = new Date();
let n = 0;
for (const filePath of paths) {
	const filename = filePath.split(/[/\\]/).pop()!;
	const handle = handleFromFilename(filename);
	if (!handle) {
		console.warn(`skip (unknown prefix): ${filename}`);
		continue;
	}
	const ext = extname(filename);
	const data = readFileSync(filePath);
	const _id = `${handle}:${filename}`;
	await upsertArchiveMedia({
		_id,
		handle,
		filename,
		contentType: contentTypeForExt(ext),
		data,
		importedAt
	});
	n++;
	console.log(`stored ${_id} (${data.length} bytes)`);
}

console.log(`Done: ${n} image(s) → collection archive_media`);

await closeMongo();
