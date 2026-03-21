<script lang="ts">
	import { aggregateTweetStats, formatCount } from '$lib/tweet-stats';
	import { computeTweetInsights } from '$lib/tweet-insights';
	import { computeSentimentSummary, describeMeanCompound } from '$lib/tweet-sentiment';
	import type { WrappedResult } from '$lib/server/types';

	type RailSection = 'engagement' | 'sentiment' | 'patterns' | 'tags';

	let {
		result,
		tweetKinds = null,
		padded = false,
		sections = null
	}: {
		result: WrappedResult;
		tweetKinds?: ('tweet' | 'repost')[] | null;
		padded?: boolean;
		/** If set, only these sections render. If null, all sections render. */
		sections?: RailSection[] | null;
	} = $props();

	function showSection(id: RailSection): boolean {
		if (!sections?.length) return true;
		return sections.includes(id);
	}

	const tweetAgg = $derived(aggregateTweetStats(result.tweets));
	const insights = $derived(
		computeTweetInsights(result.tweets, { kinds: tweetKinds ?? undefined })
	);
	const sentiment = $derived(
		computeSentimentSummary(result.tweets, { kinds: tweetKinds ?? undefined })
	);
	const maxHourBucket = $derived(
		insights ? Math.max(1, ...insights.hourBucketsUtc) : 1
	);

	function hourUtcLabel(h: number): string {
		return `${String(h).padStart(2, '0')}:00 UTC`;
	}

	function clipTweetSnippet(s: string, max = 160): string {
		const t = s.trim();
		if (t.length <= max) return t;
		return `${t.slice(0, max)}…`;
	}

	const wrapClass = $derived(padded ? 'px-4' : '');
</script>

