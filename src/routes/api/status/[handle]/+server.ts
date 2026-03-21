import { json } from '@sveltejs/kit';
import { store } from '$lib/server/db';

export async function GET({ params }) {
  const result = await store.get(params.handle.toLowerCase());

  if (!result) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json({
    status: result.status,
    analysis: result.analysis,
    videoUrl: result.videoUrl,
    handle: result.handle,
    profile: result.profile,
    error: result.error,
  });
}
