# X Wrapped — Implementation Plan

## Overview

Five phases, each building on the last. Each phase ends with a testable milestone.

---

## Phase 1 — Foundation (SvelteKit Scaffold + Scraper)

**Goal:** User enters a handle → backend returns raw profile + tweets JSON.

### 1.1 Project Setup

```bash
npx sv create xwrapped          # SvelteKit, Svelte 5, TypeScript
cd xwrapped
npx sv add mcp                  # Svelte MCP for code quality
npm i -D tailwindcss @tailwindcss/vite
```

- Configure `tailwind.config` with X dark theme tokens:
  - `bg-primary: #0F1419`, `accent: #1D9BF0`, `surface: #16181C`, `text: #E7E9EA`
- Add environment variable schema (`.env.example`):
  ```
  APIFY_API_TOKEN=
  ANTHROPIC_API_KEY=
  MAGIC_HOUR_API_KEY=
  ```

### 1.2 Landing Page (`/`)

- Single-purpose page: one `<input>` for `@handle`, one `<button>`.
- Client-side validation: strip `@`, reject empty/whitespace, allow `[a-zA-Z0-9_]{1,15}`.
- On submit → `POST /api/generate` with `{ handle }`.
- After response, redirect to `/loading/[uuid]`.

### 1.3 X Scraper Service (`src/lib/server/scraper.ts`)

**Use Apify's Twitter Scraper** (actor `automation-lab/twitter-scraper`). Two calls per handle:

| Call | Apify Mode | Input | Returns |
|------|-----------|-------|---------|
| **Profile** | `profiles` | `{ mode: "profiles", usernames: [handle] }` | `name, bio, followers, following, tweetsCount, profilePicture, isBlueVerified, joinedAt` |
| **Tweets** | `user-tweets` | `{ mode: "user-tweets", usernames: [handle], maxResults: 50 }` | Array of `{ text, createdAt, likeCount, retweetCount, replyCount, viewCount, hashtags, mentions }` |

**Implementation:**

```typescript
// src/lib/server/scraper.ts
import { ApifyClient } from 'apify-client';
import { APIFY_API_TOKEN } from '$env/static/private';

const client = new ApifyClient({ token: APIFY_API_TOKEN });

export async function scrapeProfile(handle: string): Promise<ProfileData> {
  const run = await client.actor('automation-lab/twitter-scraper').call({
    mode: 'profiles',
    usernames: [handle],
  });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items[0]; // first result
}

export async function scrapeTweets(handle: string): Promise<TweetData[]> {
  const run = await client.actor('automation-lab/twitter-scraper').call({
    mode: 'user-tweets',
    usernames: [handle],
    maxResults: 50,
  });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items;
}
```

**Install:** `npm i apify-client`

### 1.4 Data Store (`src/lib/server/store.ts`)

- In-memory `Map<string, WrappedResult>` keyed by UUID.
- `WrappedResult` type:
  ```typescript
  interface WrappedResult {
    id: string;
    handle: string;
    status: 'scraping' | 'analysing' | 'generating' | 'complete' | 'error';
    profile?: ProfileData;
    tweets?: TweetData[];
    analysis?: PersonalityAnalysis;
    videoUrl?: string;
    error?: string;
    createdAt: Date;
  }
  ```
- For hackathon: also write to `data/[uuid].json` as backup.

### 1.5 Generate Endpoint (`src/routes/api/generate/+server.ts`)

```typescript
export async function POST({ request }) {
  const { handle } = await request.json();
  const id = crypto.randomUUID();

  // Save initial state
  store.set(id, { id, handle, status: 'scraping', createdAt: new Date() });

  // Kick off async pipeline (don't await the full chain)
  processHandle(id, handle); // fire-and-forget

  return json({ id });
}
```

`processHandle` runs: scrape → analyse → generate video → update store at each step.

### Phase 1 Milestone

✅ `POST /api/generate` with `{ handle: "elonmusk" }` returns `{ id: "uuid" }`.
✅ `GET /api/status/[uuid]` shows `status: "scraping"` → eventually raw tweets JSON.

---

## Phase 2 — Intelligence (Claude Analysis Pipeline)

**Goal:** Raw tweets → structured personality JSON with archetype, themes, tone.

### 2.1 Claude Integration (`src/lib/server/analyser.ts`)

