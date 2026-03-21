<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PersonalityAnalysis } from '$lib/server/types';

	let { data } = $props<{ uuid: string; handle: string }>();
	let status = $state('scraping');
	let analysis = $state<PersonalityAnalysis | null>(null);

	$effect(() => {
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/status/${data.uuid}`);
				const json = await res.json();
				status = json.status;
				if (json.analysis) analysis = json.analysis;
				if (json.status === 'complete') {
					clearInterval(interval);
					goto(`/wrapped/${data.uuid}`);
				}
			} catch (err) {
				console.error('Polling error:', err);
			}
		}, 2000);
		return () => clearInterval(interval);
	});

	function getStatusText(): string {
		switch (status) {
			case 'scraping':
				return `Finding @${data.handle} on X...`;
			case 'analysing':
				return 'Reading their tweets...';
			case 'generating':
				return 'Creating your cinematic moment...';
			case 'complete':
				return 'Done!';
			case 'error':
				return 'Something went wrong';
			default:
				return 'Processing...';
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<div class="w-full max-w-2xl space-y-8 text-center">
		{#if status === 'scraping'}
			<div class="space-y-4">
				<div class="mx-auto h-16 w-16 animate-bounce text-6xl">𝕏</div>
				<p class="text-2xl text-text">{getStatusText()}</p>
			</div>
		{:else if status === 'analysing'}
			<div class="space-y-4">
				<div class="mx-auto h-16 w-16 animate-pulse text-6xl">🧠</div>
				<p class="text-2xl text-text">{getStatusText()}</p>
			</div>
		{:else if status === 'generating' && analysis}
			<div class="space-y-6">
				<div class="mx-auto h-16 w-16 animate-spin text-6xl">🎬</div>
				<p class="text-2xl text-text">{getStatusText()}</p>

				<div class="space-y-4 rounded-lg bg-surface p-6 text-left">
					<div class="text-center">
						<p class="text-sm text-text/50 uppercase tracking-wider">Your Archetype</p>
						<p class="text-3xl font-bold text-accent">{analysis.archetype}</p>
					</div>

					<div class="flex flex-wrap gap-2 justify-center">
						{#each analysis.top_topics as topic}
							<span class="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">
								{topic}
							</span>
						{/each}
					</div>

					<div class="grid grid-cols-2 gap-4 text-center">
						<div>
							<p class="text-sm text-text/50 uppercase">Tone</p>
							<p class="font-semibold text-text">{analysis.tone}</p>
						</div>
						<div>
							<p class="text-sm text-text/50 uppercase">Peak Hour</p>
							<p class="font-semibold text-text">{analysis.peak_hour}</p>
						</div>
					</div>
				</div>
			</div>
		{:else if status === 'error'}
			<div class="space-y-4">
				<div class="mx-auto text-6xl">❌</div>
				<p class="text-2xl text-text">{getStatusText()}</p>
				<a href="/" class="text-accent hover:underline">Try again</a>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
				<p class="text-2xl text-text">{getStatusText()}</p>
			</div>
		{/if}
	</div>
</div>