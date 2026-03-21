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

<aside
	class="hidden w-[350px] shrink-0 flex-col py-2 pl-4 pr-6 sm:flex lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain"
	aria-label={profileWrappedLoad ? 'Wrapped stats' : undefined}
	aria-hidden={profileWrappedLoad ? undefined : true}
>
	<div class="pr-1">
		{#if profileWrappedLoad}
			<div class="flex flex-col gap-4 pb-4" aria-label="Wrapped stats for this profile">
				<ProfileWrappedRail
					result={profileWrappedLoad.result}
					sections={['style', 'tags', 'topTopics']}
				/>
			</div>
		{/if}
	</div>
</aside>
