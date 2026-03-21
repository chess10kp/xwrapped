<script lang="ts">
	import ProfileWrappedRail from '$lib/components/ProfileWrappedRail.svelte';
	import { aggregateTweetStats } from '$lib/tweet-stats';
	import { canonicalProfileWrappedUrl, buildWrappedShareText, postOnXIntentUrl } from '$lib/share-wrapped';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import {
		describeFollowerPercentile,
		normalizeComparison,
		describePeakHour,
		describeTone
	} from '$lib/wrapped-copy';
	import { formatCount } from '$lib/tweet-stats';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let copyDone = $state(false);
	let isVoiceoverPlaying = $state(false);
	let voiceoverAudio = $state<HTMLAudioElement | undefined>(undefined);
	let copyFlashTimer: ReturnType<typeof setTimeout> | undefined;

	const profileUrl = $derived(canonicalProfileWrappedUrl(data.result.handle, page.url));
	const shareText = $derived(
		buildWrappedShareText(data.result.handle, data.result.analysis?.archetype, profileUrl)
	);

	function openPostOnX() {
		window.open(postOnXIntentUrl(shareText), '_blank', 'noopener,noreferrer');
	}

	async function shareNative() {
		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			try {
				await navigator.share({ text: shareText });
				return;
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
			}
		}
		openPostOnX();
	}

	async function copyShareText() {
		try {
			await navigator.clipboard.writeText(shareText);
			copyDone = true;
			if (copyFlashTimer) clearTimeout(copyFlashTimer);
			copyFlashTimer = setTimeout(() => {
				copyDone = false;
			}, 2000);
		} catch {
			/* clipboard may be unavailable */
		}
	}

	async function toggleVoiceover() {
		if (!voiceoverAudio) return;
		if (voiceoverAudio.paused) {
			try {
				await voiceoverAudio.play();
			} catch {
				isVoiceoverPlaying = false;
			}
			return;
		}
		voiceoverAudio.pause();
	}

	$effect(() => {
		if (!browser) return;
		const url = data.result.audioUrl?.trim();
		const el = voiceoverAudio;
		if (!url || !el) return;
		void el.play().catch(() => {
			isVoiceoverPlaying = false;
		});
	});

	const tweetAgg = $derived(aggregateTweetStats(data.result.tweets));
	const hasBestTweet = $derived(!!data.result.analysis?.best_tweet);
	const showStyleRail = $derived(tweetAgg.count > 0 || !!data.result.analysis?.posting_style);

	const ogDescription = $derived.by(() => {
		const a = data.result.analysis;
		const arch = a?.archetype ?? 'X Wrapped';
		const lore = (a?.archetype_description ?? '').trim();
		const vibe = (a?.vibe_summary ?? '').trim();
		const snippet = (lore || vibe).slice(0, 160);
		return snippet ? `${arch}. ${snippet}` : `Archetype: ${arch}`;
	});
	const metricComparisons = $derived(data.result.analysis?.metric_comparisons);
	const followersComparison = $derived(normalizeComparison(metricComparisons?.followers));
	const peakHourComparison = $derived(normalizeComparison(metricComparisons?.peak_hour));

	/** Parse a peak-hour string like "2am" / "11pm" into 0–23, or null. */
	function parsePeakHour(raw: string | undefined): number | null {
		const m = (raw ?? '').trim().toLowerCase().match(/^(\d{1,2})\s*(am|pm)$/);
		if (!m) return null;
		let h = parseInt(m[1], 10);
		if (m[2] === 'am' && h === 12) h = 0;
		else if (m[2] === 'pm' && h !== 12) h += 12;
		return h >= 0 && h < 24 ? h : null;
	}

	function peakHourBg(raw: string | undefined): string {
		const h = parsePeakHour(raw);
		if (h === null) return 'bg-[#16181c]';
		// night 0-4: deep navy
		if (h < 5) return 'bg-gradient-to-b from-[#0a0e1a] to-[#111827]';
		// dawn 5-7: warm indigo-orange
		if (h < 8) return 'bg-gradient-to-b from-[#1e1b4b] to-[#78350f]';
		// morning 8-11: soft blue
		if (h < 12) return 'bg-gradient-to-b from-[#1e3a5f] to-[#0f4c75]';
		// noon 12-14: bright sky blue
		if (h < 15) return 'bg-gradient-to-b from-[#0369a1] to-[#0ea5e9]';
		// afternoon 15-17: warm amber-blue
		if (h < 18) return 'bg-gradient-to-b from-[#0c4a6e] to-[#92400e]';
		// sunset 18-20: orange-purple
		if (h < 21) return 'bg-gradient-to-b from-[#7c2d12] to-[#312e81]';
		// late night 21-23: dark blue-indigo
		return 'bg-gradient-to-b from-[#1e1b4b] to-[#0a0e1a]';
	}

	const peakHourBgClass = $derived(peakHourBg(data.result.analysis?.peak_hour));

