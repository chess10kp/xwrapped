<script lang="ts">
	import { page } from '$app/state';

	const path = $derived(page.url.pathname);
	const isHome = $derived(path === '/');
	const profileHandle = $derived(
		path.startsWith('/profile/') ? (page.params.handle as string | undefined) : undefined
	);
	const isProfileActive = $derived(Boolean(profileHandle));
</script>

<aside
	class="sticky top-0 flex h-screen w-[72px] shrink-0 flex-col border-r border-[#2f3336] bg-black px-2 py-1 xl:w-[275px] xl:px-3"
	aria-label="Primary"
>
	<!-- Brand -->
	<a
		href="/"
		class="group rounded-full py-2 outline-none transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[#1d9bf0] xl:px-3 xl:py-3"
		aria-label="X wrapped home"
	>
		<span class="flex flex-col items-center gap-0.5 xl:hidden">
			<span class="text-[11px] font-bold leading-none text-[#e7e9ea]">X</span>
			<span class="flex h-7 w-7 items-center justify-center" aria-hidden="true">
				<svg viewBox="0 0 24 24" class="h-6 w-6 fill-[#e7e9ea]">
					<path
						d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
					/>
				</svg>
			</span>
			<span class="text-[11px] font-bold leading-none text-[#e7e9ea]">wrapped</span>
		</span>
		<span class="hidden items-center gap-1.5 xl:flex">
			<span class="text-[15px] font-bold tracking-tight text-[#e7e9ea]">X</span>
			<span class="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
				<svg viewBox="0 0 24 24" class="h-6 w-6 fill-[#e7e9ea]">
					<path
						d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
					/>
				</svg>
			</span>
			<span class="text-[15px] font-bold tracking-tight text-[#e7e9ea]">wrapped</span>
		</span>
	</a>

	<nav
		class="mt-0.5 flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto overscroll-contain xl:items-stretch"
		aria-label="Main"
	>
		<!-- Home -->
		<a
			href="/"
			class="flex w-full items-center justify-center rounded-full p-3 text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5 {isHome
				? 'font-bold'
				: ''}"
			aria-current={isHome ? 'page' : undefined}
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" aria-hidden="true">
				{#if isHome}
					<path
						fill="currentColor"
						d="M11.47 3.841a.75.75 0 011.06 0l8.25 8.25a.75.75 0 11-1.06 1.06l-.815-.816V19.5a2.25 2.25 0 01-2.25 2.25h-4.5A2.25 2.25 0 019 19.5V15h-.75A2.25 2.25 0 016 12.75V9.75H4.5a.75.75 0 01-.53-1.28l7.5-7.629z"
					/>
				{:else}
					<path
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
					/>
				{/if}
			</svg>
			<span class="hidden text-[20px] xl:inline">Home</span>
		</a>

		<!-- Explore -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Explore</span>
		</button>

		<!-- Notifications -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Notifications</span>
		</button>

		<!-- Messages -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Messages</span>
		</button>

		<!-- Grok -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Grok</span>
		</button>

		<!-- Lists -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75V18z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Lists</span>
		</button>

		<!-- Bookmarks -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Bookmarks</span>
		</button>

		<!-- Communities -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M18 18.72a9.09 9.09 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Communities</span>
		</button>

		<!-- Premium -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" aria-hidden="true">
				<path
					fill="currentColor"
					d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">Premium</span>
		</button>

		<!-- Profile -->
		{#if profileHandle}
			<a
				href="/profile/{encodeURIComponent(profileHandle)}"
				class="flex w-full items-center justify-center rounded-full p-3 text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5 {isProfileActive
					? 'font-bold'
					: ''}"
				aria-current={isProfileActive ? 'page' : undefined}
			>
				<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
					{#if isProfileActive}
						<path
							fill="currentColor"
							fill-rule="evenodd"
							d="M7.5 6a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
							clip-rule="evenodd"
						/>
					{:else}
						<path
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
						/>
					{/if}
				</svg>
				<span class="hidden text-[20px] xl:inline">Profile</span>
			</a>
		{:else}
			<button
				type="button"
				class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
			>
				<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
					<path
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
					/>
				</svg>
				<span class="hidden text-[20px] xl:inline">Profile</span>
			</button>
		{/if}

		<!-- More -->
		<button
			type="button"
			class="flex w-full items-center justify-center rounded-full border-0 bg-transparent p-3 font-inherit text-[#e7e9ea] transition-colors hover:bg-white/[0.08] xl:justify-start xl:gap-5 xl:pr-5"
		>
			<svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M12 21a9 9 0 100-18 9 9 0 000 18z"
				/>
			</svg>
			<span class="hidden text-[20px] xl:inline">More</span>
		</button>
	</nav>

	<!-- Post (compose) -->
	<div class="mt-2 flex w-full flex-col items-center xl:items-stretch">
		<button
			type="button"
			class="flex h-12 w-12 items-center justify-center rounded-full bg-[#1d9bf0] text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-[#1a8cd8] xl:h-[52px] xl:w-full xl:px-5 xl:text-[17px]"
			aria-label="Post"
		>
			<svg viewBox="0 0 24 24" class="h-6 w-6 xl:hidden" fill="currentColor" aria-hidden="true">
				<path
					d="M21.731 2.693a2.25 2.25 0 00-3.182 0l-1.97 1.97 4.243 4.243 1.97-1.97a2.25 2.25 0 000-3.182l-1.061-1.061zM16.308 5.116L3.75 17.675V21h3.325L19.634 8.441l-3.326-3.325zM2.25 18.75V21h2.25l10.5-10.5-2.25-2.25L2.25 18.75z"
				/>
			</svg>
			<span class="hidden xl:inline">Post</span>
		</button>
	</div>

	<div class="min-h-2 flex-1"></div>

	<!-- Account (X-style bottom row) -->
	<button
		type="button"
		class="mb-3 flex w-full max-w-full items-center gap-3 rounded-full p-3 text-left transition-colors hover:bg-white/[0.08] xl:pr-2"
		aria-label="Account menu"
	>
		<span
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#536471] text-[15px] font-bold text-white"
		>
			{profileHandle ? profileHandle.slice(0, 2).toUpperCase() : 'XW'}
		</span>
		<span class="hidden min-w-0 flex-1 xl:block">
			<span class="block truncate text-[15px] font-bold text-[#e7e9ea]">
				{profileHandle ? profileHandle : 'X Wrapped'}
			</span>
			<span class="block truncate text-[15px] text-[#71767b]">
				@{profileHandle ? profileHandle : 'xwrapped'}
			</span>
		</span>
		<svg
			viewBox="0 0 24 24"
			class="hidden h-5 w-5 shrink-0 text-[#e7e9ea] xl:block"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M3.75 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7.5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7.5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
			/>
		</svg>
	</button>
</aside>
