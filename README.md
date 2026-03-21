# X Wrapped 🎁

Generate personalized X (Twitter) personality wrapped experiences with AI-powered analysis and cinematic video generation.

## Tech Stack

- **SvelteKit** - Web framework
- **Svelte 5** - UI framework with runes
- **TypeScript** - Type safety
- **TailwindCSS v4** - Styling
- **Exa** - Neural web search for public context alongside tweets (optional)
- **OpenRouter** - AI personality analysis (`openrouter/free` model)
- **MagicHour** - Video generation
- **MongoDB** - Persistent storage for wrapped jobs

## Features

- 📊 Twitter profile and tweet scraping
- 🧠 AI-powered personality archetype analysis
- 🎬 Cinematic video generation
- 📱 Responsive, mobile-first design
- 🔗 Social sharing integration
- ⬇️ Video download capability

## Setup

1. **Clone and install dependencies**

```bash
cd xwrapped
npm install
```

2. **Configure environment variables**

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
OPENROUTER_API_KEY=
EXA_API_KEY=
MAGIC_HOUR_API_KEY=
MONGODB_URI=
DEMO_MODE=
PUBLIC_BASE_URL=http://localhost:5173
```

- **`OPENROUTER_API_KEY`** — Required for personality analysis. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).
- **`MONGODB_URI`** — Required for storing jobs and results. Test with `npm run verify:mongo`.
- **`EXA_API_KEY`** — Optional. When set, the pipeline runs Exa web search to enrich analysis with public web context. If missing, generation still runs without that step.

### Getting API Keys

- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys)
- **Exa**: [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys)
- **MagicHour**: [magichour.ai/developer?tab=api-keys](https://magichour.ai/developer?tab=api-keys)
- **MongoDB**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (create a cluster, Database Access user, Network Access allow your IP, then copy the connection string and set the database name to `xwrapped` in the URI path if needed)

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Building

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Pre-cache Demo Data

For demos or testing, pre-generate wrapped profiles for popular accounts:

```bash
npm run precache
```

This runs the full pipeline for `elonmusk`, `sama`, `naval`, and others, storing results in MongoDB (`MONGODB_URI` must be set). Completed profiles are available at `/profile/<handle>`.

## Project Structure

```
xwrapped/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── analyser.ts      # OpenRouter personality analysis
│   │   │   ├── exa.ts           # Optional Exa web search
│   │   │   ├── magichour.ts     # MagicHour video generation
│   │   │   ├── db.ts            # MongoDB-backed store
│   │   │   ├── mongo-connection.ts  # MongoDB client
│   │   │   ├── pipeline.ts      # Orchestrates full pipeline
│   │   │   └── types.ts         # TypeScript types
│   │   └── components/          # UI components
│   ├── routes/
│   │   ├── +page.svelte         # Landing page
│   │   ├── +layout.svelte       # App layout
│   │   ├── layout.css           # Tailwind + X dark theme
│   │   ├── api/
│   │   │   ├── generate/+server.ts       # Start pipeline
│   │   │   └── status/[handle]/+server.ts  # Poll status
│   │   ├── loading/[handle]/+page.svelte  # Loading UI
│   │   └── profile/[handle]/              # Results page
├── scripts/
│   └── precache.ts               # Pre-cache demo handles (requires MongoDB)
└── .env.example                  # Environment variables template
```

## How It Works

1. **User enters handle** → Client validates and POSTs to `/api/generate`
2. **Data phase** → Loads `{handle}_tweets_*.txt` from the project root when present; otherwise stub profile + tweets (or import into MongoDB via `npm run import-tweets`)
3. **Analysis phase** → OpenRouter analyzes personality and generates an archetype (optionally grounded with Exa when `EXA_API_KEY` is set)
4. **Video generation** → MagicHour creates a cinematic video from the analysis
5. **Results** → User is redirected to `/profile/<handle>` for video, stats, share, and download

Jobs are keyed by **normalized handle** (lowercase, no `@`). The generate response `id` is that same handle string.

## API Endpoints

### POST /api/generate

Starts the wrapped generation pipeline.

**Request:**

```json
{
  "handle": "elonmusk"
}
```

**Response:**

```json
{
  "id": "elonmusk"
}
```

The `id` matches the stored job key and URL segment (normalized handle).

### GET /api/status/[handle]

Polls the status of a wrapped generation. Use the same handle as in the generate request (normalized).

**Response:**

```json
{
  "status": "complete",
  "analysis": { },
  "videoUrl": "https://...",
  "handle": "elonmusk",
  "profile": { },
  "error": null
}
```

When `status` is `error`, `error` contains a message string.

## Error Handling

The app gracefully handles:

- Invalid Twitter handles
- Private or deleted accounts (when using live scraping)
- Insufficient tweet data
- API timeouts and failures
- Video generation errors

## License

MIT
