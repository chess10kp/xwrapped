<script lang="ts">
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import {
		aggregateTweetStats,
		formatCount,
		matchTweetForBestText,
		normTweetText
	} from '$lib/tweet-stats';
	import { computeTweetInsights } from '$lib/tweet-insights';
	import { computeSentimentSummary } from '$lib/tweet-sentiment';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const tweetAgg = $derived(aggregateTweetStats(data.result.tweets));
	const insights = $derived(
		computeTweetInsights(data.result.tweets, {
			kinds: data.tweetKinds ?? undefined
		})
	);
	const sentiment = $derived(
		computeSentimentSummary(data.result.tweets, {
			kinds: data.tweetKinds ?? undefined
		})
	);
	const maxHourBucket = $derived(
		insights ? Math.max(1, ...insights.hourBucketsUtc) : 1
	);
	const matchedBestTweet = $derived(
		matchTweetForBestText(data.result.tweets, data.result.analysis?.best_tweet)
	);
	const showSeparateBiggestHit = $derived.by(() => {
		const hit = tweetAgg.biggestHit;
		if (!hit) return false;
		const m = matchedBestTweet;
		if (!m) return true;
		return normTweetText(hit.text) !== normTweetText(m.text);
	});

	function tweetCardDate(d: Date | string | undefined): string {
		const date = d ? new Date(d) : new Date();
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function tweetCardDateIso(d: Date | string | undefined): string | undefined {
		const date = d ? new Date(d) : new Date();
		if (Number.isNaN(date.getTime())) return undefined;
		return date.toISOString();
	}

	function shareOnX() {
		const shareText = `just got my X Wrapped 🎁 ${window.location.href} — what's your archetype?`;
		window.open(
			`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
			'_blank'
		);
	}

	async function downloadVideo() {
		if (!data.result.videoUrl) return;

		const res = await fetch(data.result.videoUrl);
		const blob = await res.blob();
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `xwrapped-${data.result.handle}.mp4`;
		a.click();
	}

	function profileJoined(d: string | undefined): string {
		if (!d) return '';
		const date = new Date(d);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
	}

	const ogDescription = $derived.by(() => {
		const a = data.result.analysis;
		const arch = a?.archetype ?? 'X Wrapped';
		const tone = a?.tone ? ` — ${a.tone}` : '';
		const snippet = (a?.vibe_summary ?? a?.archetype_description ?? '').slice(0, 140);
		return `Archetype: ${arch}${tone}. ${snippet}`.trim();
	});

	function hourUtcLabel(h: number): string {
		return `${String(h).padStart(2, '0')}:00 UTC`;
	}

	function clipTweetSnippet(s: string, max = 200): string {
		const t = s.trim();
		if (t.length <= max) return t;
		return `${t.slice(0, max)}…`;
	}

	function formatCompound(c: number): string {
		const sign = c > 0 ? '+' : '';
		return `${sign}${c.toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>@{data.result.handle}'s X Wrapped</title>
	<meta property="og:title" content="@{data.result.handle}'s X Wrapped" />
	<meta property="og:description" content={ogDescription} />
	<meta property="og:type" content="video.other" />
	<meta property="og:video" content={data.result.videoUrl || ''} />
	<meta name="twitter:card" content="player" />
</svelte:head>

<div class="min-h-screen pb-28">
	<div>

		<!-- Profile header -->
		<div class="border-b border-[#2f3336] px-4 py-6">
			<div class="flex items-center gap-4">
				<ProfileAvatar
					pictureUrl={data.result.profile?.profilePicture}
					handle={data.result.handle}
				/>
				<div class="min-w-0 flex-1">
					<h1 class="text-xl font-extrabold text-[#e7e9ea]">@{data.result.handle}</h1>
					{#if data.result.profile?.name?.trim()}
						<p class="text-sm text-[#e7e9ea]">{data.result.profile.name.trim()}</p>
					{/if}
					<p class="text-[#1d9bf0]">{data.result.analysis?.archetype ?? '—'}</p>
					<p class="mt-1 text-sm text-[#71767b]">{data.result.analysis?.archetype_description ?? ''}</p>
					{#if data.result.profile?.bio?.trim()}
						<p class="mt-2 text-[15px] leading-snug text-[#e7e9ea]">{data.result.profile.bio.trim()}</p>
					{/if}
					{#if data.result.profile}
						<div
							class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#71767b]"
							aria-label="Account stats"
						>
							<span
								><span class="font-semibold text-[#e7e9ea]">{formatCount(data.result.profile.followers)}</span> Followers</span
							>
							<span
								><span class="font-semibold text-[#e7e9ea]">{formatCount(data.result.profile.following)}</span> Following</span
							>
							<span
								><span class="font-semibold text-[#e7e9ea]">{formatCount(data.result.profile.tweetsCount)}</span> Posts</span
							>
							{#if profileJoined(data.result.profile.joinedAt)}
								<span
									>Joined <time datetime={data.result.profile.joinedAt}>{profileJoined(data.result.profile.joinedAt)}</time></span
								>
							{/if}
						</div>
					{/if}
					{#if data.result.webSearchContext}
						<details class="mt-3 rounded-lg border border-[#2f3336] bg-[#16181c] px-3 py-2 text-left">
							<summary class="cursor-pointer text-xs text-[#71767b] marker:text-[#71767b]">
								Public web sources (Exa)
							</summary>
							<p class="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#e7e9ea]">
								{data.result.webSearchContext}
							</p>
						</details>
					{/if}
				</div>
			</div>
			{#if data.archiveMeta}
				<div
					class="mt-4 rounded-lg border border-[#1d9bf0]/25 bg-[#1d9bf0]/5 px-3 py-2.5 text-[13px] leading-snug text-[#e7e9ea]"
				>
					<span class="font-semibold text-[#1d9bf0]">Imported archive</span>
					Engagement, hashtags, and mentions below use
					<span class="tabular-nums font-medium">{data.archiveMeta.tweetCount}</span>
					posts from
					<span class="font-mono text-[12px] text-[#71767b]">{data.archiveMeta.sourceFile}</span>. The written summary
					and video used the scrape from when this wrap was generated.
				</div>
			{/if}
		</div>

		<!-- Video -->
		{#if data.result.videoUrl}
			<div class="border-b border-[#2f3336] p-4">
				<div class="overflow-hidden rounded-2xl border border-[#2f3336]">
					<video src={data.result.videoUrl} controls autoplay class="aspect-video w-full object-cover">
						<track kind="captions" />
					</video>
				</div>
			</div>
		{/if}

		<!-- Engagement from sample -->
		{#if tweetAgg.count > 0}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">
					Engagement{data.archiveMeta ? ' (your archive)' : ' (this sample)'}
				</p>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.totalLikes)}</p>
						<p class="text-xs text-[#71767b]">Total likes</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.totalViews)}</p>
						<p class="text-xs text-[#71767b]">Total views</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.avgLikes)}</p>
						<p class="text-xs text-[#71767b]">Avg likes / post</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(tweetAgg.avgViews)}</p>
						<p class="text-xs text-[#71767b]">Avg views / post</p>
					</div>
				</div>
			</div>
			{#if sentiment}
				<div class="border-b border-[#2f3336] px-4 py-5">
					<p class="mb-1 text-xs font-medium uppercase tracking-wider text-[#71767b]">Sentiment (NLP)</p>
					<p class="mb-3 text-[12px] leading-snug text-[#71767b]">
						VADER scores (English-oriented). Positive / neutral / negative use the usual ±0.05 compound cutoffs.
						{#if sentiment.excludeReposts && sentiment.skippedReposts > 0}
							<span class="text-[#536471]">
								· {sentiment.skippedReposts} repost{sentiment.skippedReposts === 1 ? '' : 's'} excluded.
							</span>
						{/if}
					</p>
					<div class="mb-4 flex h-3 w-full max-w-md overflow-hidden rounded-full bg-[#2f3336]" role="img" aria-label="Share of positive, neutral, and negative posts by VADER compound score">
						{#if sentiment.positivePercent > 0}
							<div
								class="min-h-[2px] bg-[#00ba7c]"
								style="width: {sentiment.positivePercent}%"
								title="Positive {sentiment.positivePercent}%"
							></div>
						{/if}
						{#if sentiment.neutralPercent > 0}
							<div
								class="min-h-[2px] bg-[#536471]"
								style="width: {sentiment.neutralPercent}%"
								title="Neutral {sentiment.neutralPercent}%"
							></div>
						{/if}
						{#if sentiment.negativePercent > 0}
							<div
								class="min-h-[2px] bg-[#f4212e]"
								style="width: {sentiment.negativePercent}%"
								title="Negative {sentiment.negativePercent}%"
							></div>
						{/if}
					</div>
					<div class="mb-4 grid grid-cols-3 gap-2 sm:max-w-md">
						<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-2.5">
							<p class="text-lg font-bold tabular-nums text-[#00ba7c]">{sentiment.positivePercent}%</p>
							<p class="text-xs text-[#71767b]">Positive</p>
						</div>
						<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-2.5">
							<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{sentiment.neutralPercent}%</p>
							<p class="text-xs text-[#71767b]">Neutral</p>
						</div>
						<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-2.5">
							<p class="text-lg font-bold tabular-nums text-[#f4212e]">{sentiment.negativePercent}%</p>
							<p class="text-xs text-[#71767b]">Negative</p>
						</div>
					</div>
					<p class="mb-4 text-[15px] text-[#e7e9ea]">
						<span class="text-[#71767b]">Mean compound:</span>
						<span class="ml-1 font-mono font-semibold tabular-nums">{formatCompound(sentiment.meanCompound)}</span>
						<span class="text-[#71767b]"> · {sentiment.scoredCount} posts scored</span>
					</p>
					<div class="grid gap-3 sm:grid-cols-2">
						{#if sentiment.mostPositive}
							<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
								<p class="text-xs font-medium text-[#00ba7c]">Sweetest · {formatCompound(sentiment.mostPositive.compound)}</p>
								<p class="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[14px] leading-snug text-[#e7e9ea]">
									{clipTweetSnippet(sentiment.mostPositive.tweet.text)}
								</p>
							</div>
						{/if}
						{#if sentiment.mostNegative}
							<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
								<p class="text-xs font-medium text-[#f4212e]">Saltiest · {formatCompound(sentiment.mostNegative.compound)}</p>
								<p class="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[14px] leading-snug text-[#e7e9ea]">
									{clipTweetSnippet(sentiment.mostNegative.tweet.text)}
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-1 text-xs font-medium uppercase tracking-wider text-[#71767b]">Post data</p>
				<p class="text-[15px] leading-relaxed text-[#71767b]">
					No posts were loaded for this wrap, so totals and hashtag/mention breakdowns are empty. Generate again with
					live scraping enabled, or import a tweet export into MongoDB
					<code class="rounded bg-[#16181c] px-1 font-mono text-[12px] text-[#e7e9ea]">tweet_archives</code>
					for this handle (see project import script).
				</p>
			</div>
		{/if}

		{#if insights}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Patterns</p>

				<div class="mb-5 rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
					<p class="text-xs text-[#71767b]">Original vs repost</p>
					<p class="mt-1 text-[15px] text-[#e7e9ea]">
						<span class="font-semibold tabular-nums">{insights.originalPercent}%</span>
						original ·
						<span class="font-semibold tabular-nums">{insights.repostPercent}%</span>
						reposts
						<span class="text-[#71767b]">({insights.count} posts)</span>
					</p>
					<p class="mt-1 text-[12px] text-[#71767b]">
						{#if insights.kindSource === 'archive'}
							From your export labels.
						{:else}
							Heuristic (lines starting with <code class="font-mono text-[11px]">RT @</code>); import an archive for exact repost counts.
						{/if}
					</p>
				</div>

				<div class="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.medianLikes)}</p>
						<p class="text-xs text-[#71767b]">Median likes</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.p95Likes)}</p>
						<p class="text-xs text-[#71767b]">P95 likes</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.medianViews)}</p>
						<p class="text-xs text-[#71767b]">Median views</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.p95Views)}</p>
						<p class="text-xs text-[#71767b]">P95 views</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.medianChars)}</p>
						<p class="text-xs text-[#71767b]">Median chars</p>
					</div>
					<div class="rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-3">
						<p class="text-lg font-bold tabular-nums text-[#e7e9ea]">{formatCount(insights.p95Chars)}</p>
						<p class="text-xs text-[#71767b]">P95 chars</p>
					</div>
				</div>

				<div class="mb-5">
					<p class="mb-2 text-xs text-[#71767b]">
						Posts by hour <span class="text-[#536471]">(UTC)</span> · busiest
						<span class="font-medium text-[#e7e9ea]">{hourUtcLabel(insights.peakHourUtc)}</span>
					</p>
					<div
						class="flex h-14 items-end gap-px overflow-x-auto rounded-lg border border-[#2f3336] bg-black px-1 pb-1 pt-2"
						role="img"
						aria-label="Histogram of post counts by hour UTC"
					>
						{#each insights.hourBucketsUtc as count, h}
							<div
								class="group flex min-w-[8px] flex-1 flex-col justify-end"
								title="{hourUtcLabel(h)}: {count} posts"
							>
								<div
									class="w-full min-h-[2px] rounded-sm bg-[#1d9bf0]/90 transition-colors group-hover:bg-[#1d9bf0]"
									style="height: {Math.max(2, (count / maxHourBucket) * 100)}%"
								></div>
							</div>
						{/each}
					</div>
					<p class="mt-1 font-mono text-[10px] text-[#536471]">
						00–23h · max bar = highest bucket
					</p>
				</div>

				{#if insights.topDomains.length > 0}
					<div>
						<p class="mb-2 text-xs text-[#71767b]">Top external link domains</p>
						<div class="flex flex-wrap gap-2">
							{#each insights.topDomains as { domain, count }}
								<span
									class="rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-xs text-[#e7e9ea]"
								>
									{domain}
									<span class="text-[#71767b]">×{count}</span>
								</span>
							{/each}
						</div>
						<p class="mt-2 text-[11px] leading-snug text-[#536471]">
							x.com / t.co / Twitter CDNs excluded.
						</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Stats grid -->
		<div class="border-b border-[#2f3336] px-4 py-5">
			<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Stats</p>
			<div class="grid grid-cols-3 gap-4">
				<div class="text-center">
					<p class="text-2xl font-bold text-[#e7e9ea]">{data.result.tweets?.length || 0}</p>
					<p class="text-xs text-[#71767b]">Tweets Analysed</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-[#e7e9ea]">{data.result.analysis?.peak_hour ?? '—'}</p>
					<p class="text-xs text-[#71767b]">Peak Hour</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-[#e7e9ea]">{data.result.analysis?.tone ?? '—'}</p>
					<p class="text-xs text-[#71767b]">Tone</p>
				</div>
			</div>
		</div>

		{#if data.result.analysis?.posting_style || data.result.analysis?.colour_mood}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Style</p>
				<div class="space-y-3">
					{#if data.result.analysis.posting_style}
						<div>
							<p class="text-xs text-[#71767b]">How you post</p>
							<p class="mt-0.5 text-[15px] leading-relaxed text-[#e7e9ea]">{data.result.analysis.posting_style}</p>
						</div>
					{/if}
					{#if data.result.analysis.colour_mood}
						<div>
							<p class="text-xs text-[#71767b]">Visual vibe</p>
							<p class="mt-0.5 text-[15px] leading-relaxed text-[#e7e9ea]">{data.result.analysis.colour_mood}</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Topics -->
		<div class="border-b border-[#2f3336] px-4 py-5">
			<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Top Topics</p>
			<div class="flex flex-wrap gap-2">
				{#each data.result.analysis?.top_topics || [] as topic}
					<span class="rounded-full bg-[#1d9bf0]/10 px-3 py-1 text-sm font-medium text-[#1d9bf0]">#{topic}</span>
				{/each}
			</div>
		</div>

		{#if tweetAgg.topHashtags.length > 0 || tweetAgg.topMentions.length > 0}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">From your sample</p>
				{#if tweetAgg.topHashtags.length > 0}
					<p class="mb-1.5 text-xs text-[#71767b]">Hashtags</p>
					<div class="mb-4 flex flex-wrap gap-2">
						{#each tweetAgg.topHashtags as { tag, count }}
							<span
								class="rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-xs text-[#e7e9ea]"
								>#{tag} <span class="text-[#71767b]">×{count}</span></span
							>
						{/each}
					</div>
				{/if}
				{#if tweetAgg.topMentions.length > 0}
					<p class="mb-1.5 text-xs text-[#71767b]">Mentions</p>
					<div class="flex flex-wrap gap-2">
						{#each tweetAgg.topMentions as { handle, count }}
							<span
								class="rounded-full border border-[#2f3336] bg-[#16181c] px-2.5 py-1 text-xs text-[#e7e9ea]"
								>@{handle} <span class="text-[#71767b]">×{count}</span></span
							>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if showSeparateBiggestHit && tweetAgg.biggestHit}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Most liked in sample</p>
				<div class="rounded-xl border border-[#2f3336] bg-[#16181c] p-3">
					<p class="text-[13px] font-semibold text-[#1d9bf0]">{formatCount(tweetAgg.biggestHit.likeCount)} likes</p>
					<p class="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[15px] leading-snug text-[#e7e9ea]">
						{tweetAgg.biggestHit.text.length > 220
							? `${tweetAgg.biggestHit.text.slice(0, 220)}…`
							: tweetAgg.biggestHit.text}
					</p>
				</div>
			</div>
		{/if}

		<!-- Best Tweet (X / Twitter post layout) -->
		{#if data.result.analysis?.best_tweet}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Best Tweet</p>

				<article
					class="border border-[#2f3336] bg-black transition-colors hover:bg-[#080808]"
					aria-label="Highlighted post"
				>
					<div class="flex gap-3 px-4 pb-3 pt-3">
						<div class="shrink-0 pt-0.5">
							<ProfileAvatar
								pictureUrl={data.result.profile?.profilePicture}
								handle={data.result.handle}
								sizeClass="h-10 w-10"
								textClass="text-lg"
							/>
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 text-[15px] leading-5">
									<div class="flex flex-wrap items-center gap-x-1">
										<span class="truncate font-bold text-[#e7e9ea]">
											{data.result.profile?.name?.trim() || data.result.handle}
										</span>
										{#if data.result.profile?.isBlueVerified}
											<span
												class="inline-flex shrink-0 text-[#1d9bf0]"
												title="Verified account"
												aria-label="Verified account"
											>
												<svg class="h-[1.1em] w-[1.1em]" viewBox="0 0 22 22" aria-hidden="true">
													<path
														fill="currentColor"
														d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646-.017-1.273.212-1.813.568s-.972.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14s-1.21.436-1.68.883c-.445.47-.749 1.055-.878 1.688-.13.633-.082 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.816.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.226.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.568s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.896.445-.47.749-1.055.878-1.688.13-.633.083-1.29-.141-1.895.587-.274 1.088-.705 1.444-1.246.356-.54.555-1.17.574-1.816zM9.662 14.85l-3.429-3.428 1.293-1.292 2.072 2.072 4.26-4.26 1.293 1.286-5.489 5.622z"
													/>
												</svg>
											</span>
										{/if}
									</div>
									<p class="truncate text-[15px] text-[#71767b]">
										@{data.result.handle}
										{#if tweetCardDate(matchedBestTweet?.createdAt ?? data.result.createdAt) && tweetCardDateIso(matchedBestTweet?.createdAt ?? data.result.createdAt)}
											<span class="select-none"> · </span>
											<time datetime={tweetCardDateIso(matchedBestTweet?.createdAt ?? data.result.createdAt)}>
												{tweetCardDate(matchedBestTweet?.createdAt ?? data.result.createdAt)}
											</time>
										{/if}
									</p>
								</div>

								<button
									type="button"
									class="-mr-1 rounded-full p-1.5 text-[#71767b] transition-colors hover:bg-[#181919] hover:text-[#1d9bf0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0]"
									aria-label="More"
								>
									<svg class="h-[1.15em] w-[1.15em]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
										<path
											d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
										/>
									</svg>
								</button>
							</div>

							<div
								class="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-[#e7e9ea]"
							>
								{data.result.analysis.best_tweet}
							</div>

							<!-- Action row (X-style: icon + count) -->
							<div
								class="mt-3 flex max-w-md flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[13px] text-[#71767b] [-webkit-tap-highlight-color:transparent] sm:max-w-[425px]"
							>
								<button
									type="button"
									class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#1d9bf0]"
									aria-label="Replies"
								>
									<span
										class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#1d9bf0]/10"
									>
										<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
											<path
												d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.006-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.59-.88 2.571-2.55 2.571-4.48 0-2.9-2.35-5.25-5.25-5.25H9.75z"
												fill="currentColor"
											/>
										</svg>
									</span>
									<span class="tabular-nums">{matchedBestTweet ? formatCount(matchedBestTweet.replyCount) : '—'}</span>
								</button>

								<button
									type="button"
									class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#00ba7c]"
									aria-label="Reposts"
								>
									<span
										class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#00ba7c]/10"
									>
										<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path
												d="M4.75 3.79l4.503 4.75-1.526 1.453L6 7.234V16.5h2V20H2v-3.5h2V6.234L1.25 9.992.22 8.72 4.75 3.79zm14.5 0l4.53 4.932-1.03 1.272-1.75-1.758V16.5h2V20h-6v-3.5h2V7.234l-1.727 1.758-1.527-1.453 4.503-4.75z"
												fill="currentColor"
											/>
										</svg>
									</span>
									<span class="tabular-nums">{matchedBestTweet ? formatCount(matchedBestTweet.retweetCount) : '—'}</span>
								</button>

								<button
									type="button"
									class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#f91880]"
									aria-label="Likes"
								>
									<span
										class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#f91880]/10"
									>
										<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path
												d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16-.75-1.04-1.713-1.7-2.89-1.7-1.861 0-3.371 1.507-3.371 3.366 0 3.225 3.41 6.432 6.087 8.55.192.154.437.237.683.237.245 0 .49-.083.683-.237 2.677-2.118 6.087-5.325 6.087-8.55C20 7.01 18.542 5.5 16.697 5.5zm-1.619 10.909c-.787-.74-1.509-1.477-2.164-2.206-.655.729-1.377 1.465-2.164 2.206C10.627 16.061 7 12.855 7 9.766 7 8.34 8.114 7.25 9.679 7.25c.965 0 1.809.586 2.31 1.432l.679 1.19.679-1.19c.5-.846 1.345-1.432 2.31-1.432C17.886 7.25 19 8.34 19 9.766c0 3.089-3.627 6.295-5.922 8.643z"
												fill="currentColor"
											/>
										</svg>
									</span>
									<span class="tabular-nums">{matchedBestTweet ? formatCount(matchedBestTweet.likeCount) : '—'}</span>
								</button>

								<button
									type="button"
									class="group flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 transition-colors hover:text-[#1d9bf0]"
									aria-label="Views"
								>
									<span
										class="flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors group-hover:bg-[#1d9bf0]/10"
									>
										<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path
												d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-4h2v4h-2z"
												fill="currentColor"
											/>
										</svg>
									</span>
									<span class="tabular-nums"
										>{matchedBestTweet && matchedBestTweet.viewCount > 0
											? formatCount(matchedBestTweet.viewCount)
											: matchedBestTweet
												? '0'
												: '—'}</span
									>
								</button>

								<div class="ml-auto flex items-center gap-0.5">
									<button
										type="button"
										class="rounded-full p-2 text-[#71767b] transition-colors hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]"
										aria-label="Bookmark"
									>
										<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path
												d="M4 4.5A2.5 2.5 0 016.5 2H18a2 2 0 012 2v17.5l-8-4-8 4V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.12l6-3 6 3V4.5a.5.5 0 00-.5-.5H6.5z"
											/>
										</svg>
									</button>
									<button
										type="button"
										class="rounded-full p-2 text-[#71767b] transition-colors hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]"
										aria-label="Share post"
									>
										<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path
												d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15v4c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4h2v4h14v-4h2z"
											/>
										</svg>
									</button>
								</div>
							</div>

							<div class="mt-3 border-t border-[#2f3336] pt-3">
								<p class="text-[13px] font-bold text-[#e7e9ea]">Why Wrapped picked this</p>
								<p class="mt-1 text-[15px] leading-[1.4] text-[#71767b]">
									{data.result.analysis.best_tweet_why}
								</p>
							</div>
						</div>
					</div>
				</article>
			</div>
		{/if}

		<div class="border-b border-[#2f3336] px-4 py-5">
			<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">The read</p>
			<p class="text-[15px] leading-relaxed text-[#e7e9ea]">{data.result.analysis?.vibe_summary}</p>
		</div>

	</div>

	<!-- Bottom action bar (match main column: exclude right rail so buttons stay centered on feed) -->
	<div
		class="fixed bottom-0 left-[72px] right-0 border-t border-[#2f3336] bg-black/95 backdrop-blur-sm sm:right-[350px] xl:left-[275px]"
	>
		<div class="flex w-full items-center justify-center gap-3 px-4 py-3">
			<button
				type="button"
				onclick={shareOnX}
				class="flex items-center gap-2 rounded-full bg-[#1d9bf0] px-6 py-2.5 font-bold text-white transition-colors hover:bg-[#1a8cd8]"
			>
				<span>🔗</span>
				Share on X
			</button>

			{#if data.result.videoUrl}
				<button
					type="button"
					onclick={downloadVideo}
					class="flex items-center gap-2 rounded-full border border-[#536471] px-6 py-2.5 font-bold text-[#e7e9ea] transition-colors hover:bg-[#181919]"
				>
					<span>⬇</span>
					Download
				</button>
			{/if}
		</div>
	</div>
</div>
