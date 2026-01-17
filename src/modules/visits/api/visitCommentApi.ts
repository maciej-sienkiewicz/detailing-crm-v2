// src/modules/visits/api/visitCommentApi.ts

import { apiClient } from '@/core';
import type {
    GetCommentsResponse,
    AddCommentPayload,
    AddCommentResponse,
    UpdateCommentPayload,
    UpdateCommentResponse,
    DeleteCommentResponse,
} from '../types';

export const visitCommentApi = {
    /**
     * Get all comments for a visit
     */
    getComments: async (visitId: string): Promise<GetCommentsResponse> => {
        const response = await apiClient.get<GetCommentsResponse>(
            `/api/visits/${visitId}/comments`
        );
        return response.data;
    },

    /**
     * Add a new comment to a visit
     */
    addComment: async (
        visitId: string,
        payload: AddCommentPayload
    ): Promise<AddCommentResponse> => {
        const response = await apiClient.post<AddCommentResponse>(
            `/api/visits/${visitId}/comments`,
            payload
        );
        return response.data;
    },

    /**
     * Update an existing comment
     */
    updateComment: async (
        visitId: string,
        commentId: string,
        payload: UpdateCommentPayload
    ): Promise<UpdateCommentResponse> => {
        const response = await apiClient.put<UpdateCommentResponse>(
            `/api/visits/${visitId}/comments/${commentId}`,
            payload
        );
        return response.data;
    },

    /**
     * Delete a comment (soft delete)
     */
    deleteComment: async (
        visitId: string,
        commentId: string
    ): Promise<DeleteCommentResponse> => {
        const response = await apiClient.delete<DeleteCommentResponse>(
            `/api/visits/${visitId}/comments/${commentId}`
        );
        return response.data;
    },
};
