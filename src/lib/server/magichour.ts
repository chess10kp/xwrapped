import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { Client } from 'magic-hour';
import type { PersonalityAnalysis } from './types';
import { buildVoiceoverScript, pickVoiceForAnalysis } from '$lib/voiceover';

/** Magic Hour prompts — keep at or below this (text-to-video OpenAPI maxLength 2000). */
const MAGIC_HOUR_PROMPT_MAX_CHARS = 2000;
const MAGIC_HOUR_AUDIO_PROMPT_MAX_CHARS = 1000;
const MAGIC_HOUR_API_URL = 'https://api.magichour.ai';
const MAGIC_HOUR_AUDIO_POLL_INTERVAL_MS = 2000;
const MAGIC_HOUR_AUDIO_POLL_ATTEMPTS = 60;

/** Output length for text-to-video and image-to-video (`endSeconds`). */
const WRAPPED_VIDEO_DURATION_SECONDS = 5;

/**
 * Magic Hour model id (OpenAPI enum value, not a marketing name). Docs:
 * image-to-video — https://docs.magichour.ai/api-reference/video-projects/image-to-video
 * text-to-video — https://docs.magichour.ai/api-reference/video-projects/text-to-video
 */
const MAGIC_HOUR_VIDEO_MODEL = 'seedance' as const;

type MagicHourProjectStatus = 'draft' | 'queued' | 'rendering' | 'complete' | 'error' | 'canceled';

interface MagicHourAudioCreateResponse {
	id?: string;
	message?: string;
}

interface MagicHourAudioDetailsResponse {
	status?: MagicHourProjectStatus;
	downloads?: Array<{ url?: string }>;
	error?: { message?: string; code?: string } | null;
	message?: string;
}

let client: Client | null = null;

function magicHourToken(): string | undefined {
	return env.MAGIC_HOUR_API_KEY?.trim() || undefined;
}

export function isMagicHourConfigured(): boolean {
	return Boolean(magicHourToken());
}

function getClient(): Client {
	const token = requireMagicHourToken();
	if (!client) {
		client = new Client({ token });
	}
	return client;
}

function getMagicHourAuthHeaders(): Record<string, string> {
	return {
		accept: 'application/json',
		authorization: `Bearer ${requireMagicHourToken()}`
	};
}

