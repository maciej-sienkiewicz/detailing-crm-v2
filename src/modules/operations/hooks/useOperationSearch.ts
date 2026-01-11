// src/modules/operations/hooks/useOperationSearch.ts

import { useState, useCallback } from 'react';
import { useDebounce } from '@/common/hooks';

export const useOperationSearch = () => {
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 500);

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
    }, []);

    return {
        searchInput,
        debouncedSearch,
        handleSearchChange,
    };
};