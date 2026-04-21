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

/**
 * Aggregated weekly stats for a single profile.
 * Computed server-side from scraped posts.
 *
 * Backend: weekStart is the ISO date of that Monday (e.g. "2025-01-06").
 */
export interface WeeklyStat {
    weekStart: string;
    avgLikes: number;
    avgComments: number;
    postCount: number;
}

/**
 * Summary stats for a single tracked profile.
 *
 * Backend endpoint: GET /api/v1/instagram/profiles/summary
 *
 * Response DTO (Kotlin):
 * data class InstagramProfileSummaryResponse(
 *   val id: String,                      // studioProfileId
 *   val profileId: String,
 *   val username: String,
 *   val status: String,
 *   val apiError: Boolean,
 *   val addedAt: Instant,
 *   val postCount: Int,
 *   val avgLikes: Double,
 *   val avgComments: Double,
 *   val avgViews: Double?,
 *   val avgEngagement: Double,           // avgLikes + avgComments per post (historical avg)
 *   val postsPerWeek: Double,
 *   val lastPostAt: Instant?,
 *   val weeklyStats: List<WeeklyStatDto>
 * )
 *
 * data class WeeklyStatDto(
 *   val weekStart: String,   // "YYYY-MM-DD" — Monday of that week
 *   val avgLikes: Double,
 *   val avgComments: Double,
 *   val postCount: Int
 * )
 */
export interface ProfileSummary {
    id: string;
    profileId: string;
    username: string;
    status: InstagramProfileStatus;
    apiError: boolean;
    addedAt: string;
    postCount: number;
    avgLikes: number;
    avgComments: number;
    avgViews: number | null;
    avgEngagement: number;
    postsPerWeek: number;
    lastPostAt: string | null;
    weeklyStats: WeeklyStat[];
}

export interface GenerateInstagramPostRequest {
    topic: string;
    context?: string;
    postTone?: 'premium' | 'technical' | 'emotional' | 'casual';
    postLength?: 'short' | 'full';
    serviceType?: 'ppf' | 'ceramic' | 'detailing' | 'interior' | 'wrap' | 'polish' | 'other';
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
