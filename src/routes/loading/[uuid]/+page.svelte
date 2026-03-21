<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { PersonalityAnalysis } from '$lib/server/types';

	let { data } = $props<{ data: PageData }>();
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

<div class="flex min-h-screen flex-col items-center justify-center bg-base-100 p-4">
	<div class="w-full max-w-2xl space-y-8 text-center">
		{#if status === 'scraping'}
			<div class="flex flex-col items-center gap-4">
				<div class="text-6xl animate-bounce">𝕏</div>
				<p class="text-2xl text-base-content">{getStatusText()}</p>
			</div>
		{:else if status === 'analysing'}
			<div class="flex flex-col items-center gap-4">
				<div class="text-6xl animate-pulse">🧠</div>
				<p class="text-2xl text-base-content">{getStatusText()}</p>
			</div>
		{:else if status === 'generating' && analysis}
			<div class="flex flex-col items-center gap-6">
				<span class="loading loading-spinner loading-lg text-primary"></span>
				<p class="text-2xl text-base-content">{getStatusText()}</p>

				<div class="card bg-base-200 shadow-xl w-full text-left">
					<div class="card-body gap-4">
						<div class="text-center">
							<p class="text-sm uppercase tracking-wider text-base-content/50">Your Archetype</p>
							<p class="text-3xl font-bold text-primary">{analysis.archetype}</p>
						</div>

						<div class="flex flex-wrap justify-center gap-2">
							{#each analysis.top_topics as topic}
								<span class="badge badge-primary badge-lg">{topic}</span>
							{/each}
						</div>

						<div class="grid grid-cols-2 gap-4 text-center">
							<div>
								<p class="text-sm uppercase text-base-content/50">Tone</p>
								<p class="font-semibold text-base-content">{analysis.tone}</p>
							</div>
							<div>
								<p class="text-sm uppercase text-base-content/50">Peak Hour</p>
								<p class="font-semibold text-base-content">{analysis.peak_hour}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else if status === 'error'}
			<div class="flex flex-col items-center gap-4">
				<div class="text-6xl">❌</div>
				<p class="text-2xl text-base-content">{getStatusText()}</p>
				<a href="/" class="link link-primary">Try again</a>
			</div>
		{:else}
			<div class="flex flex-col items-center gap-4">
				<span class="loading loading-spinner loading-lg text-primary"></span>
				<p class="text-2xl text-base-content">{getStatusText()}</p>
			</div>
		{/if}
	</div>
</div>
