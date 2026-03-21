<script lang="ts">
	import ProfileWrappedRail from '$lib/components/ProfileWrappedRail.svelte';
	import { aggregateTweetStats, matchTweetForBestText } from '$lib/tweet-stats';
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

	let isVoiceoverPlaying = $state(false);
	let voiceoverAudio = $state<HTMLAudioElement | undefined>(undefined);

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

	let copyDone = $state(false);
	let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyShareText() {
		try {
			await navigator.clipboard.writeText(shareText);
			copyDone = true;
			if (copyResetTimer !== undefined) clearTimeout(copyResetTimer);
			copyResetTimer = setTimeout(() => {
				copyDone = false;
			}, 2000);
		} catch {
			copyDone = false;
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

	type TimeSlot = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'latenight';

	function peakHourSlot(raw: string | undefined): TimeSlot {
		const h = parsePeakHour(raw);
		if (h === null) return 'night';
		if (h < 5) return 'night';
		if (h < 8) return 'dawn';
		if (h < 12) return 'morning';
		if (h < 15) return 'noon';
		if (h < 18) return 'afternoon';
		if (h < 21) return 'sunset';
		return 'latenight';
	}

	const bgBySlot: Record<TimeSlot, string> = {
		night: 'bg-gradient-to-b from-[#0a0e1a] to-[#111827]',
		dawn: 'bg-gradient-to-b from-[#1e1b4b] to-[#78350f]',
		morning: 'bg-gradient-to-b from-[#1e3a5f] to-[#0f4c75]',
		noon: 'bg-gradient-to-b from-[#0369a1] to-[#0ea5e9]',
		afternoon: 'bg-gradient-to-b from-[#0c4a6e] to-[#92400e]',
		sunset: 'bg-gradient-to-b from-[#7c2d12] to-[#312e81]',
		latenight: 'bg-gradient-to-b from-[#1e1b4b] to-[#0a0e1a]'
	};

	const cloudColorBySlot: Record<TimeSlot, string> = {
		night: 'bg-slate-400',
		dawn: 'bg-amber-300',
		morning: 'bg-sky-200',
		noon: 'bg-white',
		afternoon: 'bg-amber-200',
		sunset: 'bg-orange-300',
		latenight: 'bg-indigo-300'
	};

	const matchedBestTweet = $derived(matchTweetForBestText(data.result.tweets, data.result.analysis?.best_tweet));
	const peakSlot = $derived(peakHourSlot(data.result.analysis?.peak_hour));
	const peakHourBgClass = $derived(bgBySlot[peakSlot]);
	const peakCloudColor = $derived(cloudColorBySlot[peakSlot]);
	const peakIsNight = $derived(peakSlot === 'night' || peakSlot === 'latenight');

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
			<div class="mt-6 flex max-w-2xl items-start gap-2 sm:mt-7">
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
		<!-- 1. Profile trading card -->
		<section
			class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-[#0a0a0a]"
		>
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute inset-0 bg-gradient-to-br from-[#1d9bf0]/[0.04] via-transparent to-emerald-500/[0.03]"></div>
			</div>

			<div
				class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
			>
				<!-- Trading card frame -->
				<div class="mx-auto flex w-full max-w-sm flex-1 flex-col overflow-hidden rounded-3xl border border-[#2f3336] bg-gradient-to-b from-[#16181c] to-[#0f1114] shadow-2xl">

					<!-- Header strip -->
					<div class="flex items-center justify-between border-b border-[#2f3336] bg-gradient-to-r from-[#1d9bf0]/20 to-[#1d9bf0]/5 px-4 py-2">
						<span class="text-xs font-bold uppercase tracking-[0.2em] text-[#1d9bf0]">X Wrapped 2025</span>
						<span class="text-xs font-bold uppercase tracking-widest text-[#71767b]">
							{data.result.analysis?.archetype ?? '—'}
						</span>
					</div>

					<!-- Hero image zone ~50% -->
					<div class="relative flex-1 min-h-0 overflow-hidden bg-black">
						{#if data.result.videoUrl}
							{#key data.result.videoUrl}
								<video
									src={data.result.videoUrl}
									autoplay
									loop
									muted
									playsinline
									class="absolute inset-0 h-full w-full object-cover"
								></video>
							{/key}
						{:else if data.result.profile?.profilePicture?.trim()}
							<img
								src={data.result.profile.profilePicture}
								alt="@{data.result.handle}"
								class="absolute inset-0 h-full w-full object-cover"
							/>
						{:else}
							<!-- Fallback gradient -->
							<div class="absolute inset-0 bg-gradient-to-br from-[#1d9bf0]/30 to-[#16181c]"></div>
						{/if}
						<!-- Bottom fade into card -->
						<div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0f1114] to-transparent"></div>
					</div>

					<!-- Name plate -->
					<div class="border-b border-[#2f3336] px-4 py-3">
						<h1 class="text-2xl font-black tracking-tight text-white">
							{data.result.profile?.name?.trim() || data.result.handle}
						</h1>
						<p class="text-sm font-medium text-[#1d9bf0]">@{data.result.handle}</p>
						{#if data.result.analysis?.archetype_description?.trim()}
							<p class="mt-1 text-xs italic text-[#8b98a5]">{data.result.analysis.archetype_description}</p>
						{/if}
					</div>

					<!-- Stats block — trading card stat table -->
					<div class="grid grid-cols-3 divide-x divide-[#2f3336] border-b border-[#2f3336]">
						<div class="px-3 py-2.5 text-center">
							<p class="text-lg font-black leading-none text-white">{tweetAgg.count || '—'}</p>
							<p class="mt-1 text-[10px] uppercase tracking-widest text-[#71767b]">Posts</p>
						</div>
						<div class="px-3 py-2.5 text-center">
							<p class="text-lg font-black leading-none text-white">{formatCount(data.result.profile?.followers ?? 0)}</p>
							<p class="mt-1 text-[10px] uppercase tracking-widest text-[#71767b]">Followers</p>
						</div>
						<div class="px-3 py-2.5 text-center">
							<p class="text-lg font-black leading-none text-white">{formatCount(tweetAgg.totalLikes)}</p>
							<p class="mt-1 text-[10px] uppercase tracking-widest text-[#71767b]">Likes</p>
						</div>
					</div>

					<!-- Flavour text -->
					{#if data.result.analysis?.vibe_summary?.trim()}
						<div class="flex items-start gap-2 px-4 py-3">
							<p class="min-w-0 flex-1 text-sm leading-snug text-[#e7e9ea]">
								{data.result.analysis.vibe_summary}
							</p>
							{#if data.result.audioUrl}
								<button
									type="button"
									class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] transition-colors hover:bg-white/[0.06]"
									title={data.result.voiceoverVoice?.trim()
										? `Play narrated summary (${data.result.voiceoverVoice.trim()})`
										: 'Play narrated summary'}
									aria-label={isVoiceoverPlaying ? 'Pause narrated summary' : 'Play narrated summary'}
									aria-pressed={isVoiceoverPlaying}
									onclick={toggleVoiceover}
								>
									{#if isVoiceoverPlaying}
										<svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
											<rect x="6" y="5" width="4" height="14" rx="1"></rect>
											<rect x="14" y="5" width="4" height="14" rx="1"></rect>
										</svg>
									{:else}
										<svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
											<path d="M8 6.5v11l9-5.5z"></path>
										</svg>
									{/if}
								</button>
							{/if}
						</div>
					{/if}

					<!-- Share row -->
					<div class="flex items-center justify-center gap-2 px-4 py-2.5">
						<button
							type="button"
							onclick={shareNative}
							class="inline-flex min-h-8 flex-1 items-center justify-center rounded-full bg-[#1d9bf0] px-3 text-sm font-bold text-white transition-colors hover:bg-[#1a8cd8]"
						>
							Share
						</button>
						<button
							type="button"
							onclick={copyShareText}
							class="inline-flex min-h-8 flex-1 items-center justify-center rounded-full border border-[#536471] bg-transparent px-3 text-sm font-bold text-[#e7e9ea] transition-colors hover:bg-white/[0.06]"
						>
							{copyDone ? 'Copied' : 'Copy text'}
						</button>
					</div>
				</div>
			</div>

			<!-- Hidden audio element -->
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
		</section>

		<!-- 2+. One full-height snap view per metric (engagement + summary stats) -->
		{#if tweetAgg.count > 0}
			<!-- Total Likes: floating hearts -->
			<section
				class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#1a0a0a] to-[#2d0f1a]"
				aria-label="Total likes"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<!-- Scattered heart shapes via SVG -->
					<svg class="absolute top-[10%] left-[8%] h-8 w-8 fill-rose-500 opacity-[0.08]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
					<svg class="absolute top-[22%] right-[12%] h-6 w-6 fill-rose-400 opacity-[0.06]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
					<svg class="absolute bottom-[30%] left-[15%] h-5 w-5 fill-pink-400 opacity-[0.07]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
					<svg class="absolute top-[55%] right-[20%] h-10 w-10 fill-rose-500 opacity-[0.05]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
					<svg class="absolute bottom-[15%] right-[8%] h-7 w-7 fill-pink-500 opacity-[0.06]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
					<svg class="absolute top-[40%] left-[5%] h-4 w-4 fill-rose-300 opacity-[0.09]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
					<!-- Warm glow -->
					<div class="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 opacity-[0.04] blur-3xl"></div>
				</div>
				<div
					class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
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

			<!-- Avg Views: concentric rings -->
			<section
				class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#0a1628] to-[#0f1f3a]"
				aria-label="Average views"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<div class="absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2">
						<div class="absolute inset-[10%] rounded-full border border-cyan-400/[0.04]"></div>
						<div class="absolute inset-[20%] rounded-full border border-cyan-400/[0.06]"></div>
						<div class="absolute inset-[30%] rounded-full border border-cyan-300/[0.05]"></div>
						<div class="absolute inset-[40%] rounded-full border border-cyan-400/[0.07]"></div>
						<div class="absolute inset-[48%] rounded-full border border-cyan-300/[0.04]"></div>
					</div>
					<!-- Center glow -->
					<div class="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500 opacity-[0.06] blur-3xl"></div>
				</div>
				<div
					class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
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
			<!-- Followers: rising crowd dots -->
			<section
				class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#0d1117] to-[#161b22]"
				aria-label="Followers"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<!-- Crowd-like dots rising from bottom -->
					<div class="absolute bottom-[8%] left-[10%] h-2 w-2 rounded-full bg-blue-400 opacity-[0.12]"></div>
					<div class="absolute bottom-[12%] left-[18%] h-1.5 w-1.5 rounded-full bg-blue-300 opacity-[0.10]"></div>
					<div class="absolute bottom-[6%] left-[28%] h-2.5 w-2.5 rounded-full bg-blue-500 opacity-[0.08]"></div>
					<div class="absolute bottom-[15%] left-[38%] h-1.5 w-1.5 rounded-full bg-sky-400 opacity-[0.10]"></div>
					<div class="absolute bottom-[10%] left-[48%] h-2 w-2 rounded-full bg-blue-400 opacity-[0.11]"></div>
					<div class="absolute bottom-[7%] left-[58%] h-1.5 w-1.5 rounded-full bg-blue-300 opacity-[0.09]"></div>
					<div class="absolute bottom-[13%] left-[68%] h-2 w-2 rounded-full bg-sky-500 opacity-[0.08]"></div>
					<div class="absolute bottom-[9%] left-[78%] h-1.5 w-1.5 rounded-full bg-blue-400 opacity-[0.10]"></div>
					<div class="absolute bottom-[11%] left-[88%] h-2 w-2 rounded-full bg-blue-300 opacity-[0.07]"></div>
					<!-- Second row, slightly higher -->
					<div class="absolute bottom-[20%] left-[14%] h-1 w-1 rounded-full bg-sky-300 opacity-[0.07]"></div>
					<div class="absolute bottom-[22%] left-[34%] h-1 w-1 rounded-full bg-blue-400 opacity-[0.06]"></div>
					<div class="absolute bottom-[18%] left-[54%] h-1.5 w-1.5 rounded-full bg-sky-400 opacity-[0.05]"></div>
					<div class="absolute bottom-[24%] left-[74%] h-1 w-1 rounded-full bg-blue-300 opacity-[0.06]"></div>
					<!-- Upward glow -->
					<div class="absolute bottom-0 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-blue-500 opacity-[0.04] blur-3xl"></div>
				</div>
				<div
					class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
				>
					<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
						{@render summaryFollowersCard('story')}
					</div>
				</div>
			</section>
		{/if}

		<section
			class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] {peakHourBgClass}"
			aria-label="Peak posting hour"
		>
			<!-- Decorative cloud wisps -->
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute top-[18%] -left-[10%] h-16 w-[55%] rounded-full {peakCloudColor} opacity-[0.07] blur-3xl"></div>
				<div class="absolute top-[35%] -right-[8%] h-12 w-[45%] rounded-full {peakCloudColor} opacity-[0.05] blur-3xl"></div>
				<div class="absolute bottom-[22%] left-[5%] h-10 w-[40%] rounded-full {peakCloudColor} opacity-[0.06] blur-2xl"></div>
				<div class="absolute top-[60%] right-[15%] h-8 w-[30%] rounded-full {peakCloudColor} opacity-[0.04] blur-2xl"></div>
				{#if peakIsNight}
					<!-- Faint stars for nighttime -->
					<div class="absolute top-[12%] left-[20%] h-1 w-1 rounded-full bg-white opacity-30"></div>
					<div class="absolute top-[8%] left-[65%] h-0.5 w-0.5 rounded-full bg-white opacity-20"></div>
					<div class="absolute top-[25%] right-[18%] h-1 w-1 rounded-full bg-white opacity-25"></div>
					<div class="absolute top-[15%] right-[40%] h-0.5 w-0.5 rounded-full bg-white opacity-15"></div>
					<div class="absolute top-[30%] left-[12%] h-0.5 w-0.5 rounded-full bg-white opacity-20"></div>
					<div class="absolute top-[5%] left-[45%] h-1 w-1 rounded-full bg-white opacity-20"></div>
					<div class="absolute bottom-[35%] right-[25%] h-0.5 w-0.5 rounded-full bg-white opacity-15"></div>
				{/if}
			</div>

			<div
				class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
			>
				<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
					{@render summaryPeakHourCard('story')}
				</div>
			</div>
		</section>

		<!-- Tone: sound wave / equalizer bars -->
		<section
			class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#1a0d2e] to-[#0f0a1a]"
			aria-label="Tone"
		>
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<!-- Equalizer bars along the bottom -->
				<div class="absolute bottom-[6%] left-[10%] flex items-end gap-[6px]">
					<div class="h-8 w-1 rounded-full bg-violet-400 opacity-[0.10]"></div>
					<div class="h-14 w-1 rounded-full bg-violet-400 opacity-[0.08]"></div>
					<div class="h-6 w-1 rounded-full bg-purple-400 opacity-[0.10]"></div>
					<div class="h-20 w-1 rounded-full bg-violet-300 opacity-[0.07]"></div>
					<div class="h-10 w-1 rounded-full bg-purple-400 opacity-[0.09]"></div>
					<div class="h-16 w-1 rounded-full bg-violet-400 opacity-[0.06]"></div>
					<div class="h-5 w-1 rounded-full bg-violet-300 opacity-[0.10]"></div>
				</div>
				<div class="absolute bottom-[6%] right-[10%] flex items-end gap-[6px]">
					<div class="h-12 w-1 rounded-full bg-purple-400 opacity-[0.08]"></div>
					<div class="h-6 w-1 rounded-full bg-violet-400 opacity-[0.10]"></div>
					<div class="h-18 w-1 rounded-full bg-violet-300 opacity-[0.07]"></div>
					<div class="h-9 w-1 rounded-full bg-purple-400 opacity-[0.09]"></div>
					<div class="h-15 w-1 rounded-full bg-violet-400 opacity-[0.06]"></div>
					<div class="h-7 w-1 rounded-full bg-violet-300 opacity-[0.10]"></div>
					<div class="h-11 w-1 rounded-full bg-purple-400 opacity-[0.08]"></div>
				</div>
				<!-- Center glow -->
				<div class="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 opacity-[0.05] blur-3xl"></div>
			</div>
			<div
				class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] pb-[env(safe-area-inset-bottom,0px)]"
			>
				<div class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
					{@render summaryToneCard('story')}
				</div>
			</div>
		</section>

		<!-- 3. Recap card -->
		{#if hasBestTweet || showStyleRail}
			<section
				class="relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden border-b border-white/[0.08] bg-[#0a0a0a]"
				aria-label="Highlights and style"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<div class="absolute inset-0 bg-gradient-to-br from-[#1d9bf0]/[0.03] via-transparent to-emerald-500/[0.02]"></div>
				</div>

				<div
					class="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-4 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
				>
					<div class="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-[#2f3336] bg-gradient-to-b from-[#16181c] to-[#0f1114] shadow-2xl">

						<!-- Stats row — 3-col grid with dividers -->
						{#if tweetAgg.count > 0}
							<div class="grid grid-cols-3 divide-x divide-[#2f3336] border-b border-[#2f3336] px-1 py-4">
								<div class="text-center">
									<p class="text-2xl font-black leading-none tracking-tight text-white">{tweetAgg.count}</p>
									<p class="mt-1.5 text-[10px] uppercase tracking-widest text-[#71767b]">Posts</p>
								</div>
								<div class="text-center">
									<p class="text-2xl font-black leading-none tracking-tight text-white">{formatCount(tweetAgg.totalLikes)}</p>
									<p class="mt-1.5 text-[10px] uppercase tracking-widest text-[#71767b]">Likes</p>
								</div>
								<div class="text-center">
									<p class="text-2xl font-black leading-none tracking-tight text-white">{formatCount(tweetAgg.totalViews)}</p>
									<p class="mt-1.5 text-[10px] uppercase tracking-widest text-[#71767b]">Views</p>
								</div>
							</div>
						{/if}

						<!-- Best Tweet -->
						{#if data.result.analysis?.best_tweet}
							<div class="border-b border-[#2f3336] px-4 py-4">
								<p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1d9bf0]">Best Tweet</p>
								<blockquote class="text-[15px] leading-snug text-[#e7e9ea]">
									"{data.result.analysis.best_tweet}"
								</blockquote>
								{#if matchedBestTweet}
									<div class="mt-2.5 flex items-center gap-3 text-xs tabular-nums text-[#536471]">
										<span class="flex items-center gap-1">
											<svg class="h-3.5 w-3.5 text-[#f91880]/60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
											{formatCount(matchedBestTweet.likeCount)}
										</span>
										<span class="flex items-center gap-1">
											<svg class="h-3.5 w-3.5 text-[#00ba7c]/60" viewBox="0 0 24 24" fill="currentColor"><path d="M4.75 3.79l4.503 4.75-1.526 1.453L6 7.234V16.5h2V20H2v-3.5h2V6.234L1.25 9.992.22 8.72 4.75 3.79zm14.5 0l4.53 4.932-1.03 1.272-1.75-1.758V16.5h2V20h-6v-3.5h2V7.234l-1.727 1.758-1.527-1.453 4.503-4.75z"/></svg>
											{formatCount(matchedBestTweet.retweetCount)}
										</span>
										<span class="flex items-center gap-1">
											<svg class="h-3.5 w-3.5 text-[#1d9bf0]/60" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-4h2v4h-2z"/></svg>
											{matchedBestTweet.viewCount > 0 ? formatCount(matchedBestTweet.viewCount) : '0'}
										</span>
									</div>
								{/if}
								{#if data.result.analysis.best_tweet_why}
									<div class="mt-3 border-t border-[#2f3336] pt-2.5">
										<p class="text-xs italic leading-snug text-[#536471]">{data.result.analysis.best_tweet_why}</p>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Topics -->
						{#if data.result.analysis?.top_topics && data.result.analysis.top_topics.length > 0}
							<div class="border-b border-[#2f3336] px-4 py-3">
								<p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#71767b]">Topics</p>
								<div class="flex flex-wrap gap-1.5">
									{#each data.result.analysis.top_topics as topic}
										<span class="rounded-full bg-[#1d9bf0]/10 px-2.5 py-1 text-xs font-bold text-[#1d9bf0]">#{topic}</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Hashtags -->
						{#if tweetAgg.topHashtags.length > 0}
							<div class="border-b border-[#2f3336] px-4 py-3">
								<p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#71767b]">Hashtags</p>
								<div class="flex flex-wrap gap-1.5">
									{#each tweetAgg.topHashtags as { tag, count }}
										<span class="inline-flex items-center rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-[#e7e9ea]">
											<span>#{tag}</span>
											<span class="ml-1 text-[#536471]">·</span>
											<span class="ml-1 font-bold text-white">{count}</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Mentions — label left, pill count right -->
						{#if tweetAgg.topMentions.length > 0}
							<div class="border-b border-[#2f3336] px-4 py-3">
								<p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#71767b]">Mentions</p>
								<div class="space-y-1.5">
									{#each tweetAgg.topMentions as { handle, count }}
										<div class="flex items-center justify-between">
											<span class="text-sm text-[#e7e9ea]">@{handle}</span>
											<span class="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-bold tabular-nums text-white">{count}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Posting style flavour text -->
						{#if data.result.analysis?.posting_style}
							<div class="px-4 py-3">
								<p class="text-xs italic leading-relaxed text-[#536471]">{data.result.analysis.posting_style}</p>
							</div>
						{/if}
					</div>
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
