export type InstagramProfileStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export interface InstagramProfile {
    id: string;
    profileId: string;
    username: string;
    status: InstagramProfileStatus;
    apiError: boolean;
    addedAt: string;
}

export interface InstagramPost {
    id: string;
    postPk: string;
    postCode: string;
    likeCount: number;
    commentCount: number;
    viewCount: number | null;
    caption: string | null;
    takenAt: string;
    scrapedAt: string;
}

export interface WeeklyStat {
    weekStart: string;   // "YYYY-MM-DD" — Monday of that week
    postCount: number;
    storyCount: number;
    totalLikes: number;
    totalComments: number;
    avgLikes: number;
    avgComments: number;
}

export interface FollowerHistoryEntry {
    date: string;          // "YYYY-MM-DD"
    followerCount: number;
}

export interface DailyStoryStat {
    date: string;          // "YYYY-MM-DD"
    storyCount: number;
}

export interface ProfileSummary {
    // Identification
    id: string;
    profileId: string;
    username: string;
    status: InstagramProfileStatus;
    apiError: boolean;
    addedAt: string;

    // Post metrics (within the requested `weeks` window)
    postCount: number;
    avgLikes: number;
    avgComments: number;
    avgViews: number | null;
    postsPerWeek: number;
    lastPostAt: string | null;
    avgEngagement: number;

    // Stories
    storiesPerWeek: number;

    // Profile details (from /user/details sync, may be null before first sync)
    followerCount: number | null;
    followingCount: number | null;
    mediaCount: number | null;
    hasContactData: boolean | null;
    isVerified: boolean | null;
    isBusiness: boolean | null;
    accountType: number | null;          // 1=personal 2=creator 3=professional
    category: string | null;
    externalUrl: string | null;
    biography: string | null;
    hasHighlightReels: boolean | null;
    totalClipsCount: number | null;
    isPrivate: boolean | null;
    detailsLastSyncedAt: string | null;

    // Time-series data
    weeklyStats: WeeklyStat[];
    followerHistory: FollowerHistoryEntry[];
    dailyStoryStats: DailyStoryStat[];
}

export interface GenerateInstagramPostRequest {
    topic: string;
    context?: string;
    postTone?: 'premium' | 'technical' | 'emotional' | 'casual';
    postLength?: 'short' | 'full';
    styleNotes?: string[];
}

export interface InstagramPostResult {
    content: string;
}

export interface InstagramStory {
    storyId: string;
    imageUrl: string | null;
    videoUrl: string | null;
    takenAt: string;
    profileId: string;
    username: string;
}

export interface StoryGroup {
    profileId: string;
    username: string;
    stories: InstagramStory[];
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

export const PROFILE_COLORS = [
    '#0ea5e9',  // sky
    '#8b5cf6',  // violet
    '#f59e0b',  // amber
    '#10b981',  // emerald
    '#ef4444',  // red
    '#06b6d4',  // cyan
    '#f97316',  // orange
    '#64748b',  // slate
] as const;

export type WeeksOption = 4 | 13 | 26 | 52;
