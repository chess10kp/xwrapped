<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import SiteRightRail from '$lib/components/SiteRightRail.svelte';
	import type { LayoutData } from './$types';

	let { children, data } = $props<{ data: LayoutData; children: import('svelte').Snippet }>();

	/** Client navigations can leave root layout data stale; `page.route` is always current. */
	const showRightRail = $derived(
		data.showRightRail && page.route.id !== '/loading/[handle]'
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="flex min-h-dvh bg-black text-[#e7e9ea]">
	<div class="flex min-h-0 min-w-0 flex-1 flex-nowrap">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<div
				class="mx-auto flex min-h-0 w-full max-w-[600px] flex-1 flex-col"
				class:border-r={showRightRail}
				class:border-[#2f3336]={showRightRail}
			>
				{@render children()}
			</div>
		</div>
		{#if showRightRail}
			<SiteRightRail />
		{/if}
	</div>
</div>