function requireMagicHourToken(): string {
	const token = magicHourToken();
	if (!token) {
		throw new Error(
			'MAGIC_HOUR_API_KEY is missing or empty. Add it to .env (see .env.example). https://magichour.ai/developer?tab=api-keys'
		);
	}
	return token;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestMagicHourJson<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${MAGIC_HOUR_API_URL}${path}`, {
		...init,
		headers: {
			...getMagicHourAuthHeaders(),
			...(init?.body ? { 'content-type': 'application/json' } : {}),
			...(init?.headers ?? {})
		}
	});
	const raw = await res.text();
	if (!res.ok) {
		throw new Error(`Magic Hour API error ${res.status}: ${raw}`);
	}
	if (!raw.trim()) return {} as T;
	return JSON.parse(raw) as T;
}

/** Tweet-topic phrase for prompts — short so the video model stays on-topic without scene-script noise. */
function topicsFromTweets(analysis: PersonalityAnalysis, maxChars = 280): string {
	const raw = analysis.top_topics.filter(Boolean).join(', ');
	const t = raw.trim();
	if (!t) return 'their posts and interests';
	if (t.length <= maxChars) return t;
	return `${t.slice(0, maxChars - 1).trimEnd()}…`;
}

/** Colour/tone cues for the model — steer mood only, not on-screen text. */
function toneSnippet(analysis: PersonalityAnalysis, maxChars = 160): string {
	const parts = [analysis.colour_mood?.trim(), analysis.tone?.trim()].filter(Boolean);
	const s = parts.join('; ');
	if (!s) return 'cinematic atmospheric mood';
	if (s.length <= maxChars) return s;
	return `${s.slice(0, maxChars - 1).trimEnd()}…`;
}

/** Shorten Exa block for Magic Hour (no URLs; keeps prompt under API limits). */
function compactWebContextForVideoPrompt(raw: string | undefined, maxChars = 450): string {
	if (!raw?.trim()) return '';
	const lines = raw.split('\n').filter((line) => !/^\s*URL:\s*/i.test(line.trim()));
	let s = lines.join(' ').replace(/\s+/g, ' ').trim();
	if (s.length <= maxChars) return s;
	return `${s.slice(0, maxChars - 1).trimEnd()}…`;
}

function truncateAudioPromptForMagicHour(prompt: string): string {
	const t = prompt.trim().replace(/\s+/g, ' ');
	if (t.length <= MAGIC_HOUR_AUDIO_PROMPT_MAX_CHARS) return t;
	const cut = t.slice(0, MAGIC_HOUR_AUDIO_PROMPT_MAX_CHARS - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

export function buildVideoPrompt(
	analysis: PersonalityAnalysis,
	_handle: string,
	webSearchContext?: string | null
): string {
	const topics = topicsFromTweets(analysis);
	const mood = toneSnippet(analysis);
	const web = compactWebContextForVideoPrompt(webSearchContext ?? undefined);
	const webPart = web ? `Third-party web context: ${web}. ` : '';
	return `Cinematic ${WRAPPED_VIDEO_DURATION_SECONDS}s mood and pacing about ${topics}; ${mood}; ${webPart}no on-screen text, captions, titles, logos, or typography.`;
}

/**
 * Single-line image-to-video: PFP is the frame; prompt sets motion + tonal feel from tweets, not words in the shot.
 */
export function buildImageToVideoPrompt(
	analysis: PersonalityAnalysis,
	_handle: string,
	webSearchContext?: string | null
): string {
	const topics = topicsFromTweets(analysis);
	const mood = toneSnippet(analysis);
	const web = compactWebContextForVideoPrompt(webSearchContext ?? undefined);
	const webPart = web ? `Public-web context: ${web}. ` : '';
	return `Subtle camera motion on this portrait; keep the person recognizable; ${mood}; emotional tone reflects tweets about ${topics}; ${webPart}no text, captions, or lettering in the video.`;
}

/** Turn relative static paths (e.g. /images/pfp.png) into an absolute URL Magic Hour can fetch. */
export function resolveProfileImageUrlForMagicHour(profilePicture: string | undefined): string | null {
	const raw = profilePicture?.trim();
	if (!raw) return null;
	if (raw.startsWith('https://') || raw.startsWith('http://')) return raw;
	if (raw.startsWith('/')) {
		const base = (PUBLIC_BASE_URL || '').replace(/\/$/, '');
		if (!base) return null;
		return `${base}${raw}`;
	}
	return null;
}

/**
 * Magic Hour's image-to-video rejects many remote URLs (e.g. Twitter CDN). The SDK also skips
 * uploading URLs. We fetch the bytes here and upload via their storage so `imageFilePath` is a
 * valid `api-assets/...` path.
 */
function extensionFromImageMagicBytes(buf: Buffer): string {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
	if (
		buf.length >= 8 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47
	) {
		return 'png';
	}
	if (
		buf.length >= 12 &&
		buf[0] === 0x52 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[8] === 0x57 &&
		buf[9] === 0x45 &&
		buf[10] === 0x42 &&
		buf[11] === 0x50
	) {
		return 'webp';
	}
	return 'jpg';
}

async function uploadFetchedImageToMagicHour(client: Client, imageUrl: string): Promise<string> {
	if (imageUrl.startsWith('api-assets/')) {
		return imageUrl;
	}

	const res = await fetch(imageUrl, {
		headers: {
			Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
		}
	});

	if (!res.ok) {
		throw new Error(`Could not download profile image (${res.status})`);
	}

	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length < 64) {
		throw new Error('Profile image download was empty or too small');
	}

	const ext = extensionFromImageMagicBytes(buf);
	const tempPath = join(tmpdir(), `xwrapped-mh-pfp-${Date.now()}.${ext}`);

	await writeFile(tempPath, buf);
	try {
		const filePath = await client.v1.files.uploadFile(tempPath);
		console.log('[magichour] uploaded profile image to Magic Hour storage', {
			bytes: buf.length,
			ext
		});
		return filePath;
	} finally {
		await unlink(tempPath).catch(() => {});
	}
}

/** API rejects prompts over 2000 chars with 422. */
function truncatePromptForMagicHour(prompt: string): string {
	const t = prompt.trim();
	if (t.length <= MAGIC_HOUR_PROMPT_MAX_CHARS) {
		return t.length > 0
			? t
			: 'Cinematic mood-led piece; soft atmospheric lighting and pacing; no on-screen text or captions.';
	}
	const cut = t.slice(0, MAGIC_HOUR_PROMPT_MAX_CHARS - 1);
	const lastSpace = cut.lastIndexOf(' ');
	const safe = lastSpace > MAGIC_HOUR_PROMPT_MAX_CHARS * 0.7 ? cut.slice(0, lastSpace) : cut;
	return `${safe.trimEnd()}…`;
}

async function waitForProjectUrl(
	res: Awaited<ReturnType<Client['v1']['textToVideo']['generate']>>
): Promise<string> {
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

async function waitForAudioProjectUrl(audioId: string): Promise<string> {
	for (let attempt = 0; attempt < MAGIC_HOUR_AUDIO_POLL_ATTEMPTS; attempt += 1) {
		const res = await requestMagicHourJson<MagicHourAudioDetailsResponse>(`/v1/audio-projects/${audioId}`);
		if (res.status === 'complete') {
			const url = res.downloads?.[0]?.url;
			if (!url) {
				throw new Error('No audio download URL in Magic Hour response');
			}
			return url;
		}
		if (res.status === 'error' || res.status === 'canceled') {
			const detail = res.error?.message ?? res.message ?? `Audio render failed (${res.status})`;
			throw new Error(detail);
		}
		await sleep(MAGIC_HOUR_AUDIO_POLL_INTERVAL_MS);
	}
	throw new Error('Audio render timed out while waiting for Magic Hour');
}

async function generateTextOnlyWrappedVideo(
	analysis: PersonalityAnalysis,
	handle: string,
	webSearchContext?: string | null
): Promise<string> {
	const rawPrompt = buildVideoPrompt(analysis, handle, webSearchContext);
	const prompt = truncatePromptForMagicHour(rawPrompt);
	if (rawPrompt.length > MAGIC_HOUR_PROMPT_MAX_CHARS) {
		console.warn('[magichour] text-to-video prompt truncated for API limit', {
			before: rawPrompt.length,
			after: prompt.length
		});
	}

	const res = await getClient().v1.textToVideo.generate(
		{
			model: MAGIC_HOUR_VIDEO_MODEL,
			endSeconds: WRAPPED_VIDEO_DURATION_SECONDS,
			name: `X Wrapped - @${handle}`,
			style: { prompt },
			aspectRatio: '16:9',
			resolution: '480p'
		},
		{ waitForCompletion: true, downloadOutputs: false }
	);
	return waitForProjectUrl(res);
}

async function generateImageToVideoFromPfp(
	analysis: PersonalityAnalysis,
	handle: string,
	imageUrl: string,
	webSearchContext?: string | null
): Promise<string> {
	const rawPrompt = buildImageToVideoPrompt(analysis, handle, webSearchContext);
	const prompt = truncatePromptForMagicHour(rawPrompt);
	if (rawPrompt.length > MAGIC_HOUR_PROMPT_MAX_CHARS) {
		console.warn('[magichour] image-to-video prompt truncated for API limit', {
			before: rawPrompt.length,
			after: prompt.length
		});
	}

	const client = getClient();
	const imageFilePath = await uploadFetchedImageToMagicHour(client, imageUrl);

	const res = await client.v1.imageToVideo.generate(
		{
			model: MAGIC_HOUR_VIDEO_MODEL,
			endSeconds: WRAPPED_VIDEO_DURATION_SECONDS,
			name: `X Wrapped - @${handle}`,
			resolution: '480p',
			assets: { imageFilePath },
			style: { prompt }
		},
		{ waitForCompletion: true, downloadOutputs: false }
	);
	return waitForProjectUrl(res);
}

export async function generateWrappedVoiceover(
	analysis: PersonalityAnalysis,
	handle: string
): Promise<{ audioUrl: string; voiceoverVoice: string }> {
	const voiceoverVoice = pickVoiceForAnalysis(analysis);
	const prompt = truncateAudioPromptForMagicHour(buildVoiceoverScript(analysis));
	const created = await requestMagicHourJson<MagicHourAudioCreateResponse>('/v1/ai-voice-generator', {
		method: 'POST',
		body: JSON.stringify({
			name: `X Wrapped voiceover - @${handle}`,
			style: {
				prompt,
				voice_name: voiceoverVoice
			}
		})
	});
	if (!created.id) {
		throw new Error(created.message || 'Magic Hour did not return an audio project id');
	}
	const audioUrl = await waitForAudioProjectUrl(created.id);
	return { audioUrl, voiceoverVoice };
}

/**
 * Prefer image-to-video from the user's profile photo + motion prompt; fall back to text-to-video if no usable image or on failure.
 */
export async function generateWrappedVideo(
	analysis: PersonalityAnalysis,
	handle: string,
	profilePicture?: string,
	webSearchContext?: string | null
): Promise<string> {
	const imageUrl = resolveProfileImageUrlForMagicHour(profilePicture);
	if (imageUrl) {
		try {
			console.log('[magichour] image-to-video from profile image', {
				handle,
				imagePreview: imageUrl.slice(0, 80)
			});
			return await generateImageToVideoFromPfp(analysis, handle, imageUrl, webSearchContext);
		} catch (e) {
			console.warn('[magichour] image-to-video failed, falling back to text-to-video', e);
		}
	} else {
		console.warn('[magichour] no usable profile image URL; using text-to-video', {
			handle,
			hadPictureField: Boolean(profilePicture?.trim())
		});
	}

	return generateTextOnlyWrappedVideo(analysis, handle, webSearchContext);
}
