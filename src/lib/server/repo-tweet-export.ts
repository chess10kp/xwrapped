import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	parseBillGatesTweetExportFile,
	parseTweetExportFile,
	parseStatNumber
} from './parse-tweet-export';
import { archivedTweetsToTweetData } from './tweet-archive';
import type { ArchivedTweet, TweetExportFooter } from './tweet-archive';
import type { ProfileData, TweetData } from './types';
import { stubProfile } from './stub-x-data';
import { bundledTweetExportFileNames, getBundledTweetExportText } from './bundled-tweet-exports';

/** Max posts from a bundled or repo-root `*_tweets_*.txt` used for engagement, patterns, and rail stats. */
export const REPO_EXPORT_MAX_POSTS = 100;

export interface RepoTweetExport {
	sourceFile: string;
	absolutePath: string;
	tweets: ArchivedTweet[];
	footer?: TweetExportFooter;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function repoRoot(): string {
	return process.cwd();
}

const TWEET_EXPORTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'tweet-exports');

type ResolvedExport =
	| { kind: 'bundled'; fileName: string; text: string }
	| { kind: 'disk'; path: string };

function resolveTweetExportForHandle(handle: string): ResolvedExport | null {
	const h = handle.toLowerCase().trim();
	if (!h) return null;

	const directName = `${h}_tweets_2025.txt`;
	const bundledDirect = getBundledTweetExportText(directName);
	if (bundledDirect !== undefined) {
		return { kind: 'bundled', fileName: directName, text: bundledDirect };
	}

	const re = new RegExp(`^${escapeRegExp(h)}_tweets_.+\\.txt$`, 'i');
	for (const name of bundledTweetExportFileNames()) {
		if (re.test(name)) {
			const text = getBundledTweetExportText(name);
			if (text !== undefined) {
				return { kind: 'bundled', fileName: name, text };
			}
		}
	}

	const onDiskInTweetExports = findTweetExportPathInDir(TWEET_EXPORTS_DIR, h, re);
	if (onDiskInTweetExports) {
		return { kind: 'disk', path: onDiskInTweetExports };
	}

	const root = repoRoot();
	const onDiskRoot = findTweetExportPathInDir(root, h, re);
	if (onDiskRoot) {
		return { kind: 'disk', path: onDiskRoot };
	}

	return null;
}

function findTweetExportPathInDir(dir: string, h: string, nameRe: RegExp): string | null {
	const direct = join(dir, `${h}_tweets_2025.txt`);
	if (existsSync(direct)) return direct;
	try {
		const files = readdirSync(dir);
		const name = files.find((f) => nameRe.test(f));
		return name ? join(dir, name) : null;
	} catch {
		return null;
	}
}

/**
 * Returns a filesystem path to an export, or `bundled:<filename>` when the text is inlined in the server bundle.
 */
export function findTweetExportFileForHandle(handle: string): string | null {
	const r = resolveTweetExportForHandle(handle);
	if (!r) return null;
	return r.kind === 'bundled' ? `bundled:${r.fileName}` : r.path;
}

function useBillGatesParser(fileName: string): boolean {
	const n = fileName.toLowerCase();
	return n.includes('billgates') || n.includes('bill_gates');
}

/** Loads scraped posts from a bundled or on-disk export file, if one exists for this handle. */
export function loadRepoTweetExport(handle: string): RepoTweetExport | null {
	const resolved = resolveTweetExportForHandle(handle);
	if (!resolved) return null;

	const fileName =
		resolved.kind === 'bundled' ? resolved.fileName : basename(resolved.path);
	const text =
		resolved.kind === 'bundled' ? resolved.text : readFileSync(resolved.path, 'utf8');
	const absolutePath =
		resolved.kind === 'bundled' ? `bundled:${resolved.fileName}` : resolved.path;

	const parsed = useBillGatesParser(fileName)
		? parseBillGatesTweetExportFile(text)
		: parseTweetExportFile(text);
	if (!parsed.tweets?.length) return null;
	const tweets = parsed.tweets.slice(0, REPO_EXPORT_MAX_POSTS);
	return {
		sourceFile: fileName,
		absolutePath,
		tweets,
		footer: parsed.footer
	};
}

function parseNameFromProfileLine(profileLine: string | undefined): string {
	if (!profileLine?.trim()) return '';
	const t = profileLine.trim();
	const m = /^@\w+\s*\((.+)\)\s*$/.exec(t);
	return m?.[1]?.trim() ?? '';
}

function parseJoinedIso(joined: string | undefined, fallback: string): string {
	if (!joined?.trim()) return fallback;
	const t = joined.trim();
	const d = new Date(t);
	if (!Number.isNaN(d.getTime())) return d.toISOString();
	return fallback;
}

/** Builds `ProfileData` from an export footer plus known avatar paths. */
export function profileFromExportFooter(
	handle: string,
	footer: TweetExportFooter | undefined,
	tweetCount: number
): ProfileData {
	const base = stubProfile(handle);
	if (!footer) {
		return { ...base, tweetsCount: tweetCount };
	}
	const name = parseNameFromProfileLine(footer.profileLine) || base.name;
	const bio = footer.description?.trim() ?? base.bio;
	const followers = footer.followers ? parseStatNumber(footer.followers) : base.followers;
	const following = footer.following ? parseStatNumber(footer.following) : base.following;
	const joinedAt = parseJoinedIso(footer.joined, base.joinedAt);
	return {
		...base,
		name,
		bio,
		followers,
		following,
		tweetsCount: tweetCount,
		joinedAt
	};
}

export function repoTweetsAsTweetData(tweets: ArchivedTweet[]): TweetData[] {
	return archivedTweetsToTweetData(tweets);
}
