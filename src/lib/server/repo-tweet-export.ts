import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
	parseBillGatesTweetExportFile,
	parseTweetExportFile,
	parseStatNumber
} from './parse-tweet-export';
import { archivedTweetsToTweetData } from './tweet-archive';
import type { ArchivedTweet, TweetExportFooter } from './tweet-archive';
import type { ProfileData, TweetData } from './types';
import { stubProfile } from './stub-x-data';

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

/** Resolves `{handle}_tweets_*.txt` at the project root (first match). */
export function findTweetExportFileForHandle(handle: string): string | null {
	const h = handle.toLowerCase().trim();
	if (!h) return null;
	const root = repoRoot();
	const direct = join(root, `${h}_tweets_2025.txt`);
	if (existsSync(direct)) return direct;
	try {
		const re = new RegExp(`^${escapeRegExp(h)}_tweets_.+\\.txt$`, 'i');
		const files = readdirSync(root);
		const name = files.find((f) => re.test(f));
		return name ? join(root, name) : null;
	} catch {
		return null;
	}
}

function useBillGatesParser(fileName: string): boolean {
	const n = fileName.toLowerCase();
	return n.includes('billgates') || n.includes('bill_gates');
}

/** Loads scraped posts from a repo-root export file, if one exists for this handle. */
export function loadRepoTweetExport(handle: string): RepoTweetExport | null {
	const path = findTweetExportFileForHandle(handle);
	if (!path) return null;
	const text = readFileSync(path, 'utf8');
	const fileName = basename(path);
	const parsed = useBillGatesParser(fileName)
		? parseBillGatesTweetExportFile(text)
		: parseTweetExportFile(text);
	if (!parsed.tweets?.length) return null;
	return {
		sourceFile: fileName,
		absolutePath: path,
		tweets: parsed.tweets,
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