**Use Anthropic SDK directly** (not the Svelte MCP server — that's for dev tooling, not runtime AI calls).

```bash
npm i @anthropic-ai/sdk
```

```typescript
// src/lib/server/analyser.ts
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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
  return JSON.parse(response.content[0].text);
}
```

### 2.2 Analysis Prompt Design

The prompt should output a strict JSON schema. Key strategy: **give Claude the raw data, ask for structured personality insights, and constrain the output format.**

```typescript
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
```

### 2.3 PersonalityAnalysis Type

```typescript
interface PersonalityAnalysis {
  archetype: string;
  archetype_description: string;
  top_topics: string[];
  tone: string;
  posting_style: string;
  peak_hour: string;
  best_tweet: string;
  best_tweet_why: string;
  vibe_summary: string;
  colour_mood: string;
}
```

### Phase 2 Milestone

✅ Scrape + analyse pipeline produces a `PersonalityAnalysis` JSON for any handle.
✅ Analysis feels specific and entertaining — not generic.

---

## Phase 3 — Wow Factor (MagicHour Video Generation)

**Goal:** Personality JSON → MagicHour text-to-video → playable video on results page.

### 3.1 MagicHour Service (`src/lib/server/magichour.ts`)

**Use `POST /v1/text-to-video`** — the best fit since we're generating from a text prompt, not an existing image/video.

```bash
npm i magic-hour   # Node.js SDK
```

```typescript
// src/lib/server/magichour.ts
import { Client } from 'magic-hour';
import { MAGIC_HOUR_API_KEY } from '$env/static/private';

const client = new Client({ token: MAGIC_HOUR_API_KEY });

export async function generateVideo(analysis: PersonalityAnalysis, handle: string) {
  const prompt = buildVideoPrompt(analysis, handle);

  const result = await client.v1.textToVideo.generate({
    name: `X Wrapped - @${handle}`,
    style: {
      prompt,
    },
    end_seconds: 20,  // ~20 second video
  });

  return result; // { id, status, ... }
}
```

### 3.2 Video Prompt Construction

Map the analysis fields into a rich, visual prompt:

```typescript
function buildVideoPrompt(a: PersonalityAnalysis, handle: string): string {
  return `Cinematic social media personality reveal video. ${a.colour_mood} visual aesthetic.

Opening: A glowing screen showing "@${handle}" with the title "X WRAPPED" in bold typography.

Scene 1: Visual representation of "${a.top_topics.join(', ')}" — the topics that define this person's online presence. ${a.tone} energy.

Scene 2: The archetype reveal — "${a.archetype}" appears in large cinematic text. ${a.archetype_description}.

Scene 3: ${a.vibe_summary}

Closing: Stats overlay — the text "Their archetype: ${a.archetype}" fades in with dramatic lighting.

Style: Modern, high-energy social media aesthetic. Dark background with vibrant accent colours. Motion graphics feel. Clean typography overlays. 20 seconds.`;
}
```

### 3.3 Polling for Completion (`src/routes/api/status/[uuid]/+server.ts`)

Two-level polling:
1. **Client → our server** (`GET /api/status/[uuid]`) — returns current `WrappedResult.status`.
2. **Our server → MagicHour** — when status is `generating`, poll MagicHour's `GET /v1/video-projects/{id}`.

```typescript
// In the processHandle pipeline:
async function waitForVideo(projectId: string): Promise<string> {
  while (true) {
    const res = await client.v1.videoProjects.get({ id: projectId });

    if (res.status === 'complete') {
      return res.downloads[0].url; // video URL
    }
    if (res.status === 'error') {
      throw new Error('Video generation failed');
    }

    await new Promise(r => setTimeout(r, 3000)); // poll every 3s
  }
}
```

### 3.4 Status Endpoint

```typescript
// src/routes/api/status/[uuid]/+server.ts
export async function GET({ params }) {
  const result = store.get(params.uuid);
  if (!result) return json({ error: 'Not found' }, { status: 404 });

  return json({
    status: result.status,
    analysis: result.analysis,  // sent early so loading page can show it
    videoUrl: result.videoUrl,
    handle: result.handle,
    profile: result.profile,
  });
}
```

### Phase 3 Milestone

✅ Full pipeline: handle → scrape → analyse → MagicHour video → video URL stored.
✅ `GET /api/status/[uuid]` eventually returns `status: "complete"` with `videoUrl`.

---

## Phase 4 — Shareability (Loading UI + Results Page + Share CTA)

**Goal:** Polished user-facing pages that look great and share well.

### 4.1 Loading Page (`/loading/[uuid]`)

**This is a first-class experience, not a spinner.**

```svelte
<!-- src/routes/loading/[uuid]/+page.svelte -->
<script>
  let { data } = $props();
  let status = $state('scraping');
  let analysis = $state(null);

  // Poll /api/status/[uuid] every 2 seconds
  $effect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/status/${data.uuid}`);
      const json = await res.json();
      status = json.status;
      if (json.analysis) analysis = json.analysis;
      if (json.status === 'complete') {
        clearInterval(interval);
        goto(`/wrapped/${data.uuid}`);
      }
    }, 2000);
    return () => clearInterval(interval);
  });
