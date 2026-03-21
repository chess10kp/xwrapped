import { store } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	const handle = params.handle.toLowerCase();
	const result = await store.get(handle);

	if (!result || result.status !== 'complete') {
		redirect(307, `/loading/${handle}`);
	}
	
	return { result };
}
