import { normalizeTweetData } from '$lib/tweet-stats';
import { archivedTweetsToTweetData } from '$lib/server/tweet-archive';
import { getTweetArchiveForHandle } from '$lib/server/tweet-archive-db';
import {
	loadRepoTweetExport,
	profileFromExportFooter,
	repoTweetsAsTweetData
} from '$lib/server/repo-tweet-export';
import { stubProfile } from '$lib/server/stub-x-data';
import { store } from '$lib/server/db';
import { isMagicHourConfigured } from '$lib/server/magichour';
import { processMediaBackfill } from '$lib/server/pipeline';
import { redirect } from '@sveltejs/kit';
import type { TweetArchiveDocument } from '$lib/server/tweet-archive';
export async function load({ params }) {
	const handle = params.handle.toLowerCase();
	const result = await store.get(handle);

	if (!result || result.status !== 'complete') {
		redirect(307, `/loading/${handle}`);
	}

	// Cached wraps from before Magic Hour media was wired: enqueue missing video / voiceover once.
	if (
		result.analysis &&
		isMagicHourConfigured() &&
		(
			(!result.videoUrl && !result.videoError?.trim()) ||
			(!result.audioUrl && !result.audioError?.trim())
		)
	) {
		const claimed = await store.claimMediaBackfill(handle);
		if (claimed) {
			processMediaBackfill(handle);
		}
		redirect(307, `/loading/${handle}`);
	}

	let archive: TweetArchiveDocument | undefined;
	try {
		archive = await getTweetArchiveForHandle(handle);
	} catch {
		archive = undefined;
	}

	let tweets = (result.tweets ?? []).map((t) => normalizeTweetData(t));

	const repo = loadRepoTweetExport(handle);
	if (repo?.tweets.length) {
		tweets = repoTweetsAsTweetData(repo.tweets).map(normalizeTweetData);
	} else if (archive?.tweets?.length) {
		const useArchive = !tweets.length || archive.tweets.length >= tweets.length;
		if (useArchive) {
			tweets = archivedTweetsToTweetData(archive.tweets).map(normalizeTweetData);
		}
	}

	let profile = result.profile;
	if (repo?.tweets.length) {
		profile = repo.footer
			? profileFromExportFooter(handle, repo.footer, repo.tweets.length)
			: { ...stubProfile(handle), tweetsCount: repo.tweets.length };
	} else if (profile && archive?.footer?.description?.trim() && !profile.bio?.trim()) {
		profile = { ...profile, bio: archive.footer.description.trim() };
	}

	const stub = stubProfile(handle);
	if (profile && !(profile.profilePicture ?? '').trim() && stub.profilePicture) {
		profile = { ...profile, profilePicture: stub.profilePicture };
	}

	return {
		result: {
			...result,
			tweets,
			profile
		}
	};
}
