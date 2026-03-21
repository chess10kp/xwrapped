import { processHandle } from '../src/lib/server/pipeline.js';

const DEMO_HANDLES = [
	'elonmusk',
	'sama',
	'kaborerichard',
	'levelsio',
	'naval',
	'pmarca',
];

async function preCache() {
	for (const handle of DEMO_HANDLES) {
		console.log(`Pre-caching @${handle}...`);
		const id = crypto.randomUUID();
		await processHandle(id, handle);
		console.log(`✅ @${handle} cached with ID: ${id}`);
	}
	console.log('🎉 Pre-cache complete!');
}

preCache().catch(console.error);
