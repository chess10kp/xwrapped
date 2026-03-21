<script lang="ts">
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
	class="sticky top-0 hidden h-screen w-[350px] shrink-0 flex-col gap-4 overflow-y-auto overscroll-contain py-2 pl-4 pr-6 xl:flex"
	aria-label="Search and trends"
>
	<!-- Search -->
	<form role="search" class="relative" onsubmit={(e) => e.preventDefault()}>
		<label for="right-rail-search" class="sr-only">Search</label>
		<div
			class="group flex h-11 items-center gap-3 rounded-full bg-[#202327] px-4 transition-colors focus-within:bg-black focus-within:ring-2 focus-within:ring-[#1d9bf0]"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-5 w-5 shrink-0 text-[#71767b]"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
				/>
			</svg>
			<input
				id="right-rail-search"
				type="search"
				placeholder="Search"
				class="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-[#e7e9ea] outline-none placeholder:text-[#71767b]"
				autocomplete="off"
			/>
		</div>
	</form>

	<!-- Subscribe to Premium -->
	<section
		class="overflow-hidden rounded-2xl border border-[#2f3336] bg-[#16181c] px-4 py-3"
		aria-labelledby="premium-heading"
	>
		<div class="flex items-start gap-3">
			<span
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7e9ea]"
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24" class="h-5 w-5 fill-black">
					<path
						d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
					/>
				</svg>
			</span>
			<div class="min-w-0 flex-1">
				<h2 id="premium-heading" class="text-[20px] font-extrabold leading-6 text-[#e7e9ea]">
					Subscribe to Premium
				</h2>
				<p class="mt-1 text-[15px] leading-5 text-[#e7e9ea]">
					Unlock new features and get paid for your content if eligible.
				</p>
				<button
					type="button"
					class="mt-3 rounded-full bg-[#e7e9ea] px-4 py-1.5 text-[15px] font-bold text-black transition-colors hover:bg-[#d7dbdc]"
				>
					Subscribe
				</button>
			</div>
		</div>
	</section>

	<!-- What's happening -->
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
</aside>
