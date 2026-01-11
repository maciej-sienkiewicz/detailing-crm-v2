
import { useState, useCallback } from 'react';
import { useDebounce } from '@/common/hooks';

export const useVehicleSearch = () => {
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 300);

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
    }, []);

    return {
        searchInput,
        debouncedSearch,
        handleSearchChange,
    };
};