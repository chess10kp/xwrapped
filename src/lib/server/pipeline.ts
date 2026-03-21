import { store } from "./db";
import { fetchProfile, fetchTweets } from "./twitterapi";
import {
  loadRepoTweetExport,
  profileFromExportFooter,
  repoTweetsAsTweetData,
} from "./repo-tweet-export";
import { stubProfile, stubTweets } from "./stub-x-data";
import type { ProfileData, TweetData, WrappedResult } from "./types";
import { analysePersonality } from "./analyser";
import { isExaConfigured, searchWebContextForPerson } from "./exa";
import { generateWrappedVideo, generateWrappedVoiceover, isMagicHourConfigured } from "./magichour";
import { TWITTERAPI_IO_KEY } from "$lib/server/env.server";
import {
  fetchTwitterUserProfile,
  isTwitterApiConfigured,
  mergeProfileWithLive,
} from "./twitter-profile";

const log = (...args: unknown[]) => console.log("[pipeline]", ...args);

/** Generate missing Magic Hour media for an existing completed wrap. */
export async function processMediaBackfill(handle: string): Promise<void> {
  const id = handle.toLowerCase();
  const r = await store.get(id);
  if (
    !r?.analysis ||
    ((r.videoUrl || r.videoError?.trim()) && (r.audioUrl || r.audioError?.trim()))
  ) {
    return;
  }
  try {
    let webCtx = r.webSearchContext;
    if (!webCtx?.trim() && r.profile && isExaConfigured()) {
      const ctx = await searchWebContextForPerson(r.profile);
      if (ctx) {
        webCtx = ctx;
        await store.update(id, { webSearchContext: ctx });
        log("backfill: saved web context from Exa", { id, chars: ctx.length });
      }
    }
    const mediaUpdates: Partial<WrappedResult> = {
      status: "complete",
      analysis: r.analysis,
    };

    if (!r.videoUrl && !r.videoError?.trim()) {
      try {
        const videoUrl = await generateWrappedVideo(
          r.analysis,
          handle,
          r.profile?.profilePicture,
          webCtx,
        );
        log("video backfill ready", { id, urlLength: videoUrl.length });
        mediaUpdates.videoUrl = videoUrl;
        mediaUpdates.videoError = "";
      } catch (videoErr) {
        const message =
          videoErr instanceof Error ? videoErr.message : String(videoErr);
        console.error("[pipeline] video backfill failed", {
          id,
          handle,
          error: videoErr,
        });
        mediaUpdates.videoError = message.slice(0, 500);
      }
    }

    if (!r.audioUrl && !r.audioError?.trim()) {
      try {
        const audio = await generateWrappedVoiceover(r.analysis, handle);
        log("audio backfill ready", {
          id,
          voice: audio.voiceoverVoice,
          urlLength: audio.audioUrl.length,
        });
        mediaUpdates.audioUrl = audio.audioUrl;
        mediaUpdates.voiceoverVoice = audio.voiceoverVoice;
        mediaUpdates.audioError = "";
      } catch (audioErr) {
        const message =
          audioErr instanceof Error ? audioErr.message : String(audioErr);
        console.error("[pipeline] audio backfill failed", {
          id,
          handle,
          error: audioErr,
        });
        mediaUpdates.audioError = message.slice(0, 500);
      }
    }

    await store.update(id, mediaUpdates);
    log("backfill complete", { id, handle });
  } catch (mediaErr) {
    console.error("[pipeline] media backfill failed", { id, handle, error: mediaErr });
    await store.update(id, { status: "complete" });
  }
}

async function processHandle(id: string, handle: string): Promise<void> {
  log("start", { id, handle });
  try {
    await store.update(id, { status: "scraping" });

    let profile: ProfileData;
    let tweets: TweetData[];

    // Priority 1: Try bundled or on-disk tweet export (no twitterapi.io)
    const repo = loadRepoTweetExport(handle);
    const usedBundledOrRepoExport = Boolean(repo?.tweets.length);
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

    if (isTwitterApiConfigured() && !usedBundledOrRepoExport) {
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

    log("fetching public web context (Exa)…");
    const webSearchContext = await searchWebContextForPerson(profile);
    if (webSearchContext) {
      log("web context ok", { chars: webSearchContext.length });
    } else {
      log("web context empty or skipped (set EXA_API_KEY for Exa search)");
    }

    await store.update(id, {
      status: "analysing",
      profile,
      tweets,
      ...(webSearchContext ? { webSearchContext } : {}),
    });

    log("analysing personality (OpenRouter)…");
    const analysis = await analysePersonality(profile, tweets, webSearchContext);
    log("analysis ok", { archetype: analysis.archetype });

    if (isMagicHourConfigured()) {
      await store.update(id, {
        status: "generating",
        analysis,
      });
      const mediaUpdates: Partial<WrappedResult> = {
        status: "complete",
        analysis,
      };

      log("generating video (Magic Hour)…");
      try {
        const videoUrl = await generateWrappedVideo(
          analysis,
          handle,
          profile.profilePicture,
          webSearchContext,
        );
        log("video ready", { urlLength: videoUrl.length });
        mediaUpdates.videoUrl = videoUrl;
        mediaUpdates.videoError = "";
      } catch (videoErr) {
        const msg =
          videoErr instanceof Error ? videoErr.message : String(videoErr);
        console.error("[pipeline] video generation failed", {
          id,
          handle,
          error: videoErr,
        });
        mediaUpdates.videoError = msg.slice(0, 500);
        log("complete without video (Magic Hour error)", { id, handle });
      }

      log("generating voiceover (Magic Hour)…");
      try {
        const audio = await generateWrappedVoiceover(analysis, handle);
        log("voiceover ready", {
          voice: audio.voiceoverVoice,
          urlLength: audio.audioUrl.length,
        });
        mediaUpdates.audioUrl = audio.audioUrl;
        mediaUpdates.voiceoverVoice = audio.voiceoverVoice;
        mediaUpdates.audioError = "";
      } catch (audioErr) {
        const msg =
          audioErr instanceof Error ? audioErr.message : String(audioErr);
        console.error("[pipeline] voiceover generation failed", {
          id,
          handle,
          error: audioErr,
        });
        mediaUpdates.audioError = msg.slice(0, 500);
        log("complete without voiceover (Magic Hour error)", { id, handle });
      }

      await store.update(id, mediaUpdates);
    } else {
      log("Magic Hour skipped — set MAGIC_HOUR_API_KEY in .env for AI video + audio");
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
