<script lang="ts">
	import { goto } from '$app/navigation';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import type { PageData } from './$types';
	import type { ProfileData } from '$lib/server/types';

	let { data } = $props<{ data: PageData }>();
	let status = $state('scraping');
	let profile = $state<ProfileData | null>(null);
	let jobError = $state<string | null>(null);

	$effect(() => {
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/status/${encodeURIComponent(data.handle)}`);
				const raw = await res.text();
				let json: {
					status?: string;
					profile?: ProfileData;
					error?: string;
				} = {};
				try {
					json = raw ? (JSON.parse(raw) as typeof json) : {};
				} catch {
					jobError = `Could not read status (${res.status}).`;
					status = 'error';
					clearInterval(interval);
					return;
				}

				if (!res.ok) {
					jobError = json.error ?? `Request failed (${res.status})`;
					status = 'error';
					clearInterval(interval);
					return;
				}

				status = json.status ?? status;
				if (json.profile) profile = json.profile;
				if (json.status === 'complete') {
					clearInterval(interval);
					goto(`/profile/${encodeURIComponent(data.handle)}`);
				} else if (json.status === 'error') {
					jobError = json.error ?? 'Unknown error';
					clearInterval(interval);
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
				return 'Finishing your wrap...';
			case 'complete':
				return 'Done!';
			case 'error':
				return 'Something went wrong';
			default:
				return 'Processing...';
		}
	}
</script>

<div class="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-16">
	<div class="w-full px-6">
		<div class="flex flex-col items-center gap-6 text-center">

			{#if status === 'scraping'}
				<div class="animate-bounce">
					<ProfileAvatar
						pictureUrl={profile?.profilePicture}
						handle={data.handle}
						sizeClass="h-24 w-24"
						textClass="text-5xl"
					/>
				</div>
				<p class="text-xl text-[#e7e9ea]">{getStatusText()}</p>

			{:else if status === 'analysing' || status === 'generating'}
				<div class="flex flex-col items-center gap-3">
					<ProfileAvatar
						pictureUrl={profile?.profilePicture}
						handle={data.handle}
						sizeClass="h-24 w-24"
						textClass="text-5xl"
					/>
					<div class="text-4xl animate-pulse">🧠</div>
				</div>
				<p class="text-xl text-[#e7e9ea]">{getStatusText()}</p>

			{:else if status === 'error'}
				<div class="text-6xl">❌</div>
				<p class="text-xl text-[#e7e9ea]">{getStatusText()}</p>
				{#if jobError}
					<p class="max-w-md text-sm text-[#71767b]">{jobError}</p>
				{/if}
				<a href="/" class="text-[#1d9bf0] transition-colors hover:underline">Try again</a>

			{:else}
				<svg class="h-8 w-8 animate-spin text-[#1d9bf0]" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<p class="text-xl text-[#e7e9ea]">{getStatusText()}</p>
			{/if}

		</div>
	</div>
</div>
