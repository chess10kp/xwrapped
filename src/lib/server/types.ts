export interface ProfileData {
  username: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  tweetsCount: number;
  profilePicture: string;
  isBlueVerified: boolean;
  joinedAt: string;
}

export interface TweetData {
  text: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  hashtags: string[];
  mentions: string[];
}

export interface PersonalityAnalysis {
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

export type WrappedStatus = 'scraping' | 'analysing' | 'generating' | 'complete' | 'error';

export interface WrappedResult {
  id: string;
  handle: string;
  status: WrappedStatus;
  profile?: ProfileData;
  tweets?: TweetData[];
  analysis?: PersonalityAnalysis;
  videoUrl?: string;
  error?: string;
  createdAt: Date;
}
