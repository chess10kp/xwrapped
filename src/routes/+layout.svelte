<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import SiteLeftRail from '$lib/components/SiteLeftRail.svelte';
	import SiteRightRail from '$lib/components/SiteRightRail.svelte';
	import type { LayoutData } from './$types';

	let { children, data } = $props<{ data: LayoutData; children: import('svelte').Snippet }>();

	/** Client navigations can leave root layout data stale; `page.route` is always current. */
	const showRightRail = $derived(
		data.showRightRail && page.route.id !== '/loading/[handle]'
	);

	/** Highlights + engagement live in `SiteLeftRail` on profile; mirrors `showRightRail` eligibility. */
	const showLeftRail = $derived(
		data.showRightRail && page.route.id === '/profile/[handle]'
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-dvh bg-black text-[#e7e9ea] lg:h-dvh lg:overflow-hidden">
	<div
		class="flex w-full min-w-0 flex-nowrap items-start lg:h-full lg:min-h-0 lg:items-stretch"
	>
		{#if showLeftRail}
			<SiteLeftRail />
		{/if}
		<div
			class="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain"
		>
			<div
				class="mx-auto flex w-full max-w-[600px] flex-col"
				class:border-l={showLeftRail}
				class:border-r={showRightRail}
				class:border-[#2f3336]={showLeftRail || showRightRail}
			>
				{@render children()}
			</div>
		</div>
		{#if showRightRail}
			<SiteRightRail />
		{/if}
	</div>
</div>
