import { PUBLIC_BASE_URL } from '$env/static/public';

/**
 * Canonical URL for this profile’s Wrapped page (share links).
 * Uses PUBLIC_BASE_URL when set so production links match the deployed domain.
 */
export function canonicalProfileWrappedUrl(handle: string, pageUrl: URL): string {
	const base = (PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
	const path = `/profile/${encodeURIComponent(handle)}`;
	if (base) return `${base}${path}`;
	return `${pageUrl.origin}${path}`;
}

/** Pre-filled post / clipboard text stays compact on purpose; the page itself carries the longer lore. */
export function buildWrappedShareText(
	handle: string,
	archetype: string | undefined,
	profileUrl: string
): string {
	const arch = (archetype ?? '').trim() || 'X Wrapped';
	return `Check out @${handle}'s X Wrapped — ${arch} ${profileUrl}`;
}

export function postOnXIntentUrl(shareText: string): string {
	return `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
}
