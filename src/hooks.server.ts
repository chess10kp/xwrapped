import { MONGODB_URI } from '$lib/server/env.server';
import { configureMongoUri } from '$lib/server/mongo-connection';

configureMongoUri(MONGODB_URI);

export async function handle({ event, resolve }) {
	return resolve(event);
}