</script>

<svelte:head>
	<title>@{data.result.handle}'s X Wrapped</title>
	<meta property="og:title" content="@{data.result.handle}'s X Wrapped" />
	<meta property="og:description" content={ogDescription} />
	<meta property="og:url" content={profileUrl} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{#snippet videoBlock()}
	{#if data.result.videoUrl}
		<div class="border-b border-[#2f3336] p-3">
			<div class="overflow-hidden rounded-2xl border border-[#2f3336]">
				{#key data.result.videoUrl}
					<video
						src={data.result.videoUrl}
						controls
						loop
						muted
						autoplay
						playsinline
						class="aspect-video w-full object-cover"
					></video>
				{/key}
			</div>
		</div>
	{:else if data.result.videoError?.trim()}
		<div class="border-b border-[#2f3336] px-4 py-4">
			<p class="text-lg leading-relaxed text-[#f4212e]">
				Video could not be generated ({data.result.videoError}). Check the server log and your Magic Hour
				account credits.
			</p>
		</div>
	{/if}
	{#if data.result.audioUrl}
		<audio
			bind:this={voiceoverAudio}
			class="hidden"
			preload="auto"
			onplay={() => (isVoiceoverPlaying = true)}
			onpause={() => (isVoiceoverPlaying = false)}
			onended={() => (isVoiceoverPlaying = false)}
		>
			<source src={data.result.audioUrl} />
		</audio>
	{/if}
{/snippet}

{#snippet profileCard()}
	<div class="min-w-0">
		<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
			<h1 class="min-w-0 flex-1 text-3xl font-extrabold text-[#e7e9ea] sm:text-4xl">
				@{data.result.handle}
			</h1>
			<div class="flex shrink-0 flex-wrap justify-end gap-2" role="group" aria-label="Share this Wrapped">
				<button
					type="button"
					title="System share sheet on supported devices, or open X with this text pre-filled"
					onclick={shareNative}
					class="inline-flex min-h-9 items-center justify-center rounded-full bg-[#1d9bf0] px-4 text-[17px] font-bold text-white transition-colors hover:bg-[#1a8cd8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
				>
					Share
				</button>
				<button
					type="button"
					title="Copy pre-filled post text to clipboard"
					onclick={copyShareText}
					class="inline-flex min-h-9 items-center justify-center rounded-full border border-[#536471] bg-transparent px-4 text-[17px] font-bold text-[#e7e9ea] transition-colors hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
				>
					{copyDone ? 'Copied' : 'Copy text'}
				</button>
			</div>
		</div>
		{#if data.result.profile?.name?.trim()}
			<p class="mt-1 text-lg text-[#e7e9ea]">{data.result.profile.name.trim()}</p>
		{/if}
		<p class="text-lg text-[#1d9bf0] sm:text-xl">{data.result.analysis?.archetype ?? '—'}</p>
		{#if data.result.analysis?.archetype_description?.trim()}
			<p class="mt-1 max-w-2xl text-[18px] leading-snug text-[#e7e9ea] sm:text-[17px]">
				{data.result.analysis.archetype_description.trim()}
			</p>
		{/if}
		{#if data.result.analysis?.vibe_summary?.trim()}
			<div class="mt-3 flex max-w-2xl items-start gap-2">
				<p class="min-w-0 flex-1 text-[21px] leading-snug text-[#e7e9ea] sm:text-[18px]">
					{data.result.analysis.vibe_summary.trim()}
				</p>
				{#if data.result.audioUrl}
					<button
						type="button"
						class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] transition-colors hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
						title={data.result.voiceoverVoice?.trim()
							? `Play narrated summary (${data.result.voiceoverVoice.trim()})`
							: 'Play narrated summary'}
						aria-label={isVoiceoverPlaying ? 'Pause narrated summary' : 'Play narrated summary'}
						aria-pressed={isVoiceoverPlaying}
						onclick={toggleVoiceover}
					>
						{#if isVoiceoverPlaying}
							<svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
								<rect x="6" y="5" width="4" height="14" rx="1"></rect>
								<rect x="14" y="5" width="4" height="14" rx="1"></rect>
							</svg>
						{:else}
							<svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
								<path d="M8 6.5v11l9-5.5z"></path>
							</svg>
						{/if}
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet summaryFollowersCard(variant: 'card' | 'story')}
	{#if data.result.profile}
		{#if variant === 'story'}
			<div class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8">
				<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
					{formatCount(data.result.profile.followers)}
				</p>
				<p class="mt-2 text-lg uppercase tracking-widest text-[#a0aab4]">Followers</p>
				<div class="my-4 h-px w-3/4 bg-white/10"></div>
				<p class="max-w-xs text-center text-lg italic leading-snug text-[#b8c0c9]">
					{describeFollowerPercentile(data.result.profile.followers)}
				</p>
				{#if followersComparison}
					<p class="mt-3 max-w-xs text-center text-base leading-snug text-[#8b98a5]">
						{followersComparison}
					</p>
				{/if}
			</div>
		{:else}
			<div class="rounded-2xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-3">
				<p class="text-[20px] font-semibold leading-snug text-[#e7e9ea] sm:text-[17px] sm:font-normal">
					{describeFollowerPercentile(data.result.profile.followers)}
				</p>
				{#if followersComparison}
					<p class="mt-2 text-[17px] leading-snug text-[#8b98a5] sm:mt-1 sm:text-[15px]">
						{followersComparison}
					</p>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet summaryPeakHourCard(variant: 'card' | 'story')}
	{#if variant === 'story'}
		<div class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8">
			<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
				{data.result.analysis?.peak_hour?.trim() || '—'}
			</p>
			<p class="mt-2 text-lg uppercase tracking-widest text-[#a0aab4]">Peak Hour</p>
			<div class="my-4 h-px w-3/4 bg-white/10"></div>
			<p class="max-w-xs text-center text-lg italic leading-snug text-[#b8c0c9]">
				{describePeakHour(data.result.analysis?.peak_hour)}
			</p>
			{#if peakHourComparison}
				<p class="mt-3 max-w-xs text-center text-base leading-snug text-[#8b98a5]">
					{peakHourComparison}
				</p>
			{/if}
		</div>
	{:else}
		<div class="rounded-2xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-3">
			<p class="text-[20px] font-semibold leading-snug text-[#e7e9ea] sm:text-[17px] sm:font-normal">
				{describePeakHour(data.result.analysis?.peak_hour)}
			</p>
			{#if peakHourComparison}
				<p class="mt-2 text-[17px] leading-snug text-[#8b98a5] sm:mt-1 sm:text-[15px]">
					{peakHourComparison}
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet summaryToneCard(variant: 'card' | 'story')}
	{#if variant === 'story'}
		<div class="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-6 py-8">
			<p class="text-[clamp(3.5rem,15vw,5.5rem)] font-extrabold leading-none tracking-tight text-white">
				{data.result.analysis?.tone?.trim() || '—'}
			</p>
			<p class="mt-2 text-lg uppercase tracking-widest text-[#a0aab4]">Vibe</p>
			<div class="my-4 h-px w-3/4 bg-white/10"></div>
			<p class="max-w-xs text-center text-lg italic leading-snug text-[#b8c0c9]">
				{describeTone(data.result.analysis?.tone)}
			</p>
		</div>
	{:else}
		<div class="rounded-2xl border border-[#2f3336] bg-[#16181c] px-4 py-4 sm:px-3 sm:py-3">
			<p class="text-[20px] font-semibold leading-snug text-[#e7e9ea] sm:text-[17px] sm:font-normal">
				{describeTone(data.result.analysis?.tone)}
			</p>
		</div>
	{/if}
{/snippet}

{#snippet summaryGrid()}
	<div class="grid gap-3 sm:grid-cols-3">
		{@render summaryFollowersCard('card')}
		{@render summaryPeakHourCard('card')}
		{@render summaryToneCard('card')}
	</div>
{/snippet}

{#snippet noPostsMessage()}
	<div>
		<p class="mb-1 text-sm font-medium uppercase tracking-wider text-[#71767b]">Post data</p>
		<p class="text-[18px] leading-relaxed text-[#e7e9ea]">
			No posts were included in this wrap yet, so engagement stats and hashtag breakdowns are not available.
		</p>
		<p class="mt-2 text-[15px] leading-snug text-[#71767b]">
			Generate a new wrap after your archive is connected so posts can be analysed.
		</p>
	</div>
{/snippet}

<div class="min-h-screen sm:pb-28">
	<!-- Narrow mobile: one viewport per "story" screen with scroll snap -->
	<div
		class="sm:hidden h-dvh max-h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]"
		aria-label="Wrapped story"
	>
		<!-- 1. Profile (+ optional video): compact, top-aligned; scroll only if needed -->
		<section
			class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-[#2f3336]"
		>
			<div
				class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pt-[max(2rem,calc(env(safe-area-inset-top,0px)+1.5rem))] pb-[env(safe-area-inset-bottom,0px)]"
			>
				<div class="shrink-0">
					{@render videoBlock()}
				</div>
				<div class="px-4 py-3">
					{@render profileCard()}
				</div>
			</div>
		</section>

		<!-- 2+. One full-height snap view per metric (engagement + summary stats) -->
		{#if tweetAgg.count > 0}
			<section
				class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-[#0c211a]"
				aria-label="Total likes"
			>
				<div
					class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
				>
					<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
						<ProfileWrappedRail
							result={data.result}
							sections={['totalLikes']}
							padded={false}
							compact={true}
							storyMetricLayout={true}
						/>
					</div>
				</div>
			</section>
			<section
				class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-[#2f3336]"
				aria-label="Average views"
			>
				<div
					class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
				>
					<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
						<ProfileWrappedRail
							result={data.result}
							sections={['avgViews']}
							padded={false}
							compact={true}
							storyMetricLayout={true}
						/>
					</div>
				</div>
			</section>
		{:else}
			<section
				class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-[#2f3336]"
				aria-label="Post data"
			>
				<div
					class="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-y-contain px-4 pt-[max(2rem,calc(env(safe-area-inset-top,0px)+1.5rem))] pb-[env(safe-area-inset-bottom,0px)]"
				>
					<div class="mx-auto w-full max-w-lg">
						{@render noPostsMessage()}
					</div>
				</div>
			</section>
		{/if}

		{#if data.result.profile}
			<section
				class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-[#2f3336]"
				aria-label="Followers"
			>
				<div
					class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
				>
					<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
						{@render summaryFollowersCard('story')}
					</div>
				</div>
			</section>
		{/if}

		<section
			class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] {peakHourBgClass}"
			aria-label="Peak posting hour"
		>
			<div
				class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
			>
				<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
					{@render summaryPeakHourCard('story')}
				</div>
			</div>
		</section>

		<section
			class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-[#2f3336]"
			aria-label="Tone"
		>
			<div
				class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
			>
				<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
					{@render summaryToneCard('story')}
				</div>
			</div>
		</section>

		<!-- 3. Best tweet + style (tags, topics) — one scrollable story screen -->
		{#if hasBestTweet || showStyleRail}
			<section
				class="flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-[#2f3336]"
				aria-label="Highlights and style"
			>
				<div
					class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-4 pt-[max(2rem,calc(env(safe-area-inset-top,0px)+1.5rem))] pb-[env(safe-area-inset-bottom,0px)]"
				>
					<ProfileWrappedRail
						result={data.result}
						sections={['bestTweet', 'style', 'tags', 'topTopics']}
						padded={false}
						compact={true}
					/>
				</div>
			</section>
		{/if}
	</div>

	<!-- sm+: center column; engagement / best / style live in side rails -->
	<div class="hidden sm:block">
		{@render videoBlock()}
		<div class="border-b border-[#2f3336] px-4 py-6">
			{@render profileCard()}
		</div>

		{#if tweetAgg.count === 0}
			<div class="border-b border-[#2f3336] px-4 py-6">
				{@render noPostsMessage()}
			</div>
		{/if}

		<div class="border-b border-[#2f3336] px-4 py-5">
			{@render summaryGrid()}
		</div>
	</div>
</div>
