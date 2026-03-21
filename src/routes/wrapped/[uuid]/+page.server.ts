import { store } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	const result = await store.get(params.uuid);
	
	if (!result || result.status !== 'complete') {
		redirect(307, `/loading/${params.uuid}`);
	}
	
	return { result };
}
