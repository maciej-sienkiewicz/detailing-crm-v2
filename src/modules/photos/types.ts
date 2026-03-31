// src/modules/photos/types.ts

export interface PhotoTagsResponse {
    tags: string[];
}

export interface TagSuggestionsResponse {
    suggestions: string[];
}

export interface UpdatePhotoTagsPayload {
    tags: string[];
}
