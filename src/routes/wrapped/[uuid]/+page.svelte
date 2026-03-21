<script lang="ts">
	let { data } = $props<{ result: any }>();

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
	<meta property="og:description" content="Archetype: {data.result.analysis?.archetype} — {data.result.analysis?.archetype_description}" />
	<meta property="og:type" content="video.other" />
	<meta property="og:video" content={data.result.videoUrl || ''} />
	<meta name="twitter:card" content="player" />
</svelte:head>

<div class="min-h-screen pb-24">
	<div class="max-w-4xl mx-auto p-4 space-y-8">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-accent">@{data.result.handle}'s X Wrapped</h1>
		</div>

		{#if data.result.videoUrl}
			<div class="aspect-video w-full overflow-hidden rounded-lg bg-surface">
				<video
					src={data.result.videoUrl}
					controls
					autoplay
					class="h-full w-full object-cover"
				>
					<track kind="captions" />
				</video>
			</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg bg-surface p-6 text-center">
				<p class="mb-2 text-sm text-text/50 uppercase tracking-wider">Archetype</p>
				<p class="text-xl font-bold text-accent">{data.result.analysis?.archetype}</p>
				<p class="mt-2 text-sm text-text/70">{data.result.analysis?.archetype_description}</p>
			</div>

			<div class="rounded-lg bg-surface p-6 text-center">
				<p class="mb-2 text-sm text-text/50 uppercase tracking-wider">Top Topics</p>
				<div class="flex flex-wrap gap-2 justify-center">
					{#each data.result.analysis?.top_topics || [] as topic}
						<span class="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">
							{topic}
						</span>
					{/each}
				</div>
			</div>

			<div class="rounded-lg bg-surface p-6 text-center">
				<p class="mb-2 text-sm text-text/50 uppercase tracking-wider">Peak Hour</p>
				<p class="text-xl font-semibold text-text">{data.result.analysis?.peak_hour}</p>
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="rounded-lg bg-surface p-6 text-center">
				<p class="mb-2 text-sm text-text/50 uppercase tracking-wider">Tone</p>
				<p class="text-xl font-semibold text-text">{data.result.analysis?.tone}</p>
			</div>

			<div class="rounded-lg bg-surface p-6 text-center">
				<p class="mb-2 text-sm text-text/50 uppercase tracking-wider">Tweets Analysed</p>
				<p class="text-xl font-semibold text-text">{data.result.tweets?.length || 0}</p>
			</div>
		</div>

		{#if data.result.analysis?.best_tweet}
			<div class="rounded-lg bg-surface p-6">
				<p class="mb-3 text-sm text-text/50 uppercase tracking-wider">Best Tweet</p>
				<p class="text-lg text-text">"{data.result.analysis.best_tweet}"</p>
				<p class="mt-2 text-sm text-text/70">{data.result.analysis.best_tweet_why}</p>
			</div>
		{/if}

		<div class="rounded-lg bg-surface p-6">
			<p class="mb-3 text-sm text-text/50 uppercase tracking-wider">Vibe Summary</p>
			<p class="text-lg text-text">{data.result.analysis?.vibe_summary}</p>
		</div>
	</div>

	<div class="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border">
		<div class="flex justify-center gap-4 p-4">
			<button
				onclick={shareOnX}
				class="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
			>
				<span>🔗</span> Share on X
			</button>

			{#if data.result.videoUrl}
				<button
					onclick={downloadVideo}
					class="flex items-center gap-2 rounded-lg bg-surface px-6 py-3 font-semibold text-text border border-text/20 transition hover:bg-surface/80"
				>
					<span>⬇</span> Download
				</button>
			{/if}
		</div>
	</div>
</div>
