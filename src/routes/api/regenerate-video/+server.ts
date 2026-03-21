import { json } from '@sveltejs/kit';
import { store } from '$lib/server/db';
import { isMagicHourConfigured } from '$lib/server/magichour';
import { processMediaBackfill } from '$lib/server/pipeline';

const log = (...args: unknown[]) => console.log('[api/regenerate-video]', ...args);

export async function POST({ request }) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { handle } = body as { handle?: unknown };
	if (!handle || typeof handle !== 'string') {
		return json({ error: 'Handle is required' }, { status: 400 });
	}

	const cleaned = handle.trim().replace(/^@/, '').toLowerCase();
	if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleaned)) {
		return json({ error: 'Invalid handle format' }, { status: 400 });
	}

	if (!isMagicHourConfigured()) {
		return json({ error: 'MAGIC_HOUR_API_KEY is not configured' }, { status: 503 });
	}

	const existing = await store.get(cleaned);
	if (!existing?.analysis) {
		return json({ error: 'No wrapped analysis for this handle yet' }, { status: 404 });
	}
	if (existing.status === 'scraping' || existing.status === 'analysing' || existing.status === 'generating') {
		return json({ error: 'Wrap is still processing' }, { status: 409 });
	}

	log('clear stored Magic Hour media + queue', { id: cleaned });
	await store.clearStoredMedia(cleaned);

	const claimed = await store.claimMediaBackfill(cleaned);
	if (claimed) {
		processMediaBackfill(cleaned);
	}

	return json({ ok: true, id: cleaned });
}
