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
