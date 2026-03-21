import { basename } from 'node:path';

/**
 * Eager raw imports so tweet export `.txt` files ship inside the server bundle
 * (Vercel serverless has no repo-root filesystem like local dev).
 */
const rawModules = import.meta.glob<string>('./tweet-exports/*.txt', {
	query: '?raw',
	import: 'default',
	eager: true
});

const textByFileName = new Map<string, string>();

for (const [path, text] of Object.entries(rawModules)) {
	textByFileName.set(basename(path).toLowerCase(), text);
}

export function getBundledTweetExportText(fileName: string): string | undefined {
	return textByFileName.get(fileName.toLowerCase());
}

export function bundledTweetExportFileNames(): string[] {
	return [...textByFileName.keys()];
}
