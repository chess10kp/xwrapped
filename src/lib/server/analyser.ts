import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { ProfileData, TweetData, PersonalityAnalysis } from './types';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: buildPrompt(profile, tweets),
    }],
  });
  
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }
  
  return JSON.parse(content.text) as PersonalityAnalysis;
}
