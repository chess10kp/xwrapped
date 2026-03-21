import type { TweetData } from '$lib/server/types';

/** Coerce Mongo / API values so totals and hashtags are not all zeros. */
export function normalizeTweetData(t: TweetData): TweetData {
	const rawDate = (t as { createdAt?: unknown }).createdAt;
	const createdAt =
		typeof rawDate === 'string'
			? rawDate
			: rawDate instanceof Date
				? rawDate.toISOString()
				: new Date().toISOString();
	return {
		text: typeof t.text === 'string' ? t.text : String(t.text ?? ''),
		createdAt,
		likeCount: toNum(t.likeCount),
		retweetCount: toNum(t.retweetCount),
		replyCount: toNum(t.replyCount),
		viewCount: toNum(t.viewCount),
		hashtags: Array.isArray(t.hashtags) ? t.hashtags.map(String) : [],
		mentions: Array.isArray(t.mentions) ? t.mentions.map(String) : []
	};
}

function toNum(v: unknown): number {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '') {
		const n = Number(v.replace(/,/g, ''));
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

export function normTweetText(s: string): string {
	return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Match analyser's best_tweet string to a scraped tweet (model may trim or lightly edit). */
export function matchTweetForBestText(
	tweets: TweetData[] | undefined,
	bestText: string | undefined
): TweetData | undefined {
	if (!tweets?.length || !bestText?.trim()) return undefined;
	const b = normTweetText(bestText);
	if (!b) return undefined;

	const exact = tweets.find((t) => normTweetText(t.text) === b);
	if (exact) return exact;

	const partial = tweets.find(
		(t) => {
			const nt = normTweetText(t.text);
			return nt.includes(b) || b.includes(nt);
		}
	);
	if (partial) return partial;

	// Longest shared prefix heuristic (first 80 chars)
	const head = b.slice(0, 80);
	return tweets.find((t) => normTweetText(t.text).startsWith(head.slice(0, 40)));
}

export interface TweetAggregateStats {
	count: number;
	totalLikes: number;
	totalRetweets: number;
	totalReplies: number;
	totalViews: number;
	avgLikes: number;
	avgViews: number;
	topHashtags: { tag: string; count: number }[];
	topMentions: { handle: string; count: number }[];
	biggestHit: TweetData | undefined;
}

export function aggregateTweetStats(tweets: TweetData[] | undefined): TweetAggregateStats {
	const list = tweets ?? [];
	if (list.length === 0) {
		return {
			count: 0,
			totalLikes: 0,
			totalRetweets: 0,
			totalReplies: 0,
			totalViews: 0,
			avgLikes: 0,
			avgViews: 0,
			topHashtags: [],
			topMentions: [],
			biggestHit: undefined
		};
	}

	let totalLikes = 0;
	let totalRetweets = 0;
	let totalReplies = 0;
	let totalViews = 0;
	const tagCounts = new Map<string, number>();
	const mentionCounts = new Map<string, number>();
	let biggestHit: TweetData | undefined;

	for (const t of list) {
		totalLikes += toNum(t.likeCount);
		totalRetweets += toNum(t.retweetCount);
		totalReplies += toNum(t.replyCount);
		totalViews += toNum(t.viewCount);
		for (const h of t.hashtags ?? []) {
			const k = h.replace(/^#/, '').toLowerCase();
			if (k) tagCounts.set(k, (tagCounts.get(k) ?? 0) + 1);
		}
		for (const m of t.mentions ?? []) {
			const k = m.replace(/^@/, '').toLowerCase();
			if (k) mentionCounts.set(k, (mentionCounts.get(k) ?? 0) + 1);
		}
		if (!biggestHit || toNum(t.likeCount) > toNum(biggestHit.likeCount)) {
			biggestHit = t;
		}
	}

	const n = list.length;
	const topHashtags = [...tagCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([tag, count]) => ({ tag, count }));
	const topMentions = [...mentionCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([handle, count]) => ({ handle, count }));

	return {
		count: n,
		totalLikes,
		totalRetweets,
		totalReplies,
		totalViews,
		avgLikes: Math.round(totalLikes / n),
		avgViews: Math.round(totalViews / n),
		topHashtags,
		topMentions,
		biggestHit
	};
}

export function formatCount(n: number): string {
	if (!Number.isFinite(n)) return '—';
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
	if (n >= 10_000) return `${Math.round(n / 1000)}K`;
	if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
	return String(Math.round(n));
}
