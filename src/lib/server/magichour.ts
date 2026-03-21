import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, Client } from 'magic-hour';
import { MAGIC_HOUR_API_KEY } from '$lib/server/env.server';
import type { PersonalityAnalysis } from './types';

/** OpenAPI: `style.prompt` maxLength 2000 — longer prompts return 422. */
const VIDEO_PROMPT_MAX = 2000;

/** Project root (…/src/lib/server → three levels up). */
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

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

/** Resolve scraped URL, or a site-relative path like `/images/foo.png` under `static/`, for Magic Hour `uploadFile`. */
function resolveProfileImageInput(profilePicture: string): string | null {
  const p = profilePicture.trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/')) {
    const abs = join(PROJECT_ROOT, 'static', p.slice(1));
    return existsSync(abs) ? abs : null;
  }
  const abs = join(PROJECT_ROOT, 'static', p);
  return existsSync(abs) ? abs : null;
}

/** Prompt for image→video: keep PFP likeness; motion + mood reflect how they tweet. */
function buildImageToVideoPrompt(analysis: PersonalityAnalysis, handle: string): string {
  const topics = analysis.top_topics.join(', ');
  return `Short social “wrapped” clip starting from this profile photo. Keep the person clearly recognizable — same face, natural skin and lighting; do not replace them with a different person.

Motion: subtle cinematic movement only — slow push-in, gentle parallax, or soft depth; no chaotic warping.

Mood and color: ${analysis.colour_mood}. Energy: ${analysis.tone}.

What their posts are like: ${analysis.posting_style}. Main themes: ${topics}.

Archetype on display: ${analysis.archetype}. ${analysis.archetype_description}

Overall vibe: ${analysis.vibe_summary}

Optional: very light typography at the end — "@${handle}" or “${analysis.archetype}” — minimal, not a full storyboard of text.

About 10 seconds, polished motion-graphics feel matching the mood above.`;
}

/** Fallback when no image: text-only video (no PFP). */
function buildTextOnlyVideoPrompt(analysis: PersonalityAnalysis, handle: string): string {
  return `Cinematic social media personality reveal video. ${analysis.colour_mood} visual aesthetic.

Opening: A glowing screen showing "@${handle}" with the title "X WRAPPED" in bold typography.

Scene 1: Visual representation of "${analysis.top_topics.join(', ')}" — the topics that define this person's online presence. ${analysis.tone} energy.

Scene 2: The archetype reveal — "${analysis.archetype}" appears in large cinematic text. ${analysis.archetype_description}.

Scene 3: ${analysis.vibe_summary}

Closing: Stats overlay — the text "Their archetype: ${analysis.archetype}" fades in with dramatic lighting.

Style: Modern, high-energy social media aesthetic. Dark background with vibrant accent colours. Motion graphics feel. Clean typography overlays. 20 seconds.`;
}

function clampVideoPrompt(prompt: string): string {
  if (prompt.length <= VIDEO_PROMPT_MAX) return prompt;
  const suffix = '…';
  const slice = [...prompt].slice(0, VIDEO_PROMPT_MAX - suffix.length).join('');
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

export async function generateVideo(
  analysis: PersonalityAnalysis,
  handle: string,
  profilePicture: string
): Promise<{ id: string }> {
  const mh = getMagicHourClient();
  const resolved = resolveProfileImageInput(profilePicture);

  if (resolved) {
    let prompt = buildImageToVideoPrompt(analysis, handle);
    prompt = clampVideoPrompt(prompt);
    try {
      const imageFilePath = await mh.v1.files.uploadFile(resolved);
      return await mh.v1.imageToVideo.create({
        name: `X Wrapped - @${handle}`,
        // ltx-2: non-Kling; strong for expressive faces from a still (PFP). 10s is a supported duration.
        model: 'ltx-2',
        resolution: '720p',
        endSeconds: 10,
        assets: { imageFilePath },
        style: { prompt },
      });
    } catch (e) {
      const detail = await magicHourErrorDetail(e);
      console.warn('[magichour] image-to-video failed, falling back to text-to-video', detail ?? e);
      // Fall through to text-only
    }
  } else {
    console.warn('[magichour] no usable profile image; using text-to-video', {
      profilePicture: profilePicture || '(empty)',
    });
  }

  let prompt = buildTextOnlyVideoPrompt(analysis, handle);
  prompt = clampVideoPrompt(prompt);

  try {
    return await mh.v1.textToVideo.create({
      name: `X Wrapped - @${handle}`,
      model: 'ltx-2',
      aspectRatio: '16:9',
      resolution: '720p',
      style: { prompt },
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
