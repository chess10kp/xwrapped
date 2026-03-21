<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import SiteRightRail from '$lib/components/SiteRightRail.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="flex min-h-dvh bg-black text-[#e7e9ea]">
	<div class="flex min-h-0 min-w-0 flex-1 flex-nowrap">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<div
				class="mx-auto flex min-h-0 w-full max-w-[600px] flex-1 flex-col border-r border-[#2f3336]"
			>
				{@render children()}
			</div>
		</div>
		<SiteRightRail />
	</div>
</div>
