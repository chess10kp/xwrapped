<script lang="ts">
	let handle = $state('');
	let isLoading = $state(false);
	let error = $state('');

	async function handleSubmit() {
		error = '';
		const cleanedHandle = handle.trim().replace(/^@/, '');

		if (!cleanedHandle || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanedHandle)) {
			error = 'Please enter a valid X handle (e.g., elonmusk)';
			return;
		}

		isLoading = true;

		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ handle: cleanedHandle })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to generate wrapped');
			}

			window.location.href = `/loading/${encodeURIComponent(data.id)}`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="mx-auto w-full max-w-[600px] border-x border-[#2f3336] px-6 py-16">
		<div class="flex flex-col items-center gap-8">
			<!-- X Logo -->
			<div class="text-6xl font-bold text-[#e7e9ea]">𝕏</div>

			<!-- Title -->
			<div class="text-center">
				<h1 class="text-4xl font-extrabold text-[#1d9bf0]">Wrapped</h1>
				<p class="mt-2 text-[#71767b]">Discover your X personality archetype</p>
			</div>

			<!-- Input -->
			<div class="w-full max-w-sm">
				<label for="handle" class="sr-only">X Handle</label>
				<div class="relative">
					<span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71767b]">@</span>
					<input
						id="handle"
						type="text"
						bind:value={handle}
						placeholder="elonmusk"
						disabled={isLoading}
						class="w-full rounded-full bg-[#202327] py-3 pl-9 pr-4 text-[#e7e9ea] placeholder-[#71767b] outline-none transition-colors focus:ring-2 focus:ring-[#1d9bf0] disabled:opacity-50"
						onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
					/>
				</div>
			</div>

			<!-- Error -->
			{#if error}
				<p class="text-sm text-[#f4212e]">{error}</p>
			{/if}

			<!-- Button -->
			<button
				type="button"
				onclick={handleSubmit}
				disabled={isLoading}
				class="flex items-center gap-2 rounded-full bg-[#1d9bf0] px-8 py-3 font-bold text-white transition-colors hover:bg-[#1a8cd8] disabled:opacity-50"
			>
				{#if isLoading}
					<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Generating...
				{:else}
					Generate My Wrapped
				{/if}
			</button>
		</div>
	</div>
</div>
