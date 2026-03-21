<script lang="ts">
	import { page } from '$app/state';
	import ProfileWrappedRail from '$lib/components/ProfileWrappedRail.svelte';
	import type { WrappedResult } from '$lib/server/types';

	type ProfileLoad = {
		result: WrappedResult;
		tweetKinds?: ('tweet' | 'repost')[] | null;
	};

	const profileWrappedLoad = $derived.by((): ProfileLoad | null => {
		if (page.route.id !== '/profile/[handle]') return null;
		const d = page.data as ProfileLoad | null | undefined;
		if (!d?.result || d.result.status !== 'complete') return null;
		return d;
	});

	const showWhatsHappening = $derived(
		page.route.id !== '/loading/[handle]' && !profileWrappedLoad
	);

	const newsItems = [
		{
			category: 'Technology · Trending',
			title: 'X Wrapped 2025',
			stat: '12.5K posts'
		},
		{
			category: 'News · Last hour',
			title: 'Year in review features roll out globally',
			stat: '4,201 posts'
		},
		{
			category: 'Sports · Trending',
			title: 'Playoffs',
			stat: 'Trending with #GameDay'
		}
	] as const;
</script>

<aside
	class="sticky top-0 hidden h-[100dvh] min-h-0 w-[350px] shrink-0 flex-col overflow-hidden py-2 pl-4 pr-6 sm:flex"
	aria-label="Trends and wrapped stats"
>
	<div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
	{#if profileWrappedLoad}
		<div class="flex flex-col gap-4 pb-4" aria-label="Wrapped stats for this profile">
			<ProfileWrappedRail
				result={profileWrappedLoad.result}
				tweetKinds={profileWrappedLoad.tweetKinds ?? null}
				sections={['sentiment', 'patterns', 'tags']}
			/>
		</div>
	{:else if showWhatsHappening}
		<!-- What's happening (default when not on a completed Wrapped profile) -->
		<section
			class="overflow-hidden rounded-2xl border border-[#2f3336] bg-black"
			aria-labelledby="whats-happening-heading"
		>
			<div class="px-4 py-3">
				<h2 id="whats-happening-heading" class="text-[20px] font-extrabold text-[#e7e9ea]">
					What’s happening
				</h2>
			</div>
			<ul class="flex flex-col gap-2 px-3 pb-2">
				{#each newsItems as item, i (i)}
					<li>
						<button
							type="button"
							class="flex w-full flex-col items-start gap-0.5 rounded-2xl border border-[#2f3336] bg-black px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
						>
							<span class="text-[13px] text-[#71767b]">{item.category}</span>
							<span class="text-[15px] font-bold leading-5 text-[#e7e9ea]">{item.title}</span>
							<span class="text-[13px] text-[#71767b]">{item.stat}</span>
						</button>
					</li>
				{/each}
			</ul>
			<div class="px-4 py-3">
				<button
					type="button"
					class="text-[15px] text-[#1d9bf0] transition-colors hover:underline"
				>
					Show more
				</button>
			</div>
		</section>
	{/if}
	</div>
</aside>
