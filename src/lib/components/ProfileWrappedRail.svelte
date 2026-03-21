<script lang="ts">
	import ProfileBestTweetCard from '$lib/components/ProfileBestTweetCard.svelte';
	import { aggregateTweetStats, formatCount } from '$lib/tweet-stats';
	import type { WrappedResult } from '$lib/server/types';
	import { describeAverageViews, describeTotalLikes, normalizeComparison } from '$lib/wrapped-copy';

	type RailSection =
		| 'bestTweet'
		| 'topTopics'
		| 'style'
		| 'engagement'
		| 'totalLikes'
		| 'avgViews'
		| 'tags';

	let {
		result,
		padded = false,
		compact = false,
		sections = null,
		storyMetricLayout = false
	}: {
		result: WrappedResult;
		padded?: boolean;
		/** Tighter vertical gap between stacked sections (e.g. mobile story panels). */
		compact?: boolean;
		/** If set, only these sections render. If null, all sections render. */
		sections?: RailSection[] | null;
		/** Mobile full-screen slides: large fact at top, comparison as small subtitle lower-middle. */
		storyMetricLayout?: boolean;
	} = $props();

	function showSection(id: RailSection): boolean {
		if (!sections?.length) {
			// Default rail: combined engagement only (not split totalLikes/avgViews).
			if (id === 'totalLikes' || id === 'avgViews') return false;
			return true;
		}
		return sections.includes(id);
	}

	function showEngagementCombined(): boolean {
		if (!sections?.length) return true;
		return sections.includes('engagement');
	}

	const tweetAgg = $derived(aggregateTweetStats(result.tweets));
	const totalLikesComparison = $derived(
		normalizeComparison(result.analysis?.metric_comparisons?.total_likes)
	);
	const avgViewsComparison = $derived(normalizeComparison(result.analysis?.metric_comparisons?.avg_views));

	const wrapClass = $derived(padded ? 'px-4' : '');
	const gapClass = $derived(compact ? 'gap-2' : 'gap-4');
	const rootStoryClass = $derived(storyMetricLayout ? 'min-h-0 flex-1 flex flex-col' : '');
</script>

