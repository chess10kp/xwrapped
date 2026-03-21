import { normalizeTweetData } from '$lib/tweet-stats';
import { archivedTweetsToTweetData } from '$lib/server/tweet-archive';
import { getTweetArchiveForHandle } from '$lib/server/tweet-archive-db';
import { store } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { TweetArchiveDocument } from '$lib/server/tweet-archive';

export async function load({ params }) {
	const handle = params.handle.toLowerCase();
	const result = await store.get(handle);

	if (!result || result.status !== 'complete') {
		redirect(307, `/loading/${handle}`);
	}

	let archive: TweetArchiveDocument | undefined;
	try {
		archive = await getTweetArchiveForHandle(handle);
	} catch {
		archive = undefined;
	}

	let archiveMeta: { tweetCount: number; sourceFile: string } | null = null;
	let tweetKinds: ('tweet' | 'repost')[] | null = null;

	let tweets = (result.tweets ?? []).map((t) => normalizeTweetData(t));
	if (archive?.tweets?.length) {
		const useArchive = !tweets.length || archive.tweets.length >= tweets.length;
		if (useArchive) {
			tweets = archivedTweetsToTweetData(archive.tweets).map(normalizeTweetData);
			archiveMeta = { tweetCount: archive.tweetCount, sourceFile: archive.sourceFile };
			tweetKinds = archive.tweets.map((t) => t.kind);
		}
	}

	let profile = result.profile;
	if (profile && archive?.footer?.description?.trim() && !profile.bio?.trim()) {
		profile = { ...profile, bio: archive.footer.description.trim() };
	}

	return {
		result: {
			...result,
			tweets,
			profile
		},
		archiveMeta,
		tweetKinds
	};
}
