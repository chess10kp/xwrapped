import vader from 'vader-sentiment';
import type { TweetData } from '$lib/server/types';

/** VADER is tuned for English short social text; other languages may be noisy. */

const THRESH_POS = 0.05;
const THRESH_NEG = -0.05;

/** Same heuristic as tweet-insights (RT @ / reposted). */
function guessRepost(text: string): boolean {
	const t = text.trimStart();
	if (/^RT\s@/i.test(t)) return true;
	if (/^reposted\b/i.test(t)) return true;
	return false;
}

export type SentimentPolarity = 'positive' | 'neutral' | 'negative';

export interface VaderPolarityScores {
	neg: number;
	neu: number;
	pos: number;
	compound: number;
}

function polarityScores(text: string): VaderPolarityScores {
	return vader.SentimentIntensityAnalyzer.polarity_scores(text);
}

function classifyCompound(compound: number): SentimentPolarity {
	if (compound >= THRESH_POS) return 'positive';
	if (compound <= THRESH_NEG) return 'negative';
	return 'neutral';
}

export interface SentimentTweetScore {
	tweet: TweetData;
	scores: VaderPolarityScores;
	polarity: SentimentPolarity;
}

export interface SentimentSummary {
	scoredCount: number;
	positiveCount: number;
	neutralCount: number;
	negativeCount: number;
	positivePercent: number;
	neutralPercent: number;
	negativePercent: number;
	/** Mean compound score in [-1, 1] */
	meanCompound: number;
	mostPositive: { tweet: TweetData; compound: number } | null;
	mostNegative: { tweet: TweetData; compound: number } | null;
	excludeReposts: boolean;
	skippedReposts: number;
}

export interface ComputeSentimentOptions {
	/** Per-post kind from archive export; when length matches tweets, used instead of heuristic */
	kinds?: ('tweet' | 'repost')[] | null;
	/** When true (default), reposts are omitted from scoring */
	excludeReposts?: boolean;
}

function pct(part: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((part / total) * 1000) / 10;
}

/**
 * Plain-language label for mean compound score in [-1, 1] (same polarity bands as classifyCompound).
 */
export function describeMeanCompound(compound: number): string {
	if (compound >= 0.5) return 'Strongly upbeat on average';
	if (compound >= 0.15) return 'Leans positive on average';
	if (compound >= 0.05) return 'Mildly positive on average';
	if (compound > -0.05) return 'Roughly neutral on average';
	if (compound > -0.15) return 'Mildly negative on average';
	if (compound > -0.5) return 'Leans negative on average';
	return 'Strongly downbeat on average';
}

export function computeSentimentSummary(
	tweets: TweetData[] | undefined,
	options?: ComputeSentimentOptions
): SentimentSummary | null {
	const list = tweets ?? [];
	if (list.length === 0) return null;

	const excludeReposts = options?.excludeReposts !== false;
	const kinds = options?.kinds;
	const useArchiveKinds =
		Array.isArray(kinds) && kinds.length === list.length && kinds.every((k) => k === 'tweet' || k === 'repost');

	let skippedReposts = 0;
	const toScore: TweetData[] = [];

	for (let i = 0; i < list.length; i++) {
		const t = list[i];
		const isRepost = useArchiveKinds ? kinds![i] === 'repost' : guessRepost(t.text);
		if (isRepost && excludeReposts) {
			skippedReposts++;
			continue;
		}
		toScore.push(t);
	}

	if (toScore.length === 0) return null;

	const scored: SentimentTweetScore[] = toScore.map((tweet) => {
		const scores = polarityScores(tweet.text);
		return { tweet, scores, polarity: classifyCompound(scores.compound) };
	});

	let positiveCount = 0;
	let neutralCount = 0;
	let negativeCount = 0;
	let sumCompound = 0;
	let bestPos: { tweet: TweetData; compound: number } | null = null;
	let bestNeg: { tweet: TweetData; compound: number } | null = null;

	for (const s of scored) {
		sumCompound += s.scores.compound;
		if (s.polarity === 'positive') positiveCount++;
		else if (s.polarity === 'negative') negativeCount++;
		else neutralCount++;

		const c = s.scores.compound;
		if (!bestPos || c > bestPos.compound) bestPos = { tweet: s.tweet, compound: c };
		if (!bestNeg || c < bestNeg.compound) bestNeg = { tweet: s.tweet, compound: c };
	}

	const n = scored.length;
	return {
		scoredCount: n,
		positiveCount,
		neutralCount,
		negativeCount,
		positivePercent: pct(positiveCount, n),
		neutralPercent: pct(neutralCount, n),
		negativePercent: pct(negativeCount, n),
		meanCompound: n > 0 ? Math.round((sumCompound / n) * 10000) / 10000 : 0,
		mostPositive: bestPos,
		mostNegative: bestNeg,
		excludeReposts,
		skippedReposts
	};
}
