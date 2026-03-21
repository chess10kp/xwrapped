<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import SiteRightRail from '$lib/components/SiteRightRail.svelte';
	import SiteSidebar from '$lib/components/SiteSidebar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="flex min-h-screen bg-black text-[#e7e9ea]">
	<SiteSidebar />
	<div class="flex min-h-0 min-w-0 flex-1">
		<div class="min-h-screen w-full max-w-[600px] shrink-0 border-r border-[#2f3336]">
			{@render children()}
		</div>
		<SiteRightRail />
	</div>
</div>
