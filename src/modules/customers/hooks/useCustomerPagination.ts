import { useState, useCallback } from 'react';
import type { PaginationMeta } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

interface UsePaginationOptions {
    initialPage?: number;
    initialLimit?: number;
}

export const useCustomerPagination = (options: UsePaginationOptions = {}) => {
    const [page, setPage] = useState(options.initialPage ?? DEFAULT_PAGE);
    const [limit, setLimit] = useState(options.initialLimit ?? DEFAULT_LIMIT);

    const goToPage = useCallback((newPage: number) => {
        setPage(Math.max(1, newPage));
    }, []);

    const goToNextPage = useCallback((pagination: PaginationMeta | null) => {
        if (pagination && page < pagination.totalPages) {
            setPage(prev => prev + 1);
        }
    }, [page]);

    const goToPreviousPage = useCallback(() => {
        setPage(prev => Math.max(1, prev - 1));
    }, []);

    const changeLimit = useCallback((newLimit: number) => {
        setLimit(newLimit);
        setPage(DEFAULT_PAGE);
    }, []);

    const resetPagination = useCallback(() => {
        setPage(DEFAULT_PAGE);
    }, []);

    return {
        page,
        limit,
        goToPage,
        goToNextPage,
        goToPreviousPage,
        changeLimit,
        resetPagination,
    };
};