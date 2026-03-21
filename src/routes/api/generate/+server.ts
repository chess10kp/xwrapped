import { json } from '@sveltejs/kit';
import { store } from '$lib/server/db';
import { processHandle } from '$lib/server/pipeline';

export async function POST({ request }) {
  const { handle } = await request.json();
  
  if (!handle || typeof handle !== 'string') {
    return json({ error: 'Handle is required' }, { status: 400 });
  }

  const cleanedHandle = handle.trim().replace(/^@/, '').toLowerCase();

  if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanedHandle)) {
    return json({ error: 'Invalid handle format' }, { status: 400 });
  }

  const id = cleanedHandle;

  try {
    await store.set(id, {
      id,
      handle: cleanedHandle,
      status: 'scraping',
      createdAt: new Date()
    });
  } catch (err) {
    console.error('[api/generate] database error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return json(
      {
        error: 'Database unavailable',
        ...(import.meta.env.DEV && { detail: message })
      },
      { status: 503 }
    );
  }

  processHandle(id, cleanedHandle);

  return json({ id });
}
