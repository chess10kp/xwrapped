import type { TweetData } from '$lib/server/types';

function num(v: unknown): number {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '') {
		const n = Number(v.replace(/,/g, ''));
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

function sortedMedian(values: number[]): number {
	if (values.length === 0) return 0;
	const s = [...values].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	if (s.length % 2 === 1) return s[mid];
	return (s[mid - 1] + s[mid]) / 2;
}

function sortedP95(values: number[]): number {
	if (values.length === 0) return 0;
	const s = [...values].sort((a, b) => a - b);
	const idx = Math.min(s.length - 1, Math.max(0, Math.ceil(0.95 * s.length) - 1));
	return s[idx];
}

const SKIP_DOMAINS = new Set([
	't.co',
	'pic.twitter.com',
	'pbs.twimg.com',
	'video.twimg.com'
]);

function hostnameFromUrl(raw: string): string | null {
	try {
		const u = raw.startsWith('http') ? new URL(raw.split(/[\s)]/)[0]) : new URL(`https://${raw}`);
		let h = u.hostname.toLowerCase();
		if (h.startsWith('www.')) h = h.slice(4);
		return h || null;
	} catch {
		return null;
	}
}

function extractUrlsFromText(text: string): string[] {
	const out: string[] = [];
	const re = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		out.push(m[0].replace(/[),.]+$/g, ''));
	}
	return out;
}

function guessRepost(text: string): boolean {
	const t = text.trimStart();
	if (/^RT\s@/i.test(t)) return true;
	if (/^reposted\b/i.test(t)) return true;
	return false;
}

/** Parse tweet timestamps from ISO, Apify, or English export lines like "February 15, 2025". */
function parseTweetDate(raw: unknown): Date | null {
	if (raw == null) return null;
	if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
	const s = typeof raw === 'string' ? raw.trim() : String(raw);
	if (!s) return null;
	let d = new Date(s);
	if (!Number.isNaN(d.getTime())) return d;
	// Strip trailing parentheticals e.g. "(Pinned Tweet)"
	const cleaned = s.replace(/\s*\([^)]*\)\s*$/g, '').trim();
	d = new Date(cleaned);
	if (!Number.isNaN(d.getTime())) return d;
	return null;
}

export interface TweetInsights {
	count: number;
	/** Posts per hour of day, 0–23 UTC */
	hourBucketsUtc: number[];
	peakHourUtc: number;
	medianLikes: number;
	p95Likes: number;
	medianViews: number;
	p95Views: number;
	medianChars: number;
	p95Chars: number;
	originalCount: number;
	repostCount: number;
	/** % of posts classified as reposts */
	repostPercent: number;
	/** % classified as original posts */
	originalPercent: number;
	kindSource: 'archive' | 'heuristic';
	topDomains: { domain: string; count: number }[];
}

export function computeTweetInsights(
	tweets: TweetData[] | undefined,
	options?: { kinds?: ('tweet' | 'repost')[] | null }
): TweetInsights | null {
	const list = tweets ?? [];
	if (list.length === 0) return null;

	const kinds = options?.kinds;
	const useArchiveKinds =
		Array.isArray(kinds) && kinds.length === list.length && kinds.every((k) => k === 'tweet' || k === 'repost');

	let originalCount = 0;
	let repostCount = 0;

	if (useArchiveKinds) {
		for (const k of kinds!) {
			if (k === 'repost') repostCount++;
			else originalCount++;
		}
	} else {
		for (const t of list) {
			if (guessRepost(t.text)) repostCount++;
			else originalCount++;
		}
	}

	const n = list.length;
	const repostPercent = n > 0 ? Math.round((repostCount / n) * 1000) / 10 : 0;
	const originalPercent = n > 0 ? Math.round((originalCount / n) * 1000) / 10 : 0;

	const hourBucketsUtc = new Array(24).fill(0);
	for (const t of list) {
		const d = parseTweetDate((t as { createdAt?: unknown }).createdAt);
		if (d) {
			const h = d.getUTCHours();
			hourBucketsUtc[h]++;
		}
	}
	let peakHourUtc = 0;
	let peakN = -1;
	for (let h = 0; h < 24; h++) {
		if (hourBucketsUtc[h] > peakN) {
			peakN = hourBucketsUtc[h];
			peakHourUtc = h;
		}
	}

	const likes = list.map((t) => num(t.likeCount));
	const views = list.map((t) => num(t.viewCount));
	const lens = list.map((t) => (typeof t.text === 'string' ? t.text.length : 0));

	const domainCounts = new Map<string, number>();
	for (const t of list) {
		if (typeof t.text !== 'string') continue;
		for (const raw of extractUrlsFromText(t.text)) {
			const host = hostnameFromUrl(raw);
			if (!host || SKIP_DOMAINS.has(host)) continue;
			if (host === 'x.com' || host === 'twitter.com') continue;
			domainCounts.set(host, (domainCounts.get(host) ?? 0) + 1);
		}
	}

	const topDomains = [...domainCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([domain, count]) => ({ domain, count }));

	return {
		count: n,
		hourBucketsUtc,
		peakHourUtc,
		medianLikes: Math.round(sortedMedian(likes)),
		p95Likes: Math.round(sortedP95(likes)),
		medianViews: Math.round(sortedMedian(views)),
		p95Views: Math.round(sortedP95(views)),
		medianChars: Math.round(sortedMedian(lens)),
		p95Chars: Math.round(sortedP95(lens)),
		originalCount,
		repostCount,
		repostPercent,
		originalPercent,
		kindSource: useArchiveKinds ? 'archive' : 'heuristic',
		topDomains
	};
}
