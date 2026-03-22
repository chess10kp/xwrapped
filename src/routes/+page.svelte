<script lang="ts">
	const log = (...args: unknown[]) => console.log('[xwrapped/generate]', ...args);

	let handle = $state('');
	let isLoading = $state(false);
	let error = $state('');

	async function handleSubmit() {
		error = '';
		const cleanedHandle = handle.trim().replace(/^@/, '');

		if (!cleanedHandle || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanedHandle)) {
			log('validation failed', { cleanedHandle: cleanedHandle || '(empty)' });
			error = 'Please enter a valid X handle (e.g., elonmusk)';
			return;
		}

		isLoading = true;
		log('submit', { handle: cleanedHandle });

		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ handle: cleanedHandle })
			});

			const raw = await res.text();
			log('response', {
				status: res.status,
				ok: res.ok,
				contentType: res.headers.get('content-type'),
				bodyLength: raw.length,
				bodyPreview: raw.length > 800 ? `${raw.slice(0, 800)}…` : raw || '(empty)'
			});

			let payload: { id?: string; error?: string; detail?: string } = {};
			try {
				payload = raw ? (JSON.parse(raw) as typeof payload) : {};
			} catch (parseErr) {
				console.error('[xwrapped/generate] JSON parse failed', parseErr);
				throw new Error(
					res.ok
						? 'Invalid response from server'
						: `Request failed (${res.status}). Check the dev server logs.`
				);
			}

			if (!res.ok) {
				log('request not ok', { error: payload.error, detail: payload.detail });
				const hint = payload.detail ? ` ${payload.detail}` : '';
				throw new Error((payload.error || 'Failed to generate wrapped') + hint);
			}

			if (!payload.id) {
				log('missing id in success payload', payload);
				throw new Error('Invalid response: missing job id');
			}

			log('redirect', { id: payload.id, path: `/loading/${encodeURIComponent(payload.id)}` });
			window.location.href = `/loading/${encodeURIComponent(payload.id)}`;
		} catch (err) {
			console.error('[xwrapped/generate] error', err);
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>X Wrapped — your year on X</title>
	<meta name="description" content="Generate a personality-style wrapped from your public X activity." />
</svelte:head>

<div class="hero-root relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip min-h-dvh">
	<div class="pointer-events-none absolute inset-0 bg-black" aria-hidden="true"></div>
	<div class="hero-glow pointer-events-none absolute inset-0" aria-hidden="true"></div>

	<div class="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6">
		<div class="hero-content flex flex-col items-center gap-14">
			<!-- Logo + title -->
			<div class="hero-mark flex flex-col items-center gap-6">
				<div class="hero-x text-[7rem] font-bold leading-none text-[#e7e9ea] sm:text-[9rem]">𝕏</div>
				<h1 class="hero-title text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Wrapped</h1>
			</div>

			<!-- Input row -->
			<div class="hero-form flex w-full max-w-sm flex-col items-center gap-4">
				<label for="handle" class="sr-only">X Handle</label>
				<div class="relative w-full">
					<span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#555b61]">@</span>
					<input
						id="handle"
						type="text"
						bind:value={handle}
						placeholder="handle"
						disabled={isLoading}
						class="w-full rounded-2xl border border-[#2f3336] bg-[#16181c] py-4 pl-10 pr-4 text-lg text-[#e7e9ea] placeholder-[#3e4347] outline-none transition-[border-color,box-shadow] focus:border-[#1d9bf0]/50 focus:shadow-[0_0_0_3px_rgba(29,155,240,0.15)] disabled:opacity-50"
						onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
					/>
				</div>

				{#if error}
					<p class="w-full text-center text-sm text-[#f4212e]" role="alert">{error}</p>
				{/if}

				<button
					type="button"
					onclick={handleSubmit}
					disabled={isLoading}
					class="hero-button flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-lg font-bold text-white transition-all disabled:opacity-50"
				>
					{#if isLoading}
						<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Generating…
					{:else}
						Generate
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.hero-glow {
		background:
			radial-gradient(ellipse 100% 80% at 50% -20%, rgba(29, 155, 240, 0.12), transparent 60%),
			radial-gradient(circle at 50% 50%, rgba(29, 155, 240, 0.04), transparent 70%);
	}

	.hero-x {
		background: linear-gradient(180deg, #fff 30%, rgba(255, 255, 255, 0.4));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 80px rgba(29, 155, 240, 0.2));
	}

	.hero-title {
		background: linear-gradient(135deg, #1d9bf0 0%, #58b9f5 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-button {
		background: linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%);
		box-shadow: 0 8px 32px -8px rgba(29, 155, 240, 0.4);
	}

	.hero-button:hover:not(:disabled) {
		background: linear-gradient(135deg, #1a8cd8 0%, #1578b8 100%);
		box-shadow: 0 12px 40px -8px rgba(29, 155, 240, 0.5);
		transform: translateY(-1px);
	}

	.hero-button:active:not(:disabled) {
		transform: translateY(0);
	}

	@keyframes hero-enter {
		from { opacity: 0; transform: translateY(16px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.hero-mark {
		animation: hero-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.hero-form {
		animation: hero-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-mark, .hero-form { animation: none; }
	}
</style>
