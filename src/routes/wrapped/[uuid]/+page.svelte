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

<div class="min-h-screen bg-base-100 pb-28">
	<div class="container mx-auto max-w-4xl space-y-8 p-4">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-primary">@{data.result.handle}'s X Wrapped</h1>
		</div>

		{#if data.result.videoUrl}
			<div class="card bg-base-200 overflow-hidden shadow-xl">
				<figure class="aspect-video w-full">
					<video src={data.result.videoUrl} controls autoplay class="h-full w-full object-cover">
						<track kind="captions" />
					</video>
				</figure>
			</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body items-center text-center">
					<p class="text-sm uppercase tracking-wider text-base-content/50">Archetype</p>
					<h2 class="card-title text-primary justify-center">{data.result.analysis?.archetype}</h2>
					<p class="text-sm text-base-content/70">{data.result.analysis?.archetype_description}</p>
				</div>
			</div>

			<div class="card bg-base-200 shadow-xl">
				<div class="card-body items-center text-center">
					<p class="text-sm uppercase tracking-wider text-base-content/50">Top Topics</p>
					<div class="flex flex-wrap justify-center gap-2">
						{#each data.result.analysis?.top_topics || [] as topic}
							<span class="badge badge-primary badge-lg">{topic}</span>
						{/each}
					</div>
				</div>
			</div>

			<div class="card bg-base-200 shadow-xl">
				<div class="card-body items-center text-center">
					<p class="text-sm uppercase tracking-wider text-base-content/50">Peak Hour</p>
					<p class="text-xl font-semibold text-base-content">{data.result.analysis?.peak_hour}</p>
				</div>
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body items-center text-center">
					<p class="text-sm uppercase tracking-wider text-base-content/50">Tone</p>
					<p class="text-xl font-semibold text-base-content">{data.result.analysis?.tone}</p>
				</div>
			</div>

			<div class="card bg-base-200 shadow-xl">
				<div class="card-body items-center text-center">
					<p class="text-sm uppercase tracking-wider text-base-content/50">Tweets Analysed</p>
					<p class="text-xl font-semibold text-base-content">{data.result.tweets?.length || 0}</p>
				</div>
			</div>
		</div>

		{#if data.result.analysis?.best_tweet}
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<p class="text-sm uppercase tracking-wider text-base-content/50">Best Tweet</p>
					<p class="text-lg text-base-content">"{data.result.analysis.best_tweet}"</p>
					<p class="mt-2 text-sm text-base-content/70">{data.result.analysis.best_tweet_why}</p>
				</div>
			</div>
		{/if}

		<div class="card bg-base-200 shadow-xl">
			<div class="card-body">
				<p class="text-sm uppercase tracking-wider text-base-content/50">Vibe Summary</p>
				<p class="text-lg text-base-content">{data.result.analysis?.vibe_summary}</p>
			</div>
		</div>
	</div>

	<div
		class="fixed bottom-0 left-0 right-0 border-t border-base-300 bg-base-200/95 backdrop-blur-sm"
	>
		<div class="navbar min-h-0 justify-center gap-4 px-4 py-4">
			<button type="button" onclick={shareOnX} class="btn btn-primary gap-2">
				<span>🔗</span>
				Share on X
			</button>

			{#if data.result.videoUrl}
				<button type="button" onclick={downloadVideo} class="btn btn-outline btn-primary gap-2">
					<span>⬇</span>
					Download
				</button>
			{/if}
		</div>
	</div>
</div>
