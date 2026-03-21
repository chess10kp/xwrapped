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

			window.location.href = `/loading/${data.id}`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-5xl font-bold text-accent">X Wrapped</h1>
			<p class="mt-2 text-text/70">Discover your X personality archetype</p>
		</div>

		<div class="space-y-4">
			<div>
				<label for="handle" class="sr-only">X Handle</label>
				<div class="relative">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-text/50">@</span>
					<input
						id="handle"
						type="text"
						bind:value={handle}
						placeholder="elonmusk"
						disabled={isLoading}
						class="w-full rounded-lg bg-surface px-4 py-3 pl-8 text-text placeholder:text-text/50 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
						onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
					/>
				</div>
			</div>

			{#if error}
				<p class="text-red-400 text-sm">{error}</p>
			{/if}

			<button
				onclick={handleSubmit}
				disabled={isLoading}
				class="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isLoading ? 'Generating...' : 'Generate My Wrapped'}
			</button>
		</div>
	</div>
</div>
