import { store } from "./db";
import { fetchProfile, fetchTweets } from "./twitterapi";
import {
  loadRepoTweetExport,
  profileFromExportFooter,
  repoTweetsAsTweetData,
} from "./repo-tweet-export";
import { stubProfile, stubTweets } from "./stub-x-data";
import type { ProfileData, TweetData } from "./types";
import { analysePersonality } from "./analyser";
import { generateWrappedVideo, isMagicHourConfigured } from "./magichour";
import { TWITTERAPI_IO_KEY } from "$lib/server/env.server";
import {
  fetchTwitterUserProfile,
  isTwitterApiConfigured,
  mergeProfileWithLive,
} from "./twitter-profile";

const log = (...args: unknown[]) => console.log("[pipeline]", ...args);

/** Generate video for an existing completed wrap (e.g. backfill after adding MAGIC_HOUR_API_KEY). */
export async function processVideoBackfill(handle: string): Promise<void> {
  const id = handle.toLowerCase();
  const r = await store.get(id);
  if (!r?.analysis || r.videoUrl) return;
  try {
    const videoUrl = await generateWrappedVideo(
      r.analysis,
      handle,
      r.profile?.profilePicture,
    );
    log("video backfill ready", { id, urlLength: videoUrl.length });
    await store.update(id, {
      status: "complete",
      analysis: r.analysis,
      videoUrl,
      videoError: "",
    });
  } catch (videoErr) {
    const message =
      videoErr instanceof Error ? videoErr.message : String(videoErr);
    console.error("[pipeline] video backfill failed", {
      id,
      handle,
      error: videoErr,
    });
    await store.update(id, {
      status: "complete",
      analysis: r.analysis,
      videoError: message.slice(0, 500),
    });
    log("backfill complete without video", { id, handle });
  }
}

async function processHandle(id: string, handle: string): Promise<void> {
  log("start", { id, handle });
  try {
    await store.update(id, { status: "scraping" });

    let profile: ProfileData;
    let tweets: TweetData[];

    // Priority 1: Try to load from repo tweet export
    const repo = loadRepoTweetExport(handle);
    if (repo?.tweets.length) {
      log("using repo tweet export", {
        sourceFile: repo.sourceFile,
        tweetCount: repo.tweets.length,
      });
      profile = repo.footer
        ? profileFromExportFooter(handle, repo.footer, repo.tweets.length)
        : { ...stubProfile(handle), tweetsCount: repo.tweets.length };
      tweets = repoTweetsAsTweetData(repo.tweets);
    }
    // Priority 2: Try to fetch from twitterapi.io
    else if (TWITTERAPI_IO_KEY?.trim()) {
      log("scraping profile + tweets (twitterapi.io)…");
      [profile, tweets] = await Promise.all([
        fetchProfile(handle),
        fetchTweets(handle),
      ]);
    }
    // Priority 3: Fall back to stubs
    else {
      log("no repo export or TWITTERAPI_IO_KEY — using stub profile + tweets");
      profile = stubProfile(handle);
      tweets = stubTweets(handle);
    }

    if (isTwitterApiConfigured()) {
      log(
        "merging live X profile (twitterapi.io user/info — avatar + counts)…",
      );
      const live = await fetchTwitterUserProfile(handle);
      if (live) {
        profile = mergeProfileWithLive(profile, live);
        log("live profile merged", {
          hasAvatarUrl: Boolean(profile.profilePicture?.trim()),
        });
      } else {
        log("live profile not returned; using export/stub profile only");
      }
    }

    log("scrape ok", { username: profile.username, tweetCount: tweets.length });

    await store.update(id, {
      status: "analysing",
      profile,
      tweets,
    });

    log("analysing personality (OpenRouter)…");
    const analysis = await analysePersonality(profile, tweets);
    log("analysis ok", { archetype: analysis.archetype });

    if (isMagicHourConfigured()) {
      await store.update(id, {
        status: "generating",
        analysis,
      });
      log("generating video (Magic Hour)…");
      try {
        const videoUrl = await generateWrappedVideo(
          analysis,
          handle,
          profile.profilePicture,
        );
        log("video ready", { urlLength: videoUrl.length });
        await store.update(id, {
          status: "complete",
          analysis,
          videoUrl,
          videoError: "",
        });
      } catch (videoErr) {
        const msg =
          videoErr instanceof Error ? videoErr.message : String(videoErr);
        console.error("[pipeline] video generation failed", {
          id,
          handle,
          error: videoErr,
        });
        await store.update(id, {
          status: "complete",
          analysis,
          videoError: msg.slice(0, 500),
        });
        log("complete without video (Magic Hour error)", { id, handle });
      }
    } else {
      log("Magic Hour skipped — set MAGIC_HOUR_API_KEY in .env for AI video");
      await store.update(id, {
        status: "complete",
        analysis,
      });
    }
    log("complete", { id, handle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[pipeline] failed", { id, handle, error });
    await store.update(id, {
      status: "error",
      error: message,
    });
  }
}

export { processHandle };
