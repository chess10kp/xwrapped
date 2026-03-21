import { jsonrepair } from 'jsonrepair';
import { OPENROUTER_API_KEY } from '$lib/server/env.server';
import type { ProfileData, TweetData, PersonalityAnalysis } from './types';
import { aggregateTweetStats } from '$lib/tweet-stats';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
/** OpenRouter free-tier router — https://openrouter.ai/docs/guides/routing/routers/free-models-router */
const MODEL = 'openrouter/free';

/** Live tweet fetch paginates all pages; the prompt must stay within model context (esp. on free routers). */
const MAX_TWEETS_IN_PROMPT = 100;
/** Long threads or quote-tweets can still blow the budget; trim per-tweet text in the prompt only. */
const MAX_TWEET_CHARS_IN_PROMPT = 560;
/** Personality JSON is large; remote free models often need ≥4k completion headroom. */
const MAX_COMPLETION_TOKENS = 8192;

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

  if (typeof m.reasoning === 'string') {
    const r = m.reasoning.trim();
    if (r.length > 0) return r;
  }

  return undefined;
}

function trimTweetTextForPrompt(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_TWEET_CHARS_IN_PROMPT) return t;
  return `${t.slice(0, MAX_TWEET_CHARS_IN_PROMPT)}…`;
}

/** Remove optional ``` / ```json fences the model sometimes wraps around output. */
function stripCodeFences(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  if (m) return m[1].trim();
  return t;
}

/**
 * First `{` … matching `}` with string/escape awareness (greedy regex breaks on nested objects).
 * Returns null if braces never balance (truncated response).
 */
function extractBalancedJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
    } else if (c === '"') {
      inString = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function parsePersonalityJson(text: string): PersonalityAnalysis {
  const stripped = stripCodeFences(text.trim());
  const balanced = extractBalancedJsonObject(stripped);
  const chunks = balanced ? Array.from(new Set([stripped, balanced])) : [stripped];

  const errors: string[] = [];
  for (const chunk of chunks) {
    try {
      return JSON.parse(chunk) as PersonalityAnalysis;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    try {
      return JSON.parse(jsonrepair(chunk)) as PersonalityAnalysis;
    } catch (e) {
      errors.push(`jsonrepair: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const preview = stripped.length > 400 ? `${stripped.slice(0, 400)}…` : stripped;
  throw new Error(
    `Model did not return valid JSON for personality analysis (${errors[0] ?? 'unknown'}). Snippet: ${preview}`
  );
}

function buildPrompt(
  profile: ProfileData,
  tweets: TweetData[],
  webSearchContext?: string | null
): string {
  const capped = tweets.slice(0, MAX_TWEETS_IN_PROMPT);
  const tweetAgg = aggregateTweetStats(capped);
  const tweetTexts = capped
    .map(
      (t, i) =>
        `[${i + 1}] "${trimTweetTextForPrompt(t.text)}" (${t.likeCount} likes, ${new Date(t.createdAt).toLocaleDateString()})`
    )
    .join('\n');

  const webTrim = webSearchContext?.trim() ?? '';
  const webSection = webTrim
    ? `## Public web context (Exa — exactly one third-party result; may be incomplete or outdated)
${webTrim}

`
    : '';

  return `You are an expert personality analyst. Analyse this X (Twitter) user's public profile and recent tweets. Return ONLY valid JSON matching this exact schema — no markdown, no explanation.

JSON string rules (critical): escape every internal double quote as \\" and use \\n for newlines. If a tweet in best_tweet contains quotes, escape them or use a short paraphrase so the output is valid JSON.

Writing style for ALL string fields: write like Spotify Wrapped talking directly to the person. Use second person. Short punchy sentences. Celebratory but slightly roast-y. Confident, never hedging. Informal, like a hype friend who has read every tweet and has opinions.

Hard rules for tone:
- Never write in third person about the user.
- Never hedge with phrases like "it seems", "it appears", "probably", "maybe", "arguably", or "might".
- Never sound formal, balanced, academic, or HR-coded.
- Never use filler phrases, buzzwords, or "AI voice" (e.g. avoid: delve, tapestry, landscape, journey, unlock, navigate, realm, vibrant, robust, in today's world, at the end of the day, it goes without saying).
- Be specific. Pick a read and commit to it.
- Keep each prose field to no more than 3 sentences. Shorter is better.

For archetype, archetype_description, and especially vibe_summary: infer how they come across from their tweets — topics, voice, habits. The official bio is optional context only; do not let it override what the posts actually show.

If the Exa result adds a concrete detail that clearly matches the tweets, weave that detail into vibe_summary or posting_style. Use it as extra color, not as the main source of truth. If it conflicts with the tweets, ignore it.

Write vibe_summary in second person, like a friend who knows them a little too well. Slightly roast-y is good. Observant is better than mean. It should feel alive, not analytical.

Write archetype_description like a tiny Pokedex entry or horoscope blurb. Exactly two short sentences. Sentence one should name or frame the archetype. Sentence two should land the joke or tell on their habits.

Write metric_comparisons like Spotify Wrapped factoids. One short sentence per metric. Funny, vivid, culturally recognizable. Always write them in second person, talking directly to "you". Never say "he", "she", "they", "this user", or refer to the person indirectly. Treat the followers metric as a witty follow-up to a percentile estimate, not a raw follower-count repeat. Comparisons can be approximate, but they should still feel broadly plausible. No disclaimers, no math working, no "roughly speaking", no "that's like". Just land the line.

## Profile
- Handle: @${profile.username}
- Name: ${profile.name}
- Bio: ${profile.bio}
- Followers: ${profile.followers}
- Following: ${profile.following}
- Total tweets: ${profile.tweetsCount}
- Joined: ${profile.joinedAt}

## Recent Tweets (${capped.length} of ${tweets.length} total — capped for analysis)
${tweetTexts}
## Metric inputs for comparison lines
- followers: ${profile.followers}
- following: ${profile.following}
- lifetime_posts: ${profile.tweetsCount}
- posts_analysed: ${capped.length}
- peak_hour: ${capped.length > 0 ? 'infer from tweet timestamps' : 'unknown'}
- total_likes_on_analysed_posts: ${tweetAgg.totalLikes}
- avg_views_per_analysed_post: ${tweetAgg.avgViews}
${webSection}## Required JSON Output Schema
{
  "archetype": "A creative 2-6 word persona label like 'The Midnight Ranter' or 'The Thread Architect' — specific to their tweets, not generic",
  "archetype_description": "Exactly two short sentences of lore for the archetype, written like a witty Pokedex entry or horoscope blurb",
  "metric_comparisons": {
    "followers": "One short funny follow-up line for their estimated follower percentile on X, written in second person",
    "following": "One short funny comparison line for the following count, written in second person, even if it may not be displayed everywhere",
    "lifetime_posts": "One short funny comparison line for the total post count, written in second person, even if it may not be displayed everywhere",
    "posts_analysed": "One short funny comparison line for how many posts were analysed in this wrap, written in second person, even if it may not be displayed everywhere",
    "peak_hour": "One short funny comparison line for peak posting time, written in second person",
    "total_likes": "One short funny comparison line for total likes across analysed posts, written in second person",
    "avg_views": "One short funny comparison line for average views per analysed post, written in second person"
  },
  "top_topics": ["topic1", "topic2", "topic3"],
  "tone": "One word: e.g. sardonic, earnest, chaotic, analytical, wholesome",
  "posting_style": "One or two short sentences describing HOW they post. Same second-person, punchy, confident tone as the rest.",
  "peak_hour": "Best guess of their most active posting time, e.g. '2am'",
  "best_tweet": "Copy the single most characteristic/engaging tweet verbatim",
  "best_tweet_why": "One short confident sentence on why this tweet captures their essence",
  "vibe_summary": "Exactly two or three short sentences in second person: what this account reads as from the tweets alone — voice, fixations, how they show up in the feed. Ground it in the posts, not the bio. Slightly roast-y, like a perceptive friend. No hype trailer narration. No detached analysis.",
  "colour_mood": "A visual mood for video generation: e.g. 'neon cyberpunk', 'warm sunset', 'dark academia'"
}`;
}

export async function analysePersonality(
  profile: ProfileData,
  tweets: TweetData[],
  webSearchContext?: string | null
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
      max_tokens: MAX_COMPLETION_TOKENS,
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
