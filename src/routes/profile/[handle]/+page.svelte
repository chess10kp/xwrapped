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
	const totalLikesComparison = $derived(normalizeComparison(metricComparisons?.total_likes));
	const avgViewsComparison = $derived(normalizeComparison(metricComparisons?.avg_views));

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

<!-- ──────────────────────────────────────────────── -->
<!-- MOBILE: full-screen snap-scroll story           -->
<!-- ──────────────────────────────────────────────── -->
<div class="min-h-screen sm:pb-28">
	<div
		class="sm:hidden h-dvh max-h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]"
		aria-label="Wrapped story"
	>
		<!-- ━━━ 1. Hero slide — full-bleed image/video with overlaid identity ━━━ -->
		<section
			class="story-slide relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden"
		>
			<!-- Full-bleed media -->
			<div class="absolute inset-0 bg-black">
				{#if data.result.videoUrl}
					{#key data.result.videoUrl}
						<video
							src={data.result.videoUrl}
							autoplay loop muted playsinline
							class="absolute inset-0 h-full w-full object-cover"
						></video>
					{/key}
				{:else if data.result.profile?.profilePicture?.trim()}
					<img
						src={data.result.profile.profilePicture}
						alt="@{data.result.handle}"
						class="absolute inset-0 h-full w-full object-cover opacity-60"
					/>
				{:else}
					<div class="absolute inset-0 hero-fallback-bg"></div>
				{/if}
			</div>

			<!-- Bottom gradient scrim for legibility -->
			<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" aria-hidden="true"></div>

			<!-- Content pinned to bottom -->
			<div class="relative z-10 mt-auto px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))]">
				<!-- Archetype pill -->
				{#if data.result.analysis?.archetype}
					<div class="mb-4 inline-flex items-center rounded-full border border-[#1d9bf0]/30 bg-[#1d9bf0]/[0.12] px-3.5 py-1 backdrop-blur-md">
						<span class="text-xs font-bold uppercase tracking-[0.2em] text-[#1d9bf0]">{data.result.analysis.archetype}</span>
					</div>
				{/if}

				<h1 class="text-[2.5rem] font-black leading-[1.05] tracking-tight text-white">
					{data.result.profile?.name?.trim() || data.result.handle}
				</h1>
				<p class="mt-1 text-lg font-medium text-[#1d9bf0]">@{data.result.handle}</p>

				<!-- Stats row -->
				<div class="mt-5 flex items-center gap-6">
					<div>
						<p class="text-2xl font-black leading-none text-white">{tweetAgg.count || '—'}</p>
						<p class="mt-1 text-[11px] uppercase tracking-widest text-white/50">Posts</p>
					</div>
					<div class="h-8 w-px bg-white/10"></div>
					<div>
						<p class="text-2xl font-black leading-none text-white">{formatCount(data.result.profile?.followers ?? 0)}</p>
						<p class="mt-1 text-[11px] uppercase tracking-widest text-white/50">Followers</p>
					</div>
					<div class="h-8 w-px bg-white/10"></div>
					<div>
						<p class="text-2xl font-black leading-none text-white">{formatCount(tweetAgg.totalLikes)}</p>
						<p class="mt-1 text-[11px] uppercase tracking-widest text-white/50">Likes</p>
					</div>
				</div>

				<!-- Share row -->
				<div class="mt-6 flex items-center gap-2.5">
					<button
						type="button"
						onclick={shareNative}
						class="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#1d9bf0] px-4 text-[15px] font-bold text-white shadow-[0_6px_24px_-6px_rgba(29,155,240,0.5)] transition-all hover:bg-[#1a8cd8]"
					>
						Share
					</button>
					<button
						type="button"
						onclick={copyShareText}
						class="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] px-4 text-[15px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.12]"
					>
						{copyDone ? 'Copied' : 'Copy'}
					</button>
				</div>

				<!-- Scroll hint -->
				<div class="mt-5 flex justify-center">
					<div class="scroll-hint h-1 w-8 rounded-full bg-white/20"></div>
				</div>
			</div>

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

		<!-- ━━━ 2. Archetype slide ━━━ -->
		{#if data.result.analysis?.archetype || data.result.analysis?.archetype_description?.trim()}
			<section
				class="story-slide archetype-slide relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden bg-[#030712]"
				aria-label="Archetype"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<!-- Dot grid pattern -->
					<div class="archetype-dots absolute inset-0 opacity-60"></div>
					<!-- Glowing crosshair lines -->
					<div class="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-[#1d9bf0]/20"></div>
					<div class="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[#1d9bf0]/20"></div>
					<!-- Corner brackets -->
					<div class="absolute top-8 left-6 h-20 w-20 border-l-2 border-t-2 border-[#1d9bf0]/40"></div>
					<div class="absolute top-8 right-6 h-20 w-20 border-r-2 border-t-2 border-[#1d9bf0]/40"></div>
					<div class="absolute bottom-8 left-6 h-20 w-20 border-l-2 border-b-2 border-[#1d9bf0]/40"></div>
					<div class="absolute bottom-8 right-6 h-20 w-20 border-r-2 border-b-2 border-[#1d9bf0]/40"></div>
					<!-- Center glow spot -->
					<div class="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d9bf0]/[0.12] blur-[100px]"></div>
				</div>
				<div class="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12">
					{#if data.result.analysis?.archetype}
						<p class="text-[11px] font-bold uppercase tracking-[0.3em] text-[#1d9bf0]/70">You are</p>
						<h2 class="mt-3 text-center text-[clamp(2.5rem,12vw,4rem)] font-black leading-[0.95] tracking-tight text-white">
							{data.result.analysis.archetype}
						</h2>
					{/if}
					{#if data.result.analysis?.archetype_description?.trim()}
						<p class="mt-6 max-w-xs text-center text-lg leading-snug text-[#a0a8b0]">
							{data.result.analysis.archetype_description}
						</p>
					{/if}
					{#if data.result.audioUrl}
						<button
							type="button"
							class="mt-8 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition-colors hover:bg-white/[0.1]"
							title={data.result.voiceoverVoice?.trim()
								? `Play narrated summary (${data.result.voiceoverVoice.trim()})`
								: 'Play narrated summary'}
							aria-label={isVoiceoverPlaying ? 'Pause narrated summary' : 'Play narrated summary'}
							aria-pressed={isVoiceoverPlaying}
							onclick={toggleVoiceover}
						>
							{#if isVoiceoverPlaying}
								<svg viewBox="0 0 24 24" class="h-6 w-6 fill-current" aria-hidden="true">
									<rect x="6" y="5" width="4" height="14" rx="1"></rect>
									<rect x="14" y="5" width="4" height="14" rx="1"></rect>
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" class="h-6 w-6 fill-current" aria-hidden="true">
									<path d="M8 6.5v11l9-5.5z"></path>
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			</section>
		{/if}

		<!-- ━━━ 3+. Metric slides ━━━ -->
		{#if tweetAgg.count > 0}
			<!-- Total Likes -->
			<section
				class="story-slide metric-slide slide-likes relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden"
				aria-label="Total likes"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<div class="likes-orb-1 absolute top-[10%] left-[15%] h-[50%] w-[60%] rounded-full"></div>
					<div class="likes-orb-2 absolute bottom-[5%] right-[10%] h-[45%] w-[50%] rounded-full"></div>
					<div class="likes-orb-3 absolute top-[40%] right-[25%] h-[30%] w-[35%] rounded-full"></div>
					<div class="metric-noise absolute inset-0"></div>
				</div>
				<div class="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
					<p class="text-[11px] font-bold uppercase tracking-[0.3em] text-[#f91880]">Total Likes</p>
					<p class="mt-3 text-[clamp(4rem,18vw,7rem)] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_40px_rgba(249,24,128,0.3)]">
						{formatCount(tweetAgg.totalLikes)}
					</p>
					{#if totalLikesComparison}
						<p class="mt-5 max-w-xs text-center text-base leading-snug text-white/60">
							{totalLikesComparison}
						</p>
					{/if}
				</div>
			</section>

			<!-- Avg Views -->
			<section
				class="story-slide metric-slide slide-views relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden"
				aria-label="Average views"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<div class="views-orb-1 absolute top-[5%] right-[10%] h-[55%] w-[55%] rounded-full"></div>
					<div class="views-orb-2 absolute bottom-[10%] left-[5%] h-[40%] w-[50%] rounded-full"></div>
					<div class="views-orb-3 absolute top-[35%] left-[30%] h-[25%] w-[30%] rounded-full"></div>
					<div class="views-grid absolute inset-0"></div>
				</div>
				<div class="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
					<p class="text-[11px] font-bold uppercase tracking-[0.3em] text-[#1d9bf0]">Avg Views</p>
					<p class="mt-3 text-[clamp(4rem,18vw,7rem)] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_40px_rgba(29,155,240,0.3)]">
						{formatCount(tweetAgg.avgViews)}
					</p>
					{#if avgViewsComparison}
						<p class="mt-5 max-w-xs text-center text-base leading-snug text-white/60">
							{avgViewsComparison}
						</p>
					{/if}
				</div>
			</section>
		{:else}
			<section
				class="story-slide flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden bg-black"
				aria-label="Post data"
			>
				<div class="flex min-h-0 flex-1 flex-col items-center justify-center px-8">
					<p class="text-center text-lg leading-relaxed text-[#71767b]">
						No posts were included in this wrap yet.
					</p>
				</div>
			</section>
		{/if}

		<!-- Followers -->
		{#if data.result.profile}
			<section
				class="story-slide metric-slide slide-followers relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden"
				aria-label="Followers"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<div class="followers-orb-1 absolute top-[20%] right-[15%] h-[50%] w-[50%] rounded-full"></div>
					<div class="followers-orb-2 absolute bottom-[15%] left-[10%] h-[40%] w-[45%] rounded-full"></div>
					<div class="followers-rings absolute inset-0"></div>
					<div class="metric-noise absolute inset-0"></div>
				</div>
				<div class="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
					<p class="text-[11px] font-bold uppercase tracking-[0.3em] text-[#3b82f6]">Followers</p>
					<p class="mt-3 text-[clamp(4rem,18vw,7rem)] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.3)]">
						{formatCount(data.result.profile.followers)}
					</p>
					<p class="mt-5 max-w-xs text-center text-base leading-snug text-white/60">
						{describeFollowerPercentile(data.result.profile.followers)}
					</p>
					{#if followersComparison}
						<p class="mt-2 max-w-xs text-center text-sm leading-snug text-white/40">
							{followersComparison}
						</p>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Peak Hour -->
		<section
			class="story-slide metric-slide slide-peak relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden {peakHourBgClass}"
			aria-label="Peak posting hour"
		>
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="peak-cloud-1 absolute top-[10%] -left-[10%] h-32 w-[70%] rounded-full {peakCloudColor}"></div>
				<div class="peak-cloud-2 absolute bottom-[15%] -right-[10%] h-28 w-[65%] rounded-full {peakCloudColor}"></div>
				<div class="peak-cloud-3 absolute top-[45%] left-[20%] h-20 w-[40%] rounded-full {peakCloudColor}"></div>
				{#if peakIsNight}
					<div class="star star-1 absolute top-[8%] left-[18%] h-[3px] w-[3px] rounded-full bg-white/50"></div>
					<div class="star star-2 absolute top-[15%] right-[25%] h-[2px] w-[2px] rounded-full bg-white/40"></div>
					<div class="star star-3 absolute top-[5%] left-[55%] h-[2px] w-[2px] rounded-full bg-white/35"></div>
					<div class="star star-4 absolute top-[22%] left-[72%] h-[2px] w-[2px] rounded-full bg-white/30"></div>
					<div class="star star-5 absolute top-[12%] left-[40%] h-[3px] w-[3px] rounded-full bg-white/45"></div>
					<div class="star star-1 absolute top-[30%] right-[15%] h-[2px] w-[2px] rounded-full bg-white/25"></div>
					<div class="star star-3 absolute bottom-[35%] left-[25%] h-[2px] w-[2px] rounded-full bg-white/20"></div>
				{/if}
				<div class="metric-noise absolute inset-0"></div>
			</div>
			<div class="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
				<p class="text-[11px] font-bold uppercase tracking-[0.3em] text-white/60">Peak Hour</p>
				<p class="mt-3 text-[clamp(4rem,18vw,7rem)] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.15)]">
					{data.result.analysis?.peak_hour?.trim() || '—'}
				</p>
				<p class="mt-5 max-w-xs text-center text-base leading-snug text-white/60">
					{describePeakHour(data.result.analysis?.peak_hour)}
				</p>
				{#if peakHourComparison}
					<p class="mt-2 max-w-xs text-center text-sm leading-snug text-white/40">
						{peakHourComparison}
					</p>
				{/if}
			</div>
		</section>

		<!-- Tone -->
		<section
			class="story-slide metric-slide slide-vibe relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden"
			aria-label="Tone"
		>
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="vibe-orb-1 absolute top-[10%] left-[25%] h-[50%] w-[55%] rounded-full"></div>
				<div class="vibe-orb-2 absolute bottom-[15%] right-[15%] h-[45%] w-[50%] rounded-full"></div>
				<div class="vibe-orb-3 absolute top-[50%] left-[10%] h-[30%] w-[35%] rounded-full"></div>
				<div class="vibe-mesh absolute inset-0"></div>
				<div class="metric-noise absolute inset-0"></div>
			</div>
			<div class="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
				<p class="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">Vibe</p>
				<p class="mt-3 text-[clamp(3rem,14vw,5.5rem)] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_40px_rgba(139,92,246,0.3)]">
					{data.result.analysis?.tone?.trim() || '—'}
				</p>
				<p class="mt-5 max-w-xs text-center text-base leading-snug text-white/60">
					{describeTone(data.result.analysis?.tone)}
				</p>
			</div>
		</section>

		<!-- ━━━ Recap slide — best tweet, topics, hashtags ━━━ -->
		{#if hasBestTweet || showStyleRail}
			<section
				class="story-slide slide-recap relative flex h-dvh max-h-dvh snap-start snap-always flex-col overflow-hidden"
				aria-label="Highlights and style"
			>
				<div class="pointer-events-none absolute inset-0" aria-hidden="true">
					<div class="recap-gradient absolute inset-0"></div>
					<div class="metric-noise absolute inset-0"></div>
				</div>
				<div
					class="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-6 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+2rem))] pb-[max(2rem,env(safe-area-inset-bottom,0px))]"
				>
					<div class="mx-auto flex w-full max-w-sm flex-col gap-6">
						<!-- Best Tweet -->
						{#if data.result.analysis?.best_tweet}
							<div>
								<p class="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#1d9bf0]">Best Tweet</p>
								<div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
									<blockquote class="text-[16px] leading-snug text-[#e7e9ea]">
										"{data.result.analysis.best_tweet}"
									</blockquote>
									{#if matchedBestTweet}
										<div class="mt-4 flex items-center gap-5 text-xs tabular-nums text-[#71767b]">
											<span class="flex items-center gap-1.5">
												<svg class="h-3.5 w-3.5 text-[#f91880]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
												{formatCount(matchedBestTweet.likeCount)}
											</span>
											<span class="flex items-center gap-1.5">
												<svg class="h-3.5 w-3.5 text-[#00ba7c]" viewBox="0 0 24 24" fill="currentColor"><path d="M4.75 3.79l4.503 4.75-1.526 1.453L6 7.234V16.5h2V20H2v-3.5h2V6.234L1.25 9.992.22 8.72 4.75 3.79zm14.5 0l4.53 4.932-1.03 1.272-1.75-1.758V16.5h2V20h-6v-3.5h2V7.234l-1.727 1.758-1.527-1.453 4.503-4.75z"/></svg>
												{formatCount(matchedBestTweet.retweetCount)}
											</span>
											<span class="flex items-center gap-1.5">
												<svg class="h-3.5 w-3.5 text-[#1d9bf0]" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-4h2v4h-2z"/></svg>
												{matchedBestTweet.viewCount > 0 ? formatCount(matchedBestTweet.viewCount) : '0'}
											</span>
										</div>
									{/if}
									{#if data.result.analysis.best_tweet_why}
										<p class="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-snug text-[#555b61]">{data.result.analysis.best_tweet_why}</p>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Topics -->
						{#if data.result.analysis?.top_topics && data.result.analysis.top_topics.length > 0}
							<div>
								<p class="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#71767b]">Topics</p>
								<div class="flex flex-wrap gap-2">
									{#each data.result.analysis.top_topics as topic}
										<span class="rounded-full border border-[#1d9bf0]/20 bg-[#1d9bf0]/[0.08] px-3 py-1.5 text-sm font-semibold text-[#1d9bf0]">#{topic}</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Hashtags -->
						{#if tweetAgg.topHashtags.length > 0}
							<div>
								<p class="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#71767b]">Hashtags</p>
								<div class="flex flex-wrap gap-2">
									{#each tweetAgg.topHashtags as { tag, count }}
										<span class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-sm text-[#e7e9ea]">
											#{tag}
											<span class="font-bold text-white">{count}</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Mentions -->
						{#if tweetAgg.topMentions.length > 0}
							<div>
								<p class="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#71767b]">Mentions</p>
								<div class="flex flex-col gap-2">
									{#each tweetAgg.topMentions as { handle, count }}
										<div class="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
											<span class="text-sm text-[#e7e9ea]">@{handle}</span>
											<span class="text-sm font-bold tabular-nums text-white">{count}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Posting style -->
						{#if data.result.analysis?.posting_style}
							<p class="text-sm leading-relaxed text-[#555b61]">{data.result.analysis.posting_style}</p>
						{/if}
					</div>
				</div>
			</section>
		{/if}
	</div>

	<!-- ──────────────────────────────────────────────── -->
	<!-- DESKTOP: center column with hero header         -->
	<!-- ──────────────────────────────────────────────── -->
	<div class="hidden sm:block">
		<!-- Video block -->
		{#if data.result.videoUrl}
			<div class="border-b border-[#2f3336] p-3">
				<div class="overflow-hidden rounded-2xl border border-white/[0.08]">
					{#key data.result.videoUrl}
						<video
							src={data.result.videoUrl}
							controls loop muted autoplay playsinline
							class="aspect-video w-full object-cover"
						></video>
					{/key}
				</div>
			</div>
		{:else if data.result.videoError?.trim()}
			<div class="border-b border-[#2f3336] px-4 py-4">
				<p class="text-lg leading-relaxed text-[#f4212e]">
					Video could not be generated ({data.result.videoError}). Check the server log and your Magic Hour account credits.
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

		<!-- Profile hero header -->
		<div class="profile-hero relative border-b border-[#2f3336]">
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<div class="absolute inset-0 bg-gradient-to-br from-[#1d9bf0]/[0.05] via-transparent to-transparent"></div>
			</div>

			<div class="relative px-5 py-7">
				<!-- Handle + share -->
				<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
					<div class="min-w-0 flex-1">
						<h1 class="text-3xl font-extrabold tracking-tight text-[#e7e9ea] sm:text-4xl">
							@{data.result.handle}
						</h1>
						{#if data.result.profile?.name?.trim()}
							<p class="mt-0.5 text-lg text-[#a0a8b0]">{data.result.profile.name.trim()}</p>
						{/if}
					</div>
					<div class="flex shrink-0 flex-wrap justify-end gap-2" role="group" aria-label="Share this Wrapped">
						<button
							type="button"
							title="System share sheet on supported devices, or open X with this text pre-filled"
							onclick={shareNative}
							class="inline-flex min-h-9 items-center justify-center rounded-full bg-[#1d9bf0] px-5 text-[15px] font-bold text-white shadow-[0_4px_16px_-4px_rgba(29,155,240,0.4)] transition-all hover:bg-[#1a8cd8] hover:shadow-[0_6px_20px_-4px_rgba(29,155,240,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
						>
							Share
						</button>
					</div>
				</div>

				<!-- Archetype badge -->
				{#if data.result.analysis?.archetype}
					<div class="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1d9bf0]/20 bg-[#1d9bf0]/[0.08] px-4 py-1.5">
						<span class="text-sm font-bold text-[#1d9bf0]">{data.result.analysis.archetype}</span>
					</div>
				{/if}

				{#if data.result.analysis?.archetype_description?.trim()}
					<p class="mt-3 max-w-xl text-[17px] leading-snug text-[#d6d9db]">
						{data.result.analysis.archetype_description.trim()}
					</p>
				{/if}

				<!-- Vibe summary with voiceover toggle -->
				{#if data.result.analysis?.vibe_summary?.trim()}
					<div class="mt-5 flex max-w-xl items-start gap-2.5">
						<p class="min-w-0 flex-1 text-[17px] leading-snug text-[#a0a8b0]">
							{data.result.analysis.vibe_summary.trim()}
						</p>
						{#if data.result.audioUrl}
							<button
								type="button"
								class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#e7e9ea] transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
		</div>

		<!-- No posts notice -->
		{#if tweetAgg.count === 0}
			<div class="border-b border-[#2f3336] px-5 py-6">
				<p class="mb-1 text-sm font-medium uppercase tracking-wider text-[#71767b]">Post data</p>
				<p class="text-[18px] leading-relaxed text-[#e7e9ea]">
					No posts were included in this wrap yet, so engagement stats and hashtag breakdowns are not available.
				</p>
				<p class="mt-2 text-[15px] leading-snug text-[#71767b]">
					Generate a new wrap after your archive is connected so posts can be analysed.
				</p>
			</div>
		{/if}

		<!-- Summary grid -->
		<div class="border-b border-[#2f3336] px-5 py-5">
			<div class="grid gap-3 sm:grid-cols-3">
				<!-- Followers -->
				{#if data.result.profile}
					<div class="summary-card summary-card-blue relative overflow-hidden rounded-2xl border border-white/[0.08] px-4 py-4">
						<div class="pointer-events-none absolute inset-0" aria-hidden="true">
							<div class="absolute -top-[30%] -right-[20%] h-[80%] w-[70%] rounded-full bg-[#3b82f6]/[0.08] blur-[40px]"></div>
						</div>
						<div class="relative">
							<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3b82f6]">Followers</p>
							<p class="mt-1 text-2xl font-extrabold text-white">{formatCount(data.result.profile.followers)}</p>
							<p class="mt-2 text-sm leading-snug text-[#a0a8b0]">
								{describeFollowerPercentile(data.result.profile.followers)}
							</p>
							{#if followersComparison}
								<p class="mt-1 text-sm leading-snug text-[#71767b]">{followersComparison}</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Peak Hour -->
				<div class="summary-card summary-card-amber relative overflow-hidden rounded-2xl border border-white/[0.08] px-4 py-4">
					<div class="pointer-events-none absolute inset-0" aria-hidden="true">
						<div class="absolute -bottom-[20%] -left-[20%] h-[80%] w-[70%] rounded-full bg-[#f59e0b]/[0.07] blur-[40px]"></div>
					</div>
					<div class="relative">
						<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f59e0b]">Peak Hour</p>
						<p class="mt-1 text-2xl font-extrabold text-white">{data.result.analysis?.peak_hour?.trim() || '—'}</p>
						<p class="mt-2 text-sm leading-snug text-[#a0a8b0]">
							{describePeakHour(data.result.analysis?.peak_hour)}
						</p>
						{#if peakHourComparison}
							<p class="mt-1 text-sm leading-snug text-[#71767b]">{peakHourComparison}</p>
						{/if}
					</div>
				</div>

				<!-- Tone -->
				<div class="summary-card summary-card-violet relative overflow-hidden rounded-2xl border border-white/[0.08] px-4 py-4">
					<div class="pointer-events-none absolute inset-0" aria-hidden="true">
						<div class="absolute -top-[20%] -left-[15%] h-[80%] w-[70%] rounded-full bg-[#8b5cf6]/[0.08] blur-[40px]"></div>
					</div>
					<div class="relative">
						<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">Vibe</p>
						<p class="mt-1 text-2xl font-extrabold text-white">{data.result.analysis?.tone?.trim() || '—'}</p>
						<p class="mt-2 text-sm leading-snug text-[#a0a8b0]">
							{describeTone(data.result.analysis?.tone)}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* ─── Hero ─── */
	.profile-hero {
		background: linear-gradient(180deg, rgba(29, 155, 240, 0.05) 0%, transparent 100%);
	}

	.hero-fallback-bg {
		background: linear-gradient(135deg, #1d9bf0 0%, #0a1628 40%, #0f0a1a 100%);
	}

	/* ─── Archetype slide ─── */
	.archetype-slide {
		background: linear-gradient(145deg, #0a0a12 0%, #0d0618 35%, #0a1628 70%, #050a12 100%);
	}
	.archetype-orb-1 {
		background: radial-gradient(circle, rgba(29, 155, 240, 0.15) 0%, transparent 70%);
		animation: float-orb 8s ease-in-out infinite;
	}
	.archetype-orb-2 {
		background: radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%);
		animation: float-orb 10s ease-in-out infinite reverse;
	}
	.archetype-orb-3 {
		background: radial-gradient(circle, rgba(249, 24, 128, 0.08) 0%, transparent 70%);
		animation: float-orb 12s ease-in-out infinite 2s;
	}
	.archetype-grid {
		background-image:
			linear-gradient(rgba(29, 155, 240, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(29, 155, 240, 0.03) 1px, transparent 1px);
		background-size: 60px 60px;
		mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 70%);
	}

	/* ─── Total Likes slide ─── */
	.slide-likes {
		background: linear-gradient(160deg, #0a0008 0%, #1a0514 30%, #120218 60%, #080012 100%);
	}
	.likes-orb-1 {
		background: radial-gradient(circle, rgba(249, 24, 128, 0.2) 0%, transparent 65%);
		animation: float-orb 9s ease-in-out infinite;
	}
	.likes-orb-2 {
		background: radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 65%);
		animation: float-orb 11s ease-in-out infinite reverse;
	}
	.likes-orb-3 {
		background: radial-gradient(circle, rgba(249, 24, 128, 0.08) 0%, transparent 60%);
		animation: float-orb 7s ease-in-out infinite 1s;
	}

	/* ─── Avg Views slide ─── */
	.slide-views {
		background: linear-gradient(160deg, #020c1b 0%, #0a1929 30%, #061224 60%, #030810 100%);
	}
	.views-orb-1 {
		background: radial-gradient(circle, rgba(29, 155, 240, 0.2) 0%, transparent 65%);
		animation: float-orb 10s ease-in-out infinite;
	}
	.views-orb-2 {
		background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 65%);
		animation: float-orb 8s ease-in-out infinite reverse;
	}
	.views-orb-3 {
		background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 60%);
		animation: float-orb 12s ease-in-out infinite 2s;
	}
	.views-grid {
		background-image:
			linear-gradient(rgba(29, 155, 240, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(29, 155, 240, 0.04) 1px, transparent 1px);
		background-size: 40px 40px;
		mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 70%);
	}

	/* ─── Followers slide ─── */
	.slide-followers {
		background: linear-gradient(160deg, #020618 0%, #0c1a3d 30%, #091330 60%, #030712 100%);
	}
	.followers-orb-1 {
		background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 65%);
		animation: float-orb 9s ease-in-out infinite 1s;
	}
	.followers-orb-2 {
		background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 65%);
		animation: float-orb 11s ease-in-out infinite reverse;
	}
	.followers-rings {
		background-image: radial-gradient(circle at 50% 45%, transparent 15%, rgba(59, 130, 246, 0.03) 16%, transparent 17%),
			radial-gradient(circle at 50% 45%, transparent 30%, rgba(59, 130, 246, 0.025) 31%, transparent 32%),
			radial-gradient(circle at 50% 45%, transparent 45%, rgba(59, 130, 246, 0.02) 46%, transparent 47%);
	}

	/* ─── Peak Hour slide ─── */
	.peak-cloud-1 {
		opacity: 0.08;
		filter: blur(60px);
		animation: drift-cloud 15s ease-in-out infinite;
	}
	.peak-cloud-2 {
		opacity: 0.06;
		filter: blur(50px);
		animation: drift-cloud 18s ease-in-out infinite reverse;
	}
	.peak-cloud-3 {
		opacity: 0.05;
		filter: blur(40px);
		animation: drift-cloud 12s ease-in-out infinite 3s;
	}

	/* ─── Tone / Vibe slide ─── */
	.slide-vibe {
		background: linear-gradient(160deg, #0a0014 0%, #150824 30%, #0d0520 60%, #06000e 100%);
	}
	.vibe-orb-1 {
		background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 65%);
		animation: float-orb 10s ease-in-out infinite;
	}
	.vibe-orb-2 {
		background: radial-gradient(circle, rgba(192, 132, 252, 0.12) 0%, transparent 65%);
		animation: float-orb 8s ease-in-out infinite reverse;
	}
	.vibe-orb-3 {
		background: radial-gradient(circle, rgba(249, 24, 128, 0.08) 0%, transparent 60%);
		animation: float-orb 13s ease-in-out infinite 2s;
	}
	.vibe-mesh {
		background-image:
			radial-gradient(at 20% 30%, rgba(139, 92, 246, 0.04) 0%, transparent 50%),
			radial-gradient(at 80% 70%, rgba(249, 24, 128, 0.03) 0%, transparent 50%),
			radial-gradient(at 50% 50%, rgba(99, 102, 241, 0.02) 0%, transparent 50%);
	}

	/* ─── Recap slide ─── */
	.slide-recap {
		background: linear-gradient(180deg, #0a0a12 0%, #0d1117 50%, #080808 100%);
	}
	.recap-gradient {
		background:
			radial-gradient(ellipse 80% 40% at 50% 0%, rgba(29, 155, 240, 0.06) 0%, transparent 70%),
			radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139, 92, 246, 0.04) 0%, transparent 70%);
	}

	/* ─── Shared grain/noise texture ─── */
	.metric-noise {
		opacity: 0.3;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 256px 256px;
	}

	/* ─── Desktop summary cards ─── */
	.summary-card {
		transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
	}
	.summary-card-blue {
		background: linear-gradient(135deg, #0c1425 0%, #16181c 50%, #0f1a2e 100%);
	}
	.summary-card-amber {
		background: linear-gradient(135deg, #1a1508 0%, #16181c 50%, #1a150a 100%);
	}
	.summary-card-violet {
		background: linear-gradient(135deg, #140c24 0%, #16181c 50%, #16102a 100%);
	}
	.summary-card:hover {
		border-color: rgba(255, 255, 255, 0.12);
		transform: translateY(-2px);
	}
	.summary-card-blue:hover {
		box-shadow: 0 8px 32px -8px rgba(59, 130, 246, 0.15);
	}
	.summary-card-amber:hover {
		box-shadow: 0 8px 32px -8px rgba(245, 158, 11, 0.12);
	}
	.summary-card-violet:hover {
		box-shadow: 0 8px 32px -8px rgba(139, 92, 246, 0.15);
	}

	/* ─── Animations ─── */
	@keyframes float-orb {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33% { transform: translate(3%, -4%) scale(1.05); }
		66% { transform: translate(-2%, 3%) scale(0.97); }
	}

	@keyframes drift-cloud {
		0%, 100% { transform: translateX(0); }
		50% { transform: translateX(8%); }
	}

	@keyframes twinkle {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.8; }
	}
	.star { animation: twinkle 3s ease-in-out infinite; }
	.star-1 { animation-duration: 2.5s; }
	.star-2 { animation-duration: 3.5s; animation-delay: 0.5s; }
	.star-3 { animation-duration: 4s; animation-delay: 1s; }
	.star-4 { animation-duration: 3s; animation-delay: 1.5s; }
	.star-5 { animation-duration: 2.8s; animation-delay: 0.8s; }

	@keyframes scroll-hint-pulse {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.5; }
	}
	.scroll-hint {
		animation: scroll-hint-pulse 2.5s ease-in-out infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-hint,
		.star,
		.archetype-orb-1, .archetype-orb-2, .archetype-orb-3,
		.likes-orb-1, .likes-orb-2, .likes-orb-3,
		.views-orb-1, .views-orb-2, .views-orb-3,
		.followers-orb-1, .followers-orb-2,
		.vibe-orb-1, .vibe-orb-2, .vibe-orb-3,
		.peak-cloud-1, .peak-cloud-2, .peak-cloud-3 {
			animation: none;
		}
		.scroll-hint { opacity: 0.3; }
		.star { opacity: 0.4; }
	}
</style>
