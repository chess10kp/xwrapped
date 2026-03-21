import { MONGODB_URI } from '$env/static/private';
import { configureMongoUri, getMongoClient } from '$lib/server/mongo-connection';

configureMongoUri(MONGODB_URI);

export async function handle({ event, resolve }) {
	await getMongoClient();
	return resolve(event);
}
