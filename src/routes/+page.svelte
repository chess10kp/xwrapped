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

<div class="hero min-h-screen bg-base-100">
	<div class="hero-content w-full max-w-md flex-col px-4 py-8">
		<div class="card bg-base-200 shadow-xl w-full">
			<div class="card-body gap-6">
				<div class="text-center">
					<h1 class="card-title justify-center text-4xl text-primary">X Wrapped</h1>
					<p class="text-base-content/70">Discover your X personality archetype</p>
				</div>

				<div class="form-control w-full gap-4">
					<div>
						<label class="label" for="handle">
							<span class="label-text sr-only">X Handle</span>
						</label>
						<div class="join w-full">
							<span class="btn btn-disabled join-item shrink-0">@</span>
							<input
								id="handle"
								type="text"
								bind:value={handle}
								placeholder="elonmusk"
								disabled={isLoading}
								class="input input-bordered join-item w-full min-w-0"
								onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
							/>
						</div>
					</div>

					{#if error}
						<div role="alert" class="alert alert-error text-sm">
							<span>{error}</span>
						</div>
					{/if}

					<button
						type="button"
						onclick={handleSubmit}
						disabled={isLoading}
						class="btn btn-primary btn-block"
					>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
							Generating...
						{:else}
							Generate My Wrapped
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