<div class="flex flex-col {gapClass} {wrapClass} {rootStoryClass}">
	{#if showEngagementCombined() && tweetAgg.count > 0}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-label="Engagement">
			<div class="grid gap-3 px-4 py-3 pb-4 sm:gap-2 sm:px-3 sm:py-2.5 sm:pb-3">
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-2.5">
					<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
						{describeTotalLikes(tweetAgg)}
					</p>
					{#if totalLikesComparison}
						<p class="mt-2 text-[16px] leading-snug text-[#8b98a5] sm:mt-1 sm:text-[14px]">
							{totalLikesComparison}
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-2.5">
					<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
						{describeAverageViews(tweetAgg)}
					</p>
					{#if avgViewsComparison}
						<p class="mt-2 text-[16px] leading-snug text-[#8b98a5] sm:mt-1 sm:text-[14px]">
							{avgViewsComparison}
						</p>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	{#if showSection('totalLikes') && tweetAgg.count > 0}
		<section
			class="{storyMetricLayout
				? 'flex min-h-0 flex-1 flex-col border-0 bg-transparent p-0'
				: 'overflow-hidden rounded-2xl border border-[#2f3336] bg-black'}"
			aria-label="Total likes"
		>
			{#if storyMetricLayout}
				<div
					class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8"
				>
					<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
						{formatCount(tweetAgg.totalLikes)}
					</p>
					<p class="mt-2 text-lg uppercase tracking-widest text-[#a0aab4]">Total Likes</p>
					<div class="my-4 h-px w-3/4 bg-white/10"></div>
					<p class="max-w-xs text-center text-lg italic leading-snug text-[#b8c0c9]">
						{describeTotalLikes(tweetAgg)}
					</p>
					{#if totalLikesComparison}
						<p class="mt-3 max-w-xs text-center text-base leading-snug text-[#8b98a5]">
							{totalLikesComparison}
						</p>
					{/if}
				</div>
			{:else}
				<div class="px-4 py-3 pb-4 sm:px-3 sm:py-2.5 sm:pb-3">
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-2.5">
						<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
							{describeTotalLikes(tweetAgg)}
						</p>
						{#if totalLikesComparison}
							<p class="mt-2 text-[16px] leading-snug text-[#8b98a5] sm:mt-1 sm:text-[14px]">
								{totalLikesComparison}
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	{#if showSection('avgViews') && tweetAgg.count > 0}
		<section
			class="{storyMetricLayout
				? 'flex min-h-0 flex-1 flex-col border-0 bg-transparent p-0'
				: 'overflow-hidden rounded-2xl border border-[#2f3336] bg-black'}"
			aria-label="Average views"
		>
			{#if storyMetricLayout}
				<div
					class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8"
				>
					<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
						{formatCount(tweetAgg.avgViews)}
					</p>
					<p class="mt-2 text-lg uppercase tracking-widest text-[#a0aab4]">Avg Views</p>
					<div class="my-4 h-px w-3/4 bg-white/10"></div>
					<p class="max-w-xs text-center text-lg italic leading-snug text-[#b8c0c9]">
						{describeAverageViews(tweetAgg)}
					</p>
					{#if avgViewsComparison}
						<p class="mt-3 max-w-xs text-center text-base leading-snug text-[#8b98a5]">
							{avgViewsComparison}
						</p>
					{/if}
				</div>
			{:else}
				<div class="px-4 py-3 pb-4 sm:px-3 sm:py-2.5 sm:pb-3">
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-2.5">
						<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
							{describeAverageViews(tweetAgg)}
						</p>
						{#if avgViewsComparison}
							<p class="mt-2 text-[16px] leading-snug text-[#8b98a5] sm:mt-1 sm:text-[14px]">
								{avgViewsComparison}
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	{#if showSection('bestTweet') && result.analysis?.best_tweet}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-labelledby="rail-besttweet-heading">
			<div class="px-3 py-2.5">
				<h2 id="rail-besttweet-heading" class="text-[18px] font-bold text-[#e7e9ea]">Best Tweet</h2>
			</div>
			<ProfileBestTweetCard result={result} embedded />
		</section>
	{/if}

	{#if showSection('style') && result.analysis?.posting_style}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-label="Style">
			<div class="px-3 py-3">
				<p class="text-[18px] leading-relaxed text-[#e7e9ea]">{result.analysis.posting_style}</p>
			</div>
		</section>
	{/if}

	{#if showSection('tags') && (tweetAgg.topHashtags.length > 0 || tweetAgg.topMentions.length > 0)}
		<section
			class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black"
			aria-label="Hashtags and mentions in these posts"
		>
			<div class="space-y-2 px-3 py-3">
				{#if tweetAgg.topHashtags.length > 0}
					<div>
						<p class="mb-1 text-[13px] text-[#71767b]">Hashtags</p>
						<div class="flex flex-wrap gap-2">
							{#each tweetAgg.topHashtags as { tag, count }}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-[13px] text-[#e7e9ea]"
								>
									<span class="min-w-0 truncate">#{tag}</span>
									<span class="shrink-0 tabular-nums text-[#71767b]">×{count}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
				{#if tweetAgg.topMentions.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each tweetAgg.topMentions as { handle, count }}
							<span
								class="inline-flex items-center gap-1.5 rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-[13px] text-[#e7e9ea]"
							>
								<span class="min-w-0 truncate">@{handle}</span>
								<span class="shrink-0 tabular-nums text-[#71767b]">×{count}</span>
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	{#if showSection('topTopics') && result.analysis?.top_topics && result.analysis.top_topics.length > 0}
		<section class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black" aria-labelledby="rail-top-topics-heading">
			<div class="px-3 py-2.5">
				<h2 id="rail-top-topics-heading" class="text-[18px] font-bold text-[#e7e9ea]">Top Topics</h2>
			</div>
			<div class="flex flex-wrap gap-2 px-3 pb-3">
				{#each result.analysis.top_topics as topic}
					<span class="rounded-full bg-[#1d9bf0]/10 px-3 py-1 text-lg font-medium text-[#1d9bf0]">#{topic}</span>
				{/each}
			</div>
		</section>
	{/if}
</div>
