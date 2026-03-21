import { Client } from 'magic-hour';
import { MAGIC_HOUR_API_KEY } from '$env/static/private';
import type { PersonalityAnalysis } from './types';

const client = new Client({ token: MAGIC_HOUR_API_KEY });

function buildVideoPrompt(analysis: PersonalityAnalysis, handle: string): string {
  return `Cinematic social media personality reveal video. ${analysis.colour_mood} visual aesthetic.

Opening: A glowing screen showing "@${handle}" with the title "X WRAPPED" in bold typography.

Scene 1: Visual representation of "${analysis.top_topics.join(', ')}" — the topics that define this person's online presence. ${analysis.tone} energy.

Scene 2: The archetype reveal — "${analysis.archetype}" appears in large cinematic text. ${analysis.archetype_description}.

Scene 3: ${analysis.vibe_summary}

Closing: Stats overlay — the text "Their archetype: ${analysis.archetype}" fades in with dramatic lighting.

Style: Modern, high-energy social media aesthetic. Dark background with vibrant accent colours. Motion graphics feel. Clean typography overlays. 20 seconds.`;
}

export async function generateVideo(analysis: PersonalityAnalysis, handle: string) {
  const prompt = buildVideoPrompt(analysis, handle);

  const result = await client.v1.textToVideo.generate({
    name: `X Wrapped - @${handle}`,
    style: {
      prompt,
    },
    endSeconds: 20,
  });

  return result;
}

export async function waitForVideo(projectId: string): Promise<string> {
  while (true) {
    const res = await client.v1.videoProjects.get({ id: projectId });

    if (res.status === 'complete') {
      return res.downloads[0].url;
    }
    if (res.status === 'error') {
      throw new Error('Video generation failed');
    }

    await new Promise(r => setTimeout(r, 3000));
  }
}
