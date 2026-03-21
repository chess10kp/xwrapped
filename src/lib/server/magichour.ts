import { ApiError, Client } from 'magic-hour';
import { MAGIC_HOUR_API_KEY } from '$lib/server/env.server';
import type { PersonalityAnalysis } from './types';

/** OpenAPI: `style.prompt` maxLength 2000 — longer prompts return 422. */
const TEXT_TO_VIDEO_PROMPT_MAX = 2000;

let client: Client | null = null;

function getMagicHourClient(): Client {
  if (client) return client;
  const token = MAGIC_HOUR_API_KEY?.trim();
  if (!token) {
    throw new Error(
      'MAGIC_HOUR_API_KEY is missing or empty. Add it to .env (see .env.example). https://magichour.ai/developer?tab=api-keys'
    );
  }
  client = new Client({ token });
  return client;
}

function buildVideoPrompt(analysis: PersonalityAnalysis, handle: string): string {
  return `Cinematic social media personality reveal video. ${analysis.colour_mood} visual aesthetic.

Opening: A glowing screen showing "@${handle}" with the title "X WRAPPED" in bold typography.

Scene 1: Visual representation of "${analysis.top_topics.join(', ')}" — the topics that define this person's online presence. ${analysis.tone} energy.

Scene 2: The archetype reveal — "${analysis.archetype}" appears in large cinematic text. ${analysis.archetype_description}.

Scene 3: ${analysis.vibe_summary}

Closing: Stats overlay — the text "Their archetype: ${analysis.archetype}" fades in with dramatic lighting.

Style: Modern, high-energy social media aesthetic. Dark background with vibrant accent colours. Motion graphics feel. Clean typography overlays. 20 seconds.`;
}

function clampTextToVideoPrompt(prompt: string): string {
  if (prompt.length <= TEXT_TO_VIDEO_PROMPT_MAX) return prompt;
  const suffix = '…';
  const slice = [...prompt].slice(0, TEXT_TO_VIDEO_PROMPT_MAX - suffix.length).join('');
  return slice + suffix;
}

async function magicHourErrorDetail(error: unknown): Promise<string | undefined> {
  if (!(error instanceof ApiError)) return undefined;
  try {
    const text = await error.response.text();
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message?.trim() || text.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function generateVideo(analysis: PersonalityAnalysis, handle: string) {
  let prompt = buildVideoPrompt(analysis, handle);
  if (prompt.length > TEXT_TO_VIDEO_PROMPT_MAX) {
    console.warn('[magichour] prompt exceeds API maxLength, truncating', {
      before: prompt.length,
      max: TEXT_TO_VIDEO_PROMPT_MAX,
    });
    prompt = clampTextToVideoPrompt(prompt);
  }

  try {
    return await getMagicHourClient().v1.textToVideo.generate({
      name: `X Wrapped - @${handle}`,
      // Explicit model: paid default kling-2.5 only allows 5s/10s — we need 20s.
      model: 'kling-1.6',
      aspectRatio: '16:9',
      resolution: '720p',
      style: {
        prompt,
      },
      endSeconds: 20,
    });
  } catch (e) {
    const detail = await magicHourErrorDetail(e);
    if (detail) {
      throw new Error(`Magic Hour: ${detail}`);
    }
    throw e;
  }
}

export async function waitForVideo(projectId: string): Promise<string> {
  while (true) {
    const res = await getMagicHourClient().v1.videoProjects.get({ id: projectId });

    if (res.status === 'complete') {
      return res.downloads[0].url;
    }
    if (res.status === 'error') {
      throw new Error('Video generation failed');
    }

    await new Promise(r => setTimeout(r, 3000));
  }
}
