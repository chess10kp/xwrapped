<script lang="ts">
	import { page } from '$app/state';
	import ProfileWrappedRail from '$lib/components/ProfileWrappedRail.svelte';
	import type { WrappedResult } from '$lib/server/types';

	type ProfileLoad = {
		result: WrappedResult;
	};

	const profileWrappedLoad = $derived.by((): ProfileLoad | null => {
		if (page.route.id !== '/profile/[handle]') return null;
		const d = page.data as ProfileLoad | null | undefined;
		if (!d?.result || d.result.status !== 'complete') return null;
		return d;
	});
</script>

{#if profileWrappedLoad}
	<aside
		class="hidden w-[350px] shrink-0 flex-col border-r border-[#2f3336] py-2 pl-6 pr-4 sm:flex lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain"
		aria-label="Wrapped highlights and engagement"
	>
		<div class="flex flex-col gap-4 pb-4 pl-1">
			<ProfileWrappedRail
				result={profileWrappedLoad.result}
				sections={['engagement', 'bestTweet']}
			/>
		</div>
	</aside>
{/if}
