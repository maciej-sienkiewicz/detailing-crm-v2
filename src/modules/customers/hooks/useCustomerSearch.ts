import { useState, useMemo } from 'react';
import { useDebounce } from '@/common/hooks/useDebounce';

const SEARCH_DEBOUNCE_MS = 300;

export const useCustomerSearch = (initialSearch = '') => {
    const [searchInput, setSearchInput] = useState(initialSearch);
    const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

    const handlers = useMemo(
        () => ({
            handleSearchChange: (value: string) => setSearchInput(value),
            clearSearch: () => setSearchInput(''),
        }),
        []
    );

    return {
        searchInput,
        debouncedSearch,
        ...handlers,
    };
};