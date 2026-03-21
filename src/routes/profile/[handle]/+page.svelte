<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

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
</script>

<svelte:head>
	<title>@{data.result.handle}'s X Wrapped</title>
	<meta property="og:title" content="@{data.result.handle}'s X Wrapped" />
	<meta
		property="og:description"
		content="Archetype: {data.result.analysis?.archetype} — {data.result.analysis?.archetype_description}"
	/>
	<meta property="og:type" content="video.other" />
	<meta property="og:video" content={data.result.videoUrl || ''} />
	<meta name="twitter:card" content="player" />
</svelte:head>

<div class="min-h-screen pb-28">
	<div>

		<!-- Profile header -->
		<div class="border-b border-[#2f3336] px-4 py-6">
			<div class="flex items-center gap-4">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-[#1d9bf0] text-2xl font-bold text-white">𝕏</div>
				<div>
					<h1 class="text-xl font-extrabold text-[#e7e9ea]">@{data.result.handle}</h1>
					<p class="text-[#1d9bf0]">{data.result.analysis?.archetype}</p>
					<p class="mt-1 text-sm text-[#71767b]">{data.result.analysis?.archetype_description}</p>
					{#if data.result.webSearchContext}
						<p class="mt-2 text-xs text-[#71767b]">
							Includes public web context (Exa) in addition to posts from X.
						</p>
					{/if}
				</div>
			</div>
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

		<!-- Stats grid -->
		<div class="border-b border-[#2f3336] px-4 py-5">
			<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Stats</p>
			<div class="grid grid-cols-3 gap-4">
				<div class="text-center">
					<p class="text-2xl font-bold text-[#e7e9ea]">{data.result.tweets?.length || 0}</p>
					<p class="text-xs text-[#71767b]">Tweets Analysed</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-[#e7e9ea]">{data.result.analysis?.peak_hour}</p>
					<p class="text-xs text-[#71767b]">Peak Hour</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-[#e7e9ea]">{data.result.analysis?.tone}</p>
					<p class="text-xs text-[#71767b]">Tone</p>
				</div>
			</div>
		</div>

		<!-- Topics -->
		<div class="border-b border-[#2f3336] px-4 py-5">
			<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Top Topics</p>
			<div class="flex flex-wrap gap-2">
				{#each data.result.analysis?.top_topics || [] as topic}
					<span class="rounded-full bg-[#1d9bf0]/10 px-3 py-1 text-sm font-medium text-[#1d9bf0]">#{topic}</span>
				{/each}
			</div>
		</div>

		<!-- Best Tweet -->
		{#if data.result.analysis?.best_tweet}
			<div class="border-b border-[#2f3336] px-4 py-5">
				<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Best Tweet</p>
				<div class="rounded-2xl border border-[#2f3336] bg-[#16181c] p-4">
					<div class="mb-2 flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d9bf0] text-lg font-bold text-white">𝕏</div>
						<div>
							<p class="font-bold text-[#e7e9ea]">@{data.result.handle}</p>
						</div>
					</div>
					<p class="text-[#e7e9ea]">"{data.result.analysis.best_tweet}"</p>
					<!-- "Why" as a reply -->
					<div class="mt-3 border-t border-[#2f3336] pt-3">
						<p class="text-sm text-[#71767b]">{data.result.analysis.best_tweet_why}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Vibe Summary -->
		<div class="border-b border-[#2f3336] px-4 py-5">
			<p class="mb-3 text-xs font-medium uppercase tracking-wider text-[#71767b]">Vibe Summary</p>
			<p class="text-[#e7e9ea]">{data.result.analysis?.vibe_summary}</p>
		</div>

	</div>

	<!-- Bottom action bar -->
	<div
		class="fixed bottom-0 right-0 border-t border-[#2f3336] bg-black/95 backdrop-blur-sm left-[72px] xl:left-[275px]"
	>
		<div class="mx-auto flex w-full max-w-[600px] items-center justify-center gap-3 px-4 py-3">
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