</script>
```

**Progressive reveal sequence:**
1. `scraping` → "Finding @handle on X..." with animated X logo.
2. `analysing` → "Reading their tweets..." with scrolling tweet snippets.
3. `generating` (analysis available) → Reveal stats one by one with staggered animations:
   - Archetype label (big, centered, dramatic reveal)
   - Top topics (slide in as tags)
   - Tone badge
   - Peak posting time
   - Best tweet (styled as a tweet card)
4. `generating` (still waiting for video) → "Creating your cinematic moment..." with progress bar.
5. `complete` → Auto-redirect to `/wrapped/[uuid]`.

### 4.2 Results Page (`/wrapped/[uuid]`)

```
┌─────────────────────────────────┐
│     @handle's X Wrapped         │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    🎬 Video Player        │  │
│  │    (hero, full-width)     │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Arche-│ │ Top  │ │ Peak │   │
│  │type  │ │Topics│ │ Hour │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 💬 Best Tweet Card       │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────┐ ┌──────┐             │
│  │ Tone │ │Tweets│             │
│  │      │ │Analysed│           │
│  └──────┘ └──────┘             │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🔗 Share on X    ⬇ Download│ │ ← sticky bottom
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Server load function:**
```typescript
// src/routes/wrapped/[uuid]/+page.server.ts
export async function load({ params }) {
  const result = store.get(params.uuid);
  if (!result || result.status !== 'complete') {
    redirect(307, `/loading/${params.uuid}`);
  }
  return { result };
}
```

### 4.3 Share Button

```typescript
const shareText = `just got my X Wrapped 🎁 ${url} — what's your archetype?`;

