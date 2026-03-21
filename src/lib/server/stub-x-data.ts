import type { ProfileData, TweetData } from './types';

const STUB_PFP: Record<string, string> = {
  steipete: '/images/steipete_pfp.png',
  billgates: '/images/billgates_pfp.jpg'
};

/** Placeholder profile + tweets used when `TWITTERAPI_IO_KEY` is not configured and no repo export exists. */
export function stubProfile(handle: string): ProfileData {
  const h = handle.toLowerCase();
  const displayName =
    h.length > 0 ? handle.charAt(0).toUpperCase() + handle.slice(1) : handle;
  return {
    username: handle,
    name: displayName,
    bio: 'Stub profile — set TWITTERAPI_IO_KEY in .env to scrape live data from X.',
    followers: 12_400,
    following: 890,
    tweetsCount: 3200,
    profilePicture: STUB_PFP[h] ?? '',
    isBlueVerified: false,
    joinedAt: '2019-03-15T12:00:00.000Z'
  };
}

export function stubTweets(handle: string): TweetData[] {
  const base = new Date();
  const iso = (daysAgo: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };
  return [
    {
      text: `Shipping small things every day. @${handle} energy is momentum, not motivation.`,
      createdAt: iso(0),
      likeCount: 420,
      retweetCount: 45,
      replyCount: 28,
      viewCount: 12_000,
      hashtags: ['buildinpublic'],
      mentions: []
    },
    {
      text: 'Hot take: the best API is the one you never have to think about. Good defaults beat infinite options.',
      createdAt: iso(2),
      likeCount: 210,
      retweetCount: 12,
      replyCount: 40,
      viewCount: 8_100,
      hashtags: [],
      mentions: []
    },
    {
      text: 'Reminder: touch grass, then touch your keyboard again. Balance is a feature.',
      createdAt: iso(5),
      likeCount: 1800,
      retweetCount: 200,
      replyCount: 90,
      viewCount: 45_000,
      hashtags: [],
      mentions: []
    },
    {
      text: `Debugging prod at 2am. If you're awake reading this @${handle} — we're the same person.`,
      createdAt: iso(9),
      likeCount: 92,
      retweetCount: 3,
      replyCount: 15,
      viewCount: 2100,
      hashtags: [],
      mentions: []
    },
    {
      text: 'Docs are marketing for developers. Write them like you mean it.',
      createdAt: iso(14),
      likeCount: 560,
      retweetCount: 88,
      replyCount: 22,
      viewCount: 15_000,
      hashtags: ['devrel'],
      mentions: []
    }
  ];
}