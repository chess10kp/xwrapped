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

function buildPrompt(profile: ProfileData, tweets: TweetData[]): string {
  const tweetTexts = tweets
    .map((t, i) => `[${i+1}] "${t.text}" (${t.likeCount} likes, ${new Date(t.createdAt).toLocaleDateString()})`)
    .join('\n');

  return `You are an expert personality analyst. Analyse this X (Twitter) user's public profile and recent tweets. Return ONLY valid JSON matching this exact schema — no markdown, no explanation.

## Profile
- Handle: @${profile.username}
- Name: ${profile.name}
- Bio: ${profile.bio}
- Followers: ${profile.followers}
- Following: ${profile.following}
- Total tweets: ${profile.tweetsCount}
- Joined: ${profile.joinedAt}

## Recent Tweets (${tweets.length} total)
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
  "vibe_summary": "A 2-sentence cinematic description of this person's X presence, suitable for a video narration",
  "colour_mood": "A visual mood for video generation: e.g. 'neon cyberpunk', 'warm sunset', 'dark academia'"
}`;
}

export async function analysePersonality(
  profile: ProfileData,
  tweets: TweetData[]
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
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(profile, tweets) }]
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
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };

  if (payload.error?.message) {
    throw new Error(`OpenRouter: ${payload.error.message}`);
  }

  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Unexpected response shape from OpenRouter API');
  }

  return parsePersonalityJson(text);
}
