import { store } from '$lib/server/store';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	const result = store.get(params.uuid);
	
	if (!result || result.status !== 'complete') {
		redirect(307, `/loading/${params.uuid}`);
	}
	
	return { result };
}