function shareOnX() {
  window.open(
    `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    '_blank'
  );
}
```

### 4.4 Download Button

```typescript
async function downloadVideo() {
  const res = await fetch(videoUrl);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `xwrapped-${handle}.mp4`;
  a.click();
}
```

### 4.5 Open Graph Meta Tags (for link previews)

```svelte
<!-- In /wrapped/[uuid]/+page.svelte -->
<svelte:head>
  <title>@{result.handle}'s X Wrapped</title>
  <meta property="og:title" content="@{result.handle}'s X Wrapped" />
  <meta property="og:description" content="Archetype: {result.analysis.archetype} — {result.analysis.archetype_description}" />
  <meta property="og:type" content="video.other" />
  <meta property="og:video" content="{result.videoUrl}" />
  <meta name="twitter:card" content="player" />
</svelte:head>
```

### Phase 4 Milestone

✅ Full user journey: landing → loading (progressive reveal) → results page with video.
✅ Share button posts to X with pre-filled text + URL.
✅ Mobile-responsive, dark theme, looks polished.

---

## Phase 5 — Demo Prep (Pre-cache + Hardening)

**Goal:** Bulletproof demo with fallbacks.

### 5.1 Pre-cache Demo Handles

Create a script `scripts/precache.ts` that runs the full pipeline for 5–10 handles and saves results to disk:

```typescript
const DEMO_HANDLES = [
  'elonmusk', 'sama', 'kaborerichard', 'levelsio',
  'naval', 'pmarca', 'garaborerichard', 'id_aa_carmack'
];

for (const handle of DEMO_HANDLES) {
  console.log(`Pre-caching @${handle}...`);
  await processHandle(crypto.randomUUID(), handle);
}
```

### 5.2 Fallback Video Strategy

- If MagicHour is down or slow during live demo, serve pre-cached video.
- Add a `DEMO_MODE` env flag that skips live scraping/generation and loads from `data/`.

### 5.3 Error Handling

| Error | User Sees |
|-------|-----------|
| Apify scrape fails | "Couldn't find @handle. Check the username and try again." |
| Profile has <5 tweets | "Not enough tweets to analyse — but here's what we found." (Still generate video from bio) |
| Claude API error | "Analysis temporarily unavailable. Try again in a moment." |
| MagicHour timeout (>120s) | "Video is taking longer than expected..." (keep polling, show analysis results) |
| MagicHour error | "Video generation failed. Your stats are still available below." (Show stats without video) |

### 5.4 Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Scrape time | ~10-15s | Apify profile + tweets in parallel |
| Analysis time | ~3-5s | Single Claude API call |
| Video generation | ~30-60s | MagicHour text-to-video |
| **Total** | **~45-80s** | **Under 90s target** ✅ |

### Phase 5 Milestone

✅ 10+ handles pre-cached with working videos.
✅ Live demo can fall back to cached data seamlessly.
✅ Error states are graceful, not broken pages.

---

## File Structure (Final)

```
xwrapped/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── scraper.ts        # Apify X scraping
│   │   │   ├── analyser.ts       # Claude personality analysis
│   │   │   ├── magichour.ts      # MagicHour video generation
│   │   │   ├── store.ts          # In-memory + JSON store
│   │   │   ├── pipeline.ts       # Orchestrates scrape→analyse→generate
│   │   │   └── types.ts          # Shared TypeScript types
│   │   └── components/
│   │       ├── HandleInput.svelte
│   │       ├── LoadingReveal.svelte
│   │       ├── StatCard.svelte
│   │       ├── TweetCard.svelte
│   │       ├── VideoPlayer.svelte
│   │       └── ShareButton.svelte
│   ├── routes/
│   │   ├── +page.svelte              # Landing page
│   │   ├── +layout.svelte            # Dark theme shell
│   │   ├── api/
│   │   │   ├── generate/+server.ts   # POST: start pipeline
│   │   │   └── status/[uuid]/+server.ts  # GET: poll status
│   │   ├── loading/[uuid]/
│   │   │   └── +page.svelte          # Progressive loading UI
│   │   └── wrapped/[uuid]/
│   │       ├── +page.server.ts       # Load result data
│   │       └── +page.svelte          # Results + video + share
│   └── app.css                       # Tailwind + X dark theme
├── scripts/
│   └── precache.ts                   # Pre-cache demo handles
├── data/                             # JSON result storage
├── .env.example
├── package.json
└── svelte.config.js
```

---

## Dependencies

```json
{
  "dependencies": {
    "apify-client": "^2.x",
    "@anthropic-ai/sdk": "^0.x",
    "magic-hour": "^0.x"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.x",
    "svelte": "^5.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x",
    "typescript": "^5.x"
  }
}
```

---

## Environment Variables

| Variable | Source | Required |
|----------|--------|----------|
| `APIFY_API_TOKEN` | [Apify Console](https://console.apify.com/settings/integrations) | Yes |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) | Yes |
| `MAGIC_HOUR_API_KEY` | [MagicHour Developer Hub](https://magichour.ai/developer?tab=api-keys) | Yes |
| `DEMO_MODE` | Set to `true` to use pre-cached data | No |
| `PUBLIC_BASE_URL` | Deployed URL for share links | Yes (prod) |

---

## Execution Order

| Order | Task | Est. Time |
|-------|------|-----------|
| 1 | SvelteKit scaffold + Tailwind + dark theme + landing page | 1-2 hrs |
| 2 | Apify scraper integration + types | 1-2 hrs |
| 3 | In-memory store + generate/status endpoints | 1 hr |
| 4 | Claude analysis prompt + analyser service | 1-2 hrs |
| 5 | MagicHour integration + video prompt | 1-2 hrs |
| 6 | Pipeline orchestration (scrape→analyse→generate) | 1 hr |
| 7 | Loading page with progressive reveal | 2-3 hrs |
| 8 | Results page with video + stats cards | 2-3 hrs |
| 9 | Share/download buttons + OG meta tags | 1 hr |
| 10 | Pre-cache script + fallback mode | 1-2 hrs |
| 11 | Mobile polish + testing | 1-2 hrs |
| **Total** | | **~13-20 hrs** |
