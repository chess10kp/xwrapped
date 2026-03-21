import type { TweetAggregateStats } from '$lib/tweet-stats';

import { formatCount } from '$lib/tweet-stats';

export function normalizeComparison(text: string | undefined): string | null {
	const trimmed = (text ?? '').trim();
	return trimmed.length > 0 ? trimmed : null;
}

function estimateFollowerTopPercent(followers: number): number {
	if (followers >= 10_000_000) return 0.001;
	if (followers >= 1_000_000) return 0.01;
	if (followers >= 500_000) return 0.05;
	if (followers >= 100_000) return 0.2;
	if (followers >= 50_000) return 0.5;
	if (followers >= 10_000) return 2;
	if (followers >= 5_000) return 4;
	if (followers >= 1_000) return 10;
	if (followers >= 500) return 15;
	if (followers >= 100) return 30;
	if (followers >= 50) return 40;
	if (followers >= 10) return 60;
	if (followers > 0) return 80;
	return 95;
}

function formatTopPercent(percent: number): string {
	if (percent < 0.01) return percent.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
	if (percent < 0.1) return percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
	if (percent < 1) return percent.toFixed(1).replace(/\.0$/, '');
	return String(Math.round(percent));
}

export function describeFollowerPercentile(followers: number): string {
	const topPercent = formatTopPercent(estimateFollowerTopPercent(followers));
	return `You are roughly in the top ${topPercent}% of X by followers.`;
}

export function describePeakHour(peakHour: string | undefined): string {
	const hour = (peakHour ?? '').trim();
	if (!hour) return 'Your posting schedule remains spiritually off the grid.';
	return `You do your best work at ${hour} apparently.`;
}

export function describeTone(tone: string | undefined): string {
	const voice = (tone ?? '').trim();
	if (!voice) return 'Your tone refuses to be perceived, which honestly feels on brand.';
	return `You sound ${voice}. Repeatedly.`;
}

export function describeTotalLikes(stats: TweetAggregateStats): string {
	if (!stats.count) return 'No likes to count because no posts were analysed.';
	return `You picked up ${formatCount(stats.totalLikes)} likes across these posts.`;
}

export function describeAverageViews(stats: TweetAggregateStats): string {
	if (!stats.count) return 'Average views show up once we have posts to analyse.';
	return `On average, each post reached about ${formatCount(stats.avgViews)} views.`;
}