<div class="flex flex-col gap-4 {wrapClass}">
	{#if showSection('engagement') && tweetAgg.count > 0}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-labelledby="rail-eng-heading">
			<div class="px-3 py-2.5">
				<h2 id="rail-eng-heading" class="text-[15px] font-bold text-[#e7e9ea]">Engagement</h2>
			</div>
			<div class="grid grid-cols-2 gap-2 px-3 pb-3">
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-2.5 py-2">
					<p class="text-base font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.totalLikes)}</p>
					<p class="text-[11px] text-[#71767b]">Total likes</p>
				</div>
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-2.5 py-2">
					<p class="text-base font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.totalViews)}</p>
					<p class="text-[11px] text-[#71767b]">Total views</p>
				</div>
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-2.5 py-2">
					<p class="text-base font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.avgLikes)}</p>
					<p class="text-[11px] text-[#71767b]">Avg likes</p>
				</div>
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-2.5 py-2">
					<p class="text-base font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.avgViews)}</p>
					<p class="text-[11px] text-[#71767b]">Avg views</p>
				</div>
			</div>
		</section>
	{/if}

	{#if showSection('sentiment') && sentiment && tweetAgg.count > 0}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-labelledby="rail-sent-heading">
			<div class="px-3 py-2.5">
				<h2 id="rail-sent-heading" class="text-[15px] font-bold text-[#e7e9ea]">Sentiment</h2>
				<p class="text-[11px] leading-snug text-[#71767b]">
					Tone (English short text): −1 very negative → +1 very positive
				</p>
			</div>
			<div class="px-3 pb-2">
				<div class="flex h-2 w-full overflow-hidden rounded-full bg-[#2f3336]" role="img" aria-label="Tone mix">
					{#if sentiment.positivePercent > 0}
						<div class="bg-[#00ba7c]" style="width: {sentiment.positivePercent}%"></div>
					{/if}
					{#if sentiment.neutralPercent > 0}
						<div class="bg-[#536471]" style="width: {sentiment.neutralPercent}%"></div>
					{/if}
					{#if sentiment.negativePercent > 0}
						<div class="bg-[#f4212e]" style="width: {sentiment.negativePercent}%"></div>
					{/if}
				</div>
				<p class="mt-2 text-[12px] leading-snug text-[#e7e9ea]">
					{describeMeanCompound(sentiment.meanCompound)}
					<span class="text-[#71767b]">
						{' '}
						· based on {sentiment.scoredCount}
						{sentiment.scoredCount === 1 ? ' post' : ' posts'}
					</span>
				</p>
			</div>
		</section>
	{/if}

	{#if showSection('patterns') && insights}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-labelledby="rail-pat-heading">
			<div class="px-3 py-2.5">
				<h2 id="rail-pat-heading" class="text-[15px] font-bold text-[#e7e9ea]">Patterns</h2>
				<p class="text-[12px] text-[#71767b]">
					{insights.originalPercent}% original · {insights.repostPercent}% reposts
				</p>
			</div>
			<div class="grid grid-cols-2 gap-1.5 px-3 pb-2">
				<div class="rounded-lg border border-[#2f3336] bg-[#16181c] px-2 py-1.5">
					<p class="text-sm font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.medianLikes)}</p>
					<p class="text-[10px] text-[#71767b]">Med. likes</p>
				</div>
				<div class="rounded-lg border border-[#2f3336] bg-[#16181c] px-2 py-1.5">
					<p class="text-sm font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.p95Likes)}</p>
					<p class="text-[10px] text-[#71767b]">P95 likes</p>
				</div>
				<div class="rounded-lg border border-[#2f3336] bg-[#16181c] px-2 py-1.5">
					<p class="text-sm font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.medianViews)}</p>
					<p class="text-[10px] text-[#71767b]">Med. views</p>
				</div>
				<div class="rounded-lg border border-[#2f3336] bg-[#16181c] px-2 py-1.5">
					<p class="text-sm font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.p95Views)}</p>
					<p class="text-[10px] text-[#71767b]">P95 views</p>
				</div>
				<div class="rounded-lg border border-[#2f3336] bg-[#16181c] px-2 py-1.5">
					<p class="text-sm font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.medianChars)}</p>
					<p class="text-[10px] text-[#71767b]">Med. chars</p>
				</div>
				<div class="rounded-lg border border-[#2f3336] bg-[#16181c] px-2 py-1.5">
					<p class="text-sm font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.p95Chars)}</p>
					<p class="text-[10px] text-[#71767b]">P95 chars</p>
				</div>
			</div>
			<div class="border-t border-[#2f3336] px-3 py-2">
				<p class="mb-1.5 text-[11px] text-[#71767b]">
					Posts by hour (UTC) · peak {hourUtcLabel(insights.peakHourUtc)}
				</p>
				<div
					class="flex h-12 items-stretch gap-px overflow-x-auto rounded-lg border border-[#2f3336] bg-black px-0.5 py-0.5"
					role="img"
					aria-label="Posts by hour UTC"
				>
					{#each insights.hourBucketsUtc as count, h}
						{@const barPx = Math.max(2, Math.round((count / maxHourBucket) * 48))}
						<div
							class="group flex h-full min-w-[6px] flex-1 flex-col justify-end"
							title="{hourUtcLabel(h)}: {count}"
						>
							<div
								class="w-full min-h-[2px] rounded-sm bg-[#1d9bf0]/90"
								style="height: {barPx}px"
							></div>
						</div>
					{/each}
				</div>
			</div>
			{#if insights.topDomains.length > 0}
				<div class="border-t border-[#2f3336] px-3 py-2.5">
					<p class="mb-1.5 text-[11px] font-medium text-[#71767b]">Link domains</p>
					<div class="flex flex-wrap gap-2">
						{#each insights.topDomains.slice(0, 8) as { domain, count }}
							<span
								class="inline-flex items-center gap-1.5 rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-[11px] text-[#e7e9ea]"
							>
								<span class="min-w-0 truncate">{domain}</span>
								<span class="shrink-0 tabular-nums text-[#71767b]">×{count}</span>
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	{#if showSection('tags') && (tweetAgg.topHashtags.length > 0 || tweetAgg.topMentions.length > 0)}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-labelledby="rail-tags-heading">
			<div class="px-3 py-2.5">
				<h2 id="rail-tags-heading" class="text-[15px] font-bold text-[#e7e9ea]">In these posts</h2>
			</div>
			<div class="space-y-2 px-3 pb-3">
				{#if tweetAgg.topHashtags.length > 0}
					<div>
						<p class="mb-1 text-[11px] text-[#71767b]">Hashtags</p>
						<div class="flex flex-wrap gap-2">
							{#each tweetAgg.topHashtags as { tag, count }}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-[11px] text-[#e7e9ea]"
								>
									<span class="min-w-0 truncate">#{tag}</span>
									<span class="shrink-0 tabular-nums text-[#71767b]">×{count}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
				{#if tweetAgg.topMentions.length > 0}
					<div>
						<p class="mb-1 text-[11px] text-[#71767b]">Mentions</p>
						<div class="flex flex-wrap gap-2">
							{#each tweetAgg.topMentions as { handle, count }}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-[11px] text-[#e7e9ea]"
								>
									<span class="min-w-0 truncate">@{handle}</span>
									<span class="shrink-0 tabular-nums text-[#71767b]">×{count}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</section>
	{/if}
</div>
