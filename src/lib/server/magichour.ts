import { env } from '$env/dynamic/private';
import { Client } from 'magic-hour';
import type { PersonalityAnalysis } from './types';

/** Magic Hour POST /v1/text-to-video — `style.prompt` maxLength per OpenAPI. */
const MAGIC_HOUR_PROMPT_MAX_CHARS = 2000;

let client: Client | null = null;

function magicHourToken(): string | undefined {
	return env.MAGIC_HOUR_API_KEY?.trim() || undefined;
}

export function isMagicHourConfigured(): boolean {
	return Boolean(magicHourToken());
}

function getClient(): Client {
	const token = magicHourToken();
	if (!token) {
		throw new Error(
			'MAGIC_HOUR_API_KEY is missing or empty. Add it to .env (see .env.example). https://magichour.ai/developer?tab=api-keys'
		);
	}
	if (!client) {
		client = new Client({ token });
	}
	return client;
}

export function buildVideoPrompt(analysis: PersonalityAnalysis, handle: string): string {
	const topics = analysis.top_topics.join(', ');
	return `Cinematic social media personality reveal video. ${analysis.colour_mood} visual aesthetic.

Opening: A glowing screen showing "@${handle}" with the title "X WRAPPED" in bold typography.

Scene 1: Visual representation of "${topics}" — the topics that define this person's online presence. ${analysis.tone} energy.

Scene 2: The archetype reveal — "${analysis.archetype}" appears in large cinematic text.

Scene 3: ${analysis.vibe_summary}

Closing: Stats overlay — the text "Their archetype: ${analysis.archetype}" fades in with dramatic lighting.

Style: Modern, high-energy social media aesthetic. Dark background with vibrant accent colours. Motion graphics feel. Clean typography overlays. About 20 seconds.`;
}

/** API rejects prompts over 2000 chars with 422. */
function truncatePromptForMagicHour(prompt: string): string {
	const t = prompt.trim();
	if (t.length <= MAGIC_HOUR_PROMPT_MAX_CHARS) {
		return t.length > 0 ? t : 'Cinematic social media personality reveal for an X user, bold typography, dark background.';
	}
	const cut = t.slice(0, MAGIC_HOUR_PROMPT_MAX_CHARS - 1);
	const lastSpace = cut.lastIndexOf(' ');
	const safe = lastSpace > MAGIC_HOUR_PROMPT_MAX_CHARS * 0.7 ? cut.slice(0, lastSpace) : cut;
	return `${safe.trimEnd()}…`;
}

/**
 * Runs text-to-video and waits until Magic Hour returns a download URL.
 */
export async function generateWrappedVideo(
	analysis: PersonalityAnalysis,
	handle: string
): Promise<string> {
	const rawPrompt = buildVideoPrompt(analysis, handle);
	const prompt = truncatePromptForMagicHour(rawPrompt);
	if (rawPrompt.length > MAGIC_HOUR_PROMPT_MAX_CHARS) {
		console.warn('[magichour] prompt truncated for API limit', {
			before: rawPrompt.length,
			after: prompt.length
		});
	}

	const res = await getClient().v1.textToVideo.generate(
		{
			model: 'ltx-2',
			endSeconds: 20,
			name: `X Wrapped - @${handle}`,
			style: { prompt },
			aspectRatio: '16:9',
			resolution: '480p'
		},
		{ waitForCompletion: true, downloadOutputs: false }
	);

	if (res.status === 'error') {
		const detail = res.error?.message ?? JSON.stringify(res.error);
		throw new Error(detail || 'Video render failed');
	}
	if (res.status !== 'complete') {
		throw new Error(`Video not ready (status: ${res.status})`);
	}
	const url = res.downloads?.[0]?.url ?? res.download?.url;
	if (!url) {
		throw new Error('No video download URL in Magic Hour response');
	}
	return url;
}
