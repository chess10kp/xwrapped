import { json } from '@sveltejs/kit';
import { store } from '$lib/server/db';
import { processHandle } from '$lib/server/pipeline';

const log = (...args: unknown[]) => console.log('[api/generate]', ...args);

export async function POST({ request }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[api/generate] invalid JSON body', err);
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { handle } = body as { handle?: unknown };

  if (!handle || typeof handle !== 'string') {
    log('reject: handle missing or not a string', { type: typeof handle });
    return json({ error: 'Handle is required' }, { status: 400 });
  }

  const cleanedHandle = handle.trim().replace(/^@/, '').toLowerCase();

  if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanedHandle)) {
    log('reject: invalid handle format', { cleanedHandle });
    return json({ error: 'Invalid handle format' }, { status: 400 });
  }

  const id = cleanedHandle;
  log('job start', { id, handle: cleanedHandle });

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

  log('stored job, spawning pipeline', { id });
  processHandle(id, cleanedHandle);

  log('responding 200', { id });
  return json({ id });
}
