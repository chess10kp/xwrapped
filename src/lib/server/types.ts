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

export interface MetricComparisons {
  followers?: string;
  following?: string;
  lifetime_posts?: string;
  posts_analysed?: string;
  peak_hour?: string;
  total_likes?: string;
  avg_views?: string;
}

export interface PersonalityAnalysis {
  archetype: string;
  archetype_description?: string;
  metric_comparisons?: MetricComparisons;
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
  /** Set when Magic Hour failed so we do not retry on every page load */
  videoError?: string;
  audioUrl?: string;
  /** Voice chosen for the generated summary narration. */
  voiceoverVoice?: string;
  /** Set when Magic Hour audio failed so we do not retry on every page load. */
  audioError?: string;
  error?: string;
  /** Exa neural search highlights for public-web grounding (LLM + video prompts). */
  webSearchContext?: string;
  createdAt: Date;
}
