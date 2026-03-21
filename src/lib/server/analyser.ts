import { OPENROUTER_API_KEY } from '$lib/server/env.server';
import type { ProfileData, TweetData, PersonalityAnalysis } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
/** OpenRouter free-tier router — https://openrouter.ai/docs/guides/routing/routers/free-models-router */
const MODEL = 'openrouter/free';

function getOpenRouterKey(): string {
  const apiKey = OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is missing or empty. Add it to .env (see .env.example). https://openrouter.ai/keys'
    );
  }
  return apiKey;
}

/**
 * OpenRouter follows OpenAI Chat Completions: `message.content` may be a string
 * or an array of parts like `{ type: 'text', text: '...' }`. Some models omit
 * or null out `content` when using other fields.
 */
function extractAssistantMessageText(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') return undefined;
  const m = message as Record<string, unknown>;

  const fromParts = (parts: unknown): string | undefined => {
    if (!Array.isArray(parts)) return undefined;
    const out: string[] = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        out.push(part);
        continue;
      }
      if (part && typeof part === 'object') {
        const p = part as Record<string, unknown>;
        if (typeof p.text === 'string') out.push(p.text);
        else if (typeof p.content === 'string') out.push(p.content);
      }
    }
    const joined = out.join('');
    return joined.length > 0 ? joined : undefined;
  };

  const content = m.content;
  if (typeof content === 'string') {
    const t = content.trim();
    return t.length > 0 ? content : undefined;
  }
  if (Array.isArray(content)) {
    const t = fromParts(content);
    if (t) return t;
  }

  return undefined;
}

function parsePersonalityJson(text: string): PersonalityAnalysis {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as PersonalityAnalysis;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as PersonalityAnalysis;
    }
    throw new Error('Model did not return valid JSON for personality analysis');
  }
}

function buildPrompt(profile: ProfileData, tweets: TweetData[], webSearchContext?: string): string {
  const tweetTexts = tweets
    .map((t, i) => `[${i+1}] "${t.text}" (${t.likeCount} likes, ${new Date(t.createdAt).toLocaleDateString()})`)
    .join('\n');

  const webSection =
    webSearchContext?.trim() &&
    `## Public web context (Exa search — third-party pages; may be incomplete or outdated)
Use only as supporting context alongside their own tweets. Do not treat as definitive biography.

${webSearchContext.trim()}

`;

  return `You are an expert personality analyst. Analyse this X (Twitter) user's public profile and recent tweets. Return ONLY valid JSON matching this exact schema — no markdown, no explanation.

Writing style for ALL string fields: sound like a sharp human, not a brochure. Be concrete. Never use filler phrases, buzzwords, or "AI voice" (e.g. avoid: delve, tapestry, landscape, journey, unlock, navigate, realm, vibrant, robust, in today's world, at the end of the day, it goes without saying).

## Profile
- Handle: @${profile.username}
- Name: ${profile.name}
- Bio: ${profile.bio}
- Followers: ${profile.followers}
- Following: ${profile.following}
- Total tweets: ${profile.tweetsCount}
- Joined: ${profile.joinedAt}

${webSection ?? ''}## Recent Tweets (${tweets.length} total)
${tweetTexts}

## Required JSON Output Schema
{
  "archetype": "A creative 2-4 word label like 'The Midnight Ranter' or 'The Thread Architect'",
  "archetype_description": "One sentence explaining why this archetype fits",
  "top_topics": ["topic1", "topic2", "topic3"],
  "tone": "One word: e.g. sardonic, earnest, chaotic, analytical, wholesome",
  "posting_style": "One sentence describing HOW they post (thread lover, hot take machine, etc)",
  "peak_hour": "Best guess of their most active posting time, e.g. '2am'",
  "best_tweet": "Copy the single most characteristic/engaging tweet verbatim",
  "best_tweet_why": "One sentence on why this tweet captures their essence",
  "vibe_summary": "Exactly two short sentences: what this account is actually like to follow, in plain English. Pull in specific habits or topics from the tweets. No hype, no trailer narration, no summary-of-a-summary.",
  "colour_mood": "A visual mood for video generation: e.g. 'neon cyberpunk', 'warm sunset', 'dark academia'"
}`;
}

export async function analysePersonality(
  profile: ProfileData,
  tweets: TweetData[],
  webSearchContext?: string
): Promise<PersonalityAnalysis> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/xwrapped',
      'X-Title': 'xwrapped'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(profile, tweets, webSearchContext) }]
    })
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter API error ${res.status}: ${raw}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('OpenRouter returned non-JSON response');
  }

  const payload = data as {
    choices?: Array<{
      message?: unknown;
      finish_reason?: string | null;
    }>;
    error?: { message?: string };
  };

  if (payload.error?.message) {
    throw new Error(`OpenRouter: ${payload.error.message}`);
  }

  const choice0 = payload.choices?.[0];
  const text = extractAssistantMessageText(choice0?.message);
  if (!text?.trim()) {
    const fr = choice0?.finish_reason ?? 'unknown';
    const hint =
      fr === 'length'
        ? ' (response was cut off — try increasing max_tokens or shortening input)'
        : '';
    const preview = raw.length > 800 ? `${raw.slice(0, 800)}…` : raw;
    throw new Error(
      `OpenRouter returned no assistant text (finish_reason=${fr})${hint}. Raw: ${preview}`
    );
  }

  return parsePersonalityJson(text);
}
