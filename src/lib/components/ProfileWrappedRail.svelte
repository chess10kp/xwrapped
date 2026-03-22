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
		compact?: boolean;
		sections?: RailSection[] | null;
		storyMetricLayout?: boolean;
	} = $props();

	function showSection(id: RailSection): boolean {
		if (!sections?.length) {
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
		<section class="rail-card-engagement relative overflow-hidden rounded-2xl border border-white/[0.08]" aria-label="Engagement">
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute -top-[20%] -right-[15%] h-[60%] w-[50%] rounded-full bg-[#f91880]/[0.06] blur-[40px]"></div>
				<div class="absolute -bottom-[15%] -left-[10%] h-[50%] w-[45%] rounded-full bg-[#1d9bf0]/[0.05] blur-[35px]"></div>
			</div>
			<div class="relative grid gap-3 px-4 py-3.5 sm:gap-2 sm:px-3 sm:py-3">
				<div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 backdrop-blur-sm sm:px-3 sm:py-2.5">
					<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
						{describeTotalLikes(tweetAgg)}
					</p>
					{#if totalLikesComparison}
						<p class="mt-2 text-[16px] leading-snug text-[#71767b] sm:mt-1 sm:text-[14px]">
							{totalLikesComparison}
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 backdrop-blur-sm sm:px-3 sm:py-2.5">
					<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
						{describeAverageViews(tweetAgg)}
					</p>
					{#if avgViewsComparison}
						<p class="mt-2 text-[16px] leading-snug text-[#71767b] sm:mt-1 sm:text-[14px]">
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
				: 'overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]'}"
			aria-label="Total likes"
		>
			{#if storyMetricLayout}
				<div class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8">
					<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
						{formatCount(tweetAgg.totalLikes)}
					</p>
					<p class="mt-2 text-lg uppercase tracking-widest text-[#71767b]">Total Likes</p>
					<div class="my-5 h-px w-2/3 bg-white/[0.08]"></div>
					<p class="max-w-xs text-center text-lg leading-snug text-[#a0a8b0]">
						{describeTotalLikes(tweetAgg)}
					</p>
					{#if totalLikesComparison}
						<p class="mt-3 max-w-xs text-center text-base leading-snug text-[#71767b]">
							{totalLikesComparison}
						</p>
					{/if}
				</div>
			{:else}
				<div class="px-4 py-3.5 sm:px-3 sm:py-3">
					<div class="rounded-xl border border-white/[0.06] bg-[#16181c] px-4 py-3.5 sm:px-3 sm:py-2.5">
						<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
							{describeTotalLikes(tweetAgg)}
						</p>
						{#if totalLikesComparison}
							<p class="mt-2 text-[16px] leading-snug text-[#71767b] sm:mt-1 sm:text-[14px]">
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
				: 'overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]'}"
			aria-label="Average views"
		>
			{#if storyMetricLayout}
				<div class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8">
					<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
						{formatCount(tweetAgg.avgViews)}
					</p>
					<p class="mt-2 text-lg uppercase tracking-widest text-[#71767b]">Avg Views</p>
					<div class="my-5 h-px w-2/3 bg-white/[0.08]"></div>
					<p class="max-w-xs text-center text-lg leading-snug text-[#a0a8b0]">
						{describeAverageViews(tweetAgg)}
					</p>
					{#if avgViewsComparison}
						<p class="mt-3 max-w-xs text-center text-base leading-snug text-[#71767b]">
							{avgViewsComparison}
						</p>
					{/if}
				</div>
			{:else}
				<div class="px-4 py-3.5 sm:px-3 sm:py-3">
					<div class="rounded-xl border border-white/[0.06] bg-[#16181c] px-4 py-3.5 sm:px-3 sm:py-2.5">
						<p class="text-[19px] font-semibold leading-snug text-[#e7e9ea] sm:text-[16px] sm:font-normal">
							{describeAverageViews(tweetAgg)}
						</p>
						{#if avgViewsComparison}
							<p class="mt-2 text-[16px] leading-snug text-[#71767b] sm:mt-1 sm:text-[14px]">
								{avgViewsComparison}
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	{#if showSection('bestTweet') && result.analysis?.best_tweet}
		<section class="rail-card-best-tweet relative overflow-hidden rounded-2xl border border-white/[0.08]" aria-labelledby="rail-besttweet-heading">
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute -top-[25%] left-[20%] h-[50%] w-[50%] rounded-full bg-[#1d9bf0]/[0.05] blur-[35px]"></div>
			</div>
			<div class="relative px-3 py-2.5">
				<h2 id="rail-besttweet-heading" class="text-[18px] font-bold text-[#e7e9ea]">Best Tweet</h2>
			</div>
			<ProfileBestTweetCard result={result} embedded />
		</section>
	{/if}

	{#if showSection('style') && result.analysis?.posting_style}
		<section class="rail-card-style relative overflow-hidden rounded-2xl border border-white/[0.08]" aria-label="Style">
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute -bottom-[20%] -right-[15%] h-[55%] w-[50%] rounded-full bg-[#8b5cf6]/[0.05] blur-[35px]"></div>
			</div>
			<div class="relative px-3 py-3">
				<p class="text-[18px] leading-relaxed text-[#e7e9ea]">{result.analysis.posting_style}</p>
			</div>
		</section>
	{/if}

	{#if showSection('tags') && (tweetAgg.topHashtags.length > 0 || tweetAgg.topMentions.length > 0)}
		<section
			class="rail-card-tags relative overflow-hidden rounded-2xl border border-white/[0.08]"
			aria-label="Hashtags and mentions in these posts"
		>
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute -top-[15%] -left-[10%] h-[45%] w-[40%] rounded-full bg-[#06b6d4]/[0.04] blur-[30px]"></div>
				<div class="absolute -bottom-[10%] -right-[10%] h-[40%] w-[35%] rounded-full bg-[#f91880]/[0.03] blur-[25px]"></div>
			</div>
			<div class="relative space-y-2 px-3 py-3">
				{#if tweetAgg.topHashtags.length > 0}
					<div>
						<p class="mb-1 text-[13px] text-[#71767b]">Hashtags</p>
						<div class="flex flex-wrap gap-2">
							{#each tweetAgg.topHashtags as { tag, count }}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[13px] text-[#e7e9ea]"
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
								class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[13px] text-[#e7e9ea]"
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
		<section class="rail-card-topics relative overflow-hidden rounded-2xl border border-white/[0.08]" aria-labelledby="rail-top-topics-heading">
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute -top-[20%] right-[10%] h-[55%] w-[50%] rounded-full bg-[#1d9bf0]/[0.06] blur-[35px]"></div>
			</div>
			<div class="relative px-3 py-2.5">
				<h2 id="rail-top-topics-heading" class="text-[18px] font-bold text-[#e7e9ea]">Top Topics</h2>
			</div>
			<div class="relative flex flex-wrap gap-2 px-3 pb-3">
				{#each result.analysis.top_topics as topic}
					<span class="rounded-full border border-[#1d9bf0]/20 bg-[#1d9bf0]/[0.1] px-3 py-1 text-lg font-medium text-[#1d9bf0]">#{topic}</span>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.rail-card-engagement {
		background: linear-gradient(145deg, #0c0a10 0%, #0a0a0a 50%, #0a0c12 100%);
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.rail-card-engagement:hover {
		border-color: rgba(249, 24, 128, 0.12);
		box-shadow: 0 4px 20px -6px rgba(249, 24, 128, 0.08);
	}

	.rail-card-best-tweet {
		background: linear-gradient(145deg, #0a0c14 0%, #0a0a0a 50%, #0c0a10 100%);
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.rail-card-best-tweet:hover {
		border-color: rgba(29, 155, 240, 0.12);
		box-shadow: 0 4px 20px -6px rgba(29, 155, 240, 0.08);
	}

	.rail-card-style {
		background: linear-gradient(145deg, #0c0a14 0%, #0a0a0a 50%, #0a0810 100%);
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.rail-card-style:hover {
		border-color: rgba(139, 92, 246, 0.12);
		box-shadow: 0 4px 20px -6px rgba(139, 92, 246, 0.08);
	}

	.rail-card-tags {
		background: linear-gradient(145deg, #080c10 0%, #0a0a0a 50%, #0c0810 100%);
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.rail-card-tags:hover {
		border-color: rgba(6, 182, 212, 0.12);
		box-shadow: 0 4px 20px -6px rgba(6, 182, 212, 0.08);
	}

	.rail-card-topics {
		background: linear-gradient(145deg, #0a0c14 0%, #0a0a0a 50%, #080c14 100%);
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.rail-card-topics:hover {
		border-color: rgba(29, 155, 240, 0.12);
		box-shadow: 0 4px 20px -6px rgba(29, 155, 240, 0.08);
	}
</style>
