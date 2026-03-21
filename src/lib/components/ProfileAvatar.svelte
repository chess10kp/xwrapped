<script lang="ts">
	let {
		pictureUrl,
		handle,
		sizeClass = 'h-16 w-16',
		textClass = 'text-2xl',
		/** When set, shown instead of the 𝕏 mark when there is no image (e.g. sidebar initials). */
		fallbackLabel,
		/** Background when there is no image; defaults to brand blue. */
		fallbackBgClass = 'bg-[#1d9bf0]'
	}: {
		pictureUrl?: string;
		handle: string;
		sizeClass?: string;
		textClass?: string;
		fallbackLabel?: string;
		fallbackBgClass?: string;
	} = $props();

	let failed = $state(false);
	const src = $derived((pictureUrl ?? '').trim());
	const showImg = $derived(Boolean(src) && !failed);

	$effect(() => {
		void src;
		failed = false;
	});
	const idleBg = $derived(showImg ? 'bg-black' : fallbackBgClass);
</script>

<div
	class="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-1 ring-[#2f3336] {idleBg} {sizeClass}"
>
	{#if showImg}
		<img
			src={src}
			alt={`@${handle} profile picture`}
			class="h-full w-full object-cover"
			onerror={() => (failed = true)}
		/>
	{:else if fallbackLabel}
		<span class={textClass} aria-hidden="true">{fallbackLabel}</span>
		<span class="sr-only">@{handle}</span>
	{:else}
		<span class={textClass} aria-hidden="true">𝕏</span>
		<span class="sr-only">@{handle}</span>
	{/if}
</div>
