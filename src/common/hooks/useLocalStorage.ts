import { useState, useCallback } from 'react';

/**
 * A type-safe, SSR-safe hook for persisting state in localStorage.
 * Follows the same API as useState.
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return defaultValue;
            return JSON.parse(stored) as T;
        } catch {
            return defaultValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setState((prev: T) => {
                const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
                try {
                    localStorage.setItem(key, JSON.stringify(next));
                } catch {
                    // Quota exceeded or private browsing – silently ignore
                }
                return next;
            });
        },
        [key],
    );

    return [state, setValue];
}
