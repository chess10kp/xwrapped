import { store } from './db';
import { scrapeProfile, scrapeTweets } from './scraper';
import { analysePersonality } from './analyser';
import { generateVideo, waitForVideo } from './magichour';

async function processHandle(id: string, handle: string): Promise<void> {
  try {
    await store.update(id, { status: 'scraping' });

    const [profile, tweets] = await Promise.all([
      scrapeProfile(handle),
      scrapeTweets(handle)
    ]);

    await store.update(id, { 
      status: 'analysing',
      profile,
      tweets 
    });

    const analysis = await analysePersonality(profile, tweets);

    await store.update(id, { 
      status: 'generating',
      analysis 
    });

    const videoResult = await generateVideo(analysis, handle);
    const videoUrl = await waitForVideo(videoResult.id);

    await store.update(id, { 
      status: 'complete',
      videoUrl 
    });
  } catch (error) {
    await store.update(id, { 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export { processHandle };
