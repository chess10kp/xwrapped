import { store } from './db';
import { scrapeProfile, scrapeTweets } from './scraper';
import { stubProfile, stubTweets } from './stub-x-data';
import type { ProfileData, TweetData } from './types';
import { useApify } from './use-apify';
import { analysePersonality } from './analyser';
import { generateVideo, waitForVideo } from './magichour';

const log = (...args: unknown[]) => console.log('[pipeline]', ...args);

async function processHandle(id: string, handle: string): Promise<void> {
  log('start', { id, handle });
  try {
    await store.update(id, { status: 'scraping' });

    let profile: ProfileData;
    let tweets: TweetData[];
    if (useApify()) {
      log('scraping profile + tweets (Apify)…');
      [profile, tweets] = await Promise.all([scrapeProfile(handle), scrapeTweets(handle)]);
    } else {
      log('Apify disabled — using stub profile + tweets (set USE_APIFY=true to enable live scraping)');
      profile = stubProfile(handle);
      tweets = stubTweets(handle);
    }
    log('scrape ok', { username: profile.username, tweetCount: tweets.length });

    await store.update(id, { 
      status: 'analysing',
      profile,
      tweets 
    });

    log('analysing personality (OpenRouter)…');
    const analysis = await analysePersonality(profile, tweets);
    log('analysis ok', { archetype: analysis.archetype });

    await store.update(id, { 
      status: 'generating',
      analysis 
    });

    log('generating video (Magic Hour)…');
    const videoResult = await generateVideo(analysis, handle);
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
