import { useState, useCallback } from 'react';

export const useVehiclePagination = (initialPage = 1, initialLimit = 10) => {
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);

    const goToPage = useCallback((newPage: number) => {
        setPage(newPage);
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