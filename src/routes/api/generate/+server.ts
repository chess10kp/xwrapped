import { json } from '@sveltejs/kit';
import { store } from '$lib/server/store';
import { processHandle } from '$lib/server/pipeline';

export async function POST({ request }) {
  const { handle } = await request.json();
  
  if (!handle || typeof handle !== 'string') {
    return json({ error: 'Handle is required' }, { status: 400 });
  }

  const cleanedHandle = handle.trim().replace(/^@/, '');
  
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanedHandle)) {
    return json({ error: 'Invalid handle format' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  
  store.set(id, { 
    id, 
    handle: cleanedHandle, 
    status: 'scraping', 
    createdAt: new Date() 
  });

  processHandle(id, cleanedHandle);

  return json({ id });
}
