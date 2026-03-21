# MongoDB Setup Plan for X Wrapped

## Overview
Replace the current in-memory + disk file storage with MongoDB Atlas (cloud) as the sole storage solution for X Wrapped.

## Requirements
- **MongoDB Environment**: MongoDB Atlas (cloud)
- **Storage Strategy**: MongoDB only (replace in-memory + disk backup)
- **Deployment Target**: Local development for now

## Implementation Plan

### 1. Install Dependencies
```bash
npm install mongodb dotenv
```

### 2. Environment Configuration
**Add to `.env.example`:**
```
MONGODB_URI=
```

**Add to `.env`:**
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/xwrapped?retryWrites=true&w=majority
```

### 3. Create MongoDB Client Connection
**File:** `xwrapped/src/lib/server/mongodb.ts`

- Create singleton MongoDB client instance
- Implement connection pooling and reuse
- Handle connection errors and retry logic
- Export client and database/collection references
- Database name: `xwrapped`
- Collection name: `wrapped`

**Key Features:**
- Lazy connection initialization
- Connection health check
- Proper cleanup on server shutdown

### 4. Create MongoDB Storage Layer
**File:** `xwrapped/src/lib/server/db.ts`

Replace `Store` class with MongoDB-based operations:

**Methods to implement:**
- `set(id, result)` → `insertOne()` or `updateOne()` with upsert
- `get(id)` → `findOne()` by `_id`
- `update(id, updates)` → `updateOne()` by `_id`

**Important considerations:**
- Keep using UUID strings as `_id` (not ObjectId)
- Maintain same interface as current Store class
- Proper error handling and logging

**Indexes to create:**
- Index on `handle` for potential lookup by handle
- Index on `createdAt` for cleanup/expiration queries
- Index on `status` for filtering operations

### 5. Create SvelteKit Hooks
**File:** `xwrapped/src/hooks.server.ts`

Initialize MongoDB connection on server startup:
- Connect to MongoDB in the `handle` hook or `init` function
- Handle connection errors gracefully
- Implement graceful shutdown on process termination
- Store client reference globally for reuse

### 6. Update Store References
Replace imports in the following files:

1. **`xwrapped/src/lib/server/pipeline.ts`**
   - Change: `import { store } from './store'`
   - To: `import { store } from './db'`

2. **`xwrapped/src/routes/api/generate/+server.ts`**
   - Change: `import { store } from '$lib/server/store'`
   - To: `import { store } from '$lib/server/db'`

3. **`xwrapped/src/routes/api/status/[uuid]/+server.ts`**
   - Change: `import { store } from '$lib/server/store'`
   - To: `import { store } from '$lib/server/db'`

4. **`xwrapped/src/routes/wrapped/[uuid]/+page.server.ts`**
   - Change: `import { store } from '$lib/server/store'`
   - To: `import { store } from '$lib/server/db'`

### 7. Remove Old Implementation
**Delete files:**
- `xwrapped/src/lib/server/store.ts`

**Remove directories:**
- `xwrapped/data/` (if exists from disk backups)

**Remove dependencies (if any):**
- Check if `fs/promises` and `path` imports are still needed elsewhere

## Data Model

### MongoDB Document Structure
```typescript
{
  _id: string,                    // UUID (primary key)
  handle: string,                 // Twitter/X handle (e.g., "elonmusk")
  status: 'scraping' |            // Current processing status
         'analysing' |
         'generating' |
         'complete' |
         'error',
  profile?: ProfileData,          // User profile information
  tweets?: TweetData[],           // Array of tweet data
  analysis?: PersonalityAnalysis,  // AI analysis results
  videoUrl?: string,              // Generated video URL
  error?: string,                 // Error message if status is 'error'
  createdAt: Date,                 // ISO timestamp
}
```

### Types
All types remain unchanged from `src/lib/server/types.ts`

## Implementation Details

### Connection Management
```typescript
// Singleton pattern for MongoDB client
let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
  }
  return client;
}
```

### Database Operations
```typescript
export class Store {
  async set(id: string, result: WrappedResult): Promise<void> {
    const db = await getDb();
    await db.collection('wrapped').updateOne(
      { _id: id },
      { $set: { ...result, _id: id } },
      { upsert: true }
    );
  }

  async get(id: string): Promise<WrappedResult | undefined> {
    const db = await getDb();
    const doc = await db.collection('wrapped').findOne({ _id: id });
    return doc as WrappedResult | undefined;
  }

  async update(id: string, updates: Partial<WrappedResult>): Promise<void> {
    const db = await getDb();
    await db.collection('wrapped').updateOne(
      { _id: id },
      { $set: updates }
    );
  }
}
```

### Index Creation
```typescript
// Create indexes on startup
await db.collection('wrapped').createIndex({ handle: 1 });
await db.collection('wrapped').createIndex({ createdAt: -1 });
await db.collection('wrapped').createIndex({ status: 1 });
```

### Error Handling
- Log MongoDB connection errors
- Handle network timeouts gracefully
- Return appropriate error messages to API clients
- Implement retry logic for transient failures

### Lifecycle Management
```typescript
// hooks.server.ts
import { getMongoClient } from '$lib/server/mongodb';

let client: MongoClient;

export async function handle({ event, resolve }) {
  if (!client) {
    client = await getMongoClient();
  }
  return resolve(event);
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  if (client) await client.close();
});
```

## Benefits of MongoDB

1. **Persistence**: Data survives server restarts
2. **Scalability**: Easy to scale horizontally in production
3. **Querying**: Rich query capabilities for future features
4. **Reliability**: Built-in replication and failover
5. **Development**: Local development with MongoDB Atlas or local MongoDB
6. **Monitoring**: Built-in monitoring and logging with Atlas

## Testing Plan

### Manual Testing Steps
1. Set up MongoDB Atlas cluster and get connection string
2. Add `MONGODB_URI` to `.env`
3. Run `npm run dev`
4. Test generate flow: enter handle → generate → load results
5. Verify data persists in MongoDB via Atlas UI
6. Restart dev server, verify data still accessible
7. Test error handling with invalid handle

### Verification Checklist
- [ ] MongoDB connection established on startup
- [ ] Generate endpoint creates document in MongoDB
- [ ] Status endpoint retrieves from MongoDB
- [ ] Wrapped page endpoint retrieves from MongoDB
- [ ] Data persists across server restarts
- [ ] UUIDs work as MongoDB _id fields
- [ ] No console errors from MongoDB operations
- [ ] Old disk backup code removed
- [ ] All imports updated to new MongoDB store

## Rollback Plan
If issues arise, rollback steps:
1. Git revert to previous commit
2. Restore `src/lib/server/store.ts`
3. Remove MongoDB dependencies: `npm uninstall mongodb dotenv`
4. Remove MongoDB environment variable

## Next Steps
1. ✅ Confirm MongoDB Atlas cluster is ready
2. ✅ Get connection string
3. ⏳ Implement the changes above
4. ⏳ Test thoroughly
5. ⏳ Deploy and verify

## Notes
- Keep UUIDs as strings for compatibility with existing URL structure
- MongoDB Atlas free tier provides 512MB storage (sufficient for MVP)
- Consider adding TTL index for automatic cleanup of old results in future
- Monitor connection pool usage in production
