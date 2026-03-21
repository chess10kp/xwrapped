import { TWITTERAPI_IO_KEY } from '$lib/server/env.server';
import type { ProfileData } from './types';

const TWITTERAPI_BASE = 'https://api.twitterapi.io';

/** Response shape for GET /twitter/user/info */
interface TwitterUserInfoBody {
	status?: string;
	msg?: string;
	data?: {
		userName?: string;
		name?: string;
		description?: string;
		profilePicture?: string;
		followers?: number;
		following?: number;
		statusesCount?: number;
		isBlueVerified?: boolean;
		createdAt?: string;
	};
}

export function isTwitterApiConfigured(): boolean {
	return Boolean(TWITTERAPI_IO_KEY?.trim());
}

function parseJoinedAt(createdAt: string | undefined, fallback: string): string {
	if (!createdAt?.trim()) return fallback;
	const d = new Date(createdAt);
	if (!Number.isNaN(d.getTime())) return d.toISOString();
	return fallback;
}

/**
 * Live profile + avatar URL from twitterapi.io (same key as /api/scrape).
 * Returns null if the key is missing, the request fails, or the account is unavailable.
 */
export async function fetchTwitterUserProfile(handle: string): Promise<ProfileData | null> {
	if (!isTwitterApiConfigured()) return null;

	const params = new URLSearchParams({ userName: handle });
	const res = await fetch(`${TWITTERAPI_BASE}/twitter/user/info?${params}`, {
		headers: { 'x-api-key': TWITTERAPI_IO_KEY!.trim() }
	});

	const raw = await res.text();
	let json: TwitterUserInfoBody;
	try {
		json = raw ? (JSON.parse(raw) as TwitterUserInfoBody) : {};
	} catch {
		console.warn('[twitter-profile] non-JSON response', res.status);
		return null;
	}

	if (!res.ok || json.status === 'error' || !json.data) {
		console.warn('[twitter-profile] user/info failed', {
			handle,
			status: res.status,
			apiStatus: json.status,
			msg: json.msg
		});
		return null;
	}

	const d = json.data;
	const username = (d.userName ?? handle).replace(/^@/, '');
	const fallbackJoined = '2019-01-01T00:00:00.000Z';

	return {
		username,
		name: d.name?.trim() ?? username,
		bio: d.description?.trim() ?? '',
		followers: typeof d.followers === 'number' ? d.followers : 0,
		following: typeof d.following === 'number' ? d.following : 0,
		tweetsCount: typeof d.statusesCount === 'number' ? d.statusesCount : 0,
		profilePicture: d.profilePicture?.trim() ?? '',
		isBlueVerified: Boolean(d.isBlueVerified),
		joinedAt: parseJoinedAt(d.createdAt, fallbackJoined)
	};
}

/**
 * Prefer live API fields (especially `profilePicture`) when present; keep export/stub for gaps.
 */
export function mergeProfileWithLive(base: ProfileData, live: ProfileData | null): ProfileData {
	if (!live) return base;
	return {
		...base,
		username: live.username || base.username,
		name: live.name?.trim() || base.name,
		bio: live.bio?.trim() || base.bio,
		followers: live.followers ?? base.followers,
		following: live.following ?? base.following,
		tweetsCount: live.tweetsCount ?? base.tweetsCount,
		profilePicture: live.profilePicture?.trim() || base.profilePicture,
		isBlueVerified: live.isBlueVerified ?? base.isBlueVerified,
		joinedAt: live.joinedAt || base.joinedAt
	};
}
