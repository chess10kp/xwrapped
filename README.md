# X Wrapped 🎁

Generate personalized X (Twitter) personality wrapped experiences with AI-powered analysis and cinematic video generation.

## Tech Stack

- **SvelteKit** - Web framework
- **Svelte 5** - UI framework with runes
- **TypeScript** - Type safety
- **TailwindCSS v4** - Styling
- **Apify** - Twitter scraping
- **Anthropic Claude** - AI personality analysis
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
APIFY_API_TOKEN=your_apify_token
ANTHROPIC_API_KEY=your_anthropic_key
MAGIC_HOUR_API_KEY=your_magichour_key
MONGODB_URI=your_mongodb_connection_string
DEMO_MODE=
PUBLIC_BASE_URL=http://localhost:5173
```

### Getting API Keys

- **Apify**: [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations)
- **Anthropic**: [console.anthropic.com/](https://console.anthropic.com/)
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

This will generate wrapped profiles for `elonmusk`, `sama`, `naval`, and others, storing results in MongoDB (`MONGODB_URI` must be set).

## Project Structure

```
xwrapped/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── scraper.ts       # Apify Twitter scraping
│   │   │   ├── analyser.ts      # Claude personality analysis
│   │   │   ├── magichour.ts     # MagicHour video generation
│   │   │   ├── db.ts            # MongoDB-backed store
│   │   │   ├── mongo-connection.ts  # MongoDB client
│   │   │   ├── pipeline.ts      # Orchestrates full pipeline
│   │   │   └── types.ts         # TypeScript types
│   │   └── components/          # UI components
│   ├── routes/
│   │   ├── +page.svelte         # Landing page
│   │   ├── +layout.svelte       # App layout
│   │   ├── api/
│   │   │   ├── generate/+server.ts   # Start pipeline
│   │   │   └── status/[uuid]/+server.ts  # Poll status
│   │   ├── loading/[uuid]/+page.svelte  # Loading UI
│   │   └── wrapped/[uuid]/              # Results page
│   └── app.css                   # Tailwind + X dark theme
├── scripts/
│   └── precache.ts               # Pre-cache demo handles (requires MongoDB)
└── .env.example                  # Environment variables template
```

## How It Works

1. **User enters handle** → Client validates and POSTs to `/api/generate`
2. **Scraping phase** → Apify fetches profile + 50 recent tweets
3. **Analysis phase** → Claude analyzes personality and generates archetype
4. **Video generation** → MagicHour creates cinematic video from analysis
5. **Results** → User sees video, stats, and can share/download

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
  "id": "uuid"
}
```

### GET /api/status/[uuid]

Polls the status of a wrapped generation.

**Response:**
```json
{
  "status": "complete",
  "analysis": { ... },
  "videoUrl": "https://...",
  "handle": "elonmusk",
  "profile": { ... }
}
```

## Error Handling

The app gracefully handles:
- Invalid Twitter handles
- Private or deleted accounts
- Insufficient tweet data (< 5 tweets)
- API timeouts and failures
- Video generation errors

## License

MIT
