import { store } from './db';
import { stubProfile, stubTweets } from './stub-x-data';
import type { ProfileData, TweetData } from './types';
import { analysePersonality } from './analyser';
import { isExaConfigured, searchWebContextForPerson } from './exa';
import { generateVideo, waitForVideo } from './magichour';

const log = (...args: unknown[]) => console.log('[pipeline]', ...args);

async function processHandle(id: string, handle: string): Promise<void> {
  log('start', { id, handle });
  try {
    await store.update(id, { status: 'scraping' });

    log('using stub profile + tweets');
    const profile = stubProfile(handle);
    const tweets = stubTweets(handle);
    log('scrape ok', { username: profile.username, tweetCount: tweets.length });

    await store.update(id, { 
      status: 'analysing',
      profile,
      tweets 
    });

    let webSearchContext: string | undefined;
    if (isExaConfigured()) {
      log('Exa web search (public context for this person)…');
      const ctx = await searchWebContextForPerson(profile);
      if (ctx) {
        webSearchContext = ctx;
        await store.update(id, { webSearchContext: ctx });
        log('Exa context ok', { chars: ctx.length });
      } else {
        log('Exa context skipped or empty');
      }
    } else {
      log('Exa disabled — set EXA_API_KEY for web search alongside tweets');
    }

    log('analysing personality (OpenRouter)…');
    const analysis = await analysePersonality(profile, tweets, webSearchContext);
    log('analysis ok', { archetype: analysis.archetype });

    await store.update(id, { 
      status: 'generating',
      analysis 
    });

    log('generating video (Magic Hour)…');
    const videoResult = await generateVideo(analysis, handle, profile.profilePicture);
    log('video job created', { projectId: videoResult.id });
    const videoUrl = await waitForVideo(videoResult.id);
    log('video ready', { urlLength: videoUrl.length });

    await store.update(id, { 
      status: 'complete',
      videoUrl 
    });
    log('complete', { id, handle });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pipeline] failed', { id, handle, error });
    await store.update(id, { 
      status: 'error',
      error: message
    });
  }
}

export { processHandle };
