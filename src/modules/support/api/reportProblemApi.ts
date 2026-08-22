import { apiClient } from '@/core/apiClient';

export const reportProblemApi = {
    submit: async (description: string, files: File[]): Promise<void> => {
        const formData = new FormData();
        formData.append('description', description);
        files.forEach(file => formData.append('files', file));

        await apiClient.post('/v1/support/report-problem', formData, {
            skipErrorToast: true,
        });
    },
};
