import 'dotenv/config';
import { getDb, closeMongo } from '../src/lib/server/mongo-connection';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface Tweet {
  date: string;
  content: string;
  engagement: {
    reposts?: number;
    likes?: number;
    views?: number;
  };
  hasMedia: boolean;
}

interface TwitterUser {
  handle: string;
  displayName: string;
  profileImage: string;
  followerCount: number;
  tweetCount: number;
}

async function importData() {
  const db = await getDb();
  const imagesDir = join(process.cwd(), 'images');

  const users: TwitterUser[] = [
    {
      handle: 'steipete',
      displayName: 'Peter Steinberger',
      profileImage: 'images/steipete_pfp.png',
      followerCount: 136800,
      tweetCount: 136800
    },
    {
      handle: 'BillGates',
      displayName: 'Bill Gates',
      profileImage: 'images/billgates_pfp.jpg',
      followerCount: 62700000,
      tweetCount: 4517
    }
  ];

  for (const user of users) {
    console.log(`Importing ${user.handle}...`);

    await db.collection('twitter_users').updateOne(
      { handle: user.handle },
      { $set: { ...user, importedAt: new Date() } },
      { upsert: true }
    );
  }

  const tweetsFile = readFileSync(join(process.cwd(), 'steipete_tweets_2025.txt'), 'utf-8');
  const billGatesTweetsFile = readFileSync(join(process.cwd(), 'billgates_tweets_2025.txt'), 'utf-8');

  const steipeteTweets = parseTweets(tweetsFile, 'steipete');
  const billGatesTweets = parseTweets(billGatesTweetsFile, 'BillGates');

  console.log(`Parsed ${steipeteTweets.length} steipete tweets`);
  console.log(`Parsed ${billGatesTweets.length} BillGates tweets`);

  if (steipeteTweets.length > 0) {
    await db.collection('tweet_archives').deleteMany({ handle: 'steipete' });
    await db.collection('tweet_archives').insertMany(steipeteTweets);
  }

  if (billGatesTweets.length > 0) {
    await db.collection('tweet_archives').deleteMany({ handle: 'BillGates' });
    await db.collection('tweet_archives').insertMany(billGatesTweets);
  }

  const mediaFiles = readdirSync(imagesDir).filter(f => f.startsWith('steipete_') || f.startsWith('billgates_'));
  
  for (const file of mediaFiles) {
    const handle = file.startsWith('steipete_') ? 'steipete' : 'BillGates';
    const mediaType = file.includes('pfp') ? 'profile_image' : 'tweet_image';
    
    await db.collection('archive_media').updateOne(
      { handle, filename: file },
      { 
        $set: { 
          handle, 
          filename: file, 
          path: `images/${file}`,
          mediaType,
          importedAt: new Date() 
        } 
      },
      { upsert: true }
    );
  }

  console.log(`Imported ${mediaFiles.length} media files`);
  console.log('Import complete!');

  await closeMongo();
}

function parseTweets(content: string, handle: string): any[] {
  const tweets: any[] = [];
  const lines = content.split('\n');
  
  let currentTweet: any = null;
  let contentLines: string[] = [];
  
  for (const line of lines) {
    const tweetNumMatch = line.match(/TWEET #?(\d+)/);
    if (tweetNumMatch) {
      if (currentTweet && contentLines.length > 0) {
        currentTweet.content = contentLines.join(' ').trim();
        tweets.push(currentTweet);
      }
      currentTweet = { handle, importedAt: new Date() };
      contentLines = [];
      continue;
    }
    
    const dateMatch = line.match(/^Date: (.+)/);
    if (dateMatch && currentTweet) {
      currentTweet.date = dateMatch[1].trim();
      continue;
    }
    
    const statsMatch = line.match(/Stats: (.+)/);
    if (statsMatch && currentTweet) {
      const parts = statsMatch[1].split(',').map(s => s.trim());
      currentTweet.engagement = {};
      parts.forEach(p => {
        const numMatch = p.match(/([\d,]+)/);
        if (p.includes('reply') && numMatch) currentTweet.engagement.replies = parseInt(numMatch[1].replace(/,/g, ''));
        if (p.includes('repost') && numMatch) currentTweet.engagement.reposts = parseInt(numMatch[1].replace(/,/g, ''));
        if (p.includes('like') && numMatch) currentTweet.engagement.likes = parseInt(numMatch[1].replace(/,/g, ''));
        if (p.includes('bookmark') && numMatch) currentTweet.engagement.bookmarks = parseInt(numMatch[1].replace(/,/g, ''));
        if (p.includes('view') && numMatch) currentTweet.engagement.views = parseInt(numMatch[1].replace(/,/g, ''));
      });
      currentTweet.hasMedia = contentLines.join(' ').includes('Image') || contentLines.join(' ').includes('Photo');
      continue;
    }
    
    if (currentTweet && line.startsWith('@')) {
      contentLines.push(line.replace(/^@[^:]+: /, ''));
    } else if (currentTweet && line.startsWith('Content:')) {
      contentLines.push(line.replace('Content: ', ''));
    } else if (currentTweet && contentLines.length > 0 && !line.startsWith('=') && line.trim()) {
      contentLines.push(line);
    }
  }
  
  if (currentTweet && contentLines.length > 0) {
    currentTweet.content = contentLines.join(' ').trim();
    tweets.push(currentTweet);
  }
  
  return tweets;
}

importData().catch(console.error);
