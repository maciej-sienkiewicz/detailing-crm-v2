// src/modules/operations/hooks/useOperationPagination.ts

import { useState, useCallback } from 'react';

export const useOperationPagination = (initialLimit = 20) => {
    const [page, setPage] = useState(1);
    const [limit] = useState(initialLimit);

    const goToPage = useCallback((newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const resetPagination = useCallback(() => {
        setPage(1);
    }, []);

    return {
        page,
        limit,
        goToPage,
        resetPagination,
    };
};