import { useState, useEffect } from 'react';
import { breakpoints } from '../theme/breakpoints';

type BreakpointKey = keyof typeof breakpoints;

const getBreakpointValue = (key: BreakpointKey): number => {
    const value = breakpoints[key];
    return parseInt(value.replace('px', ''), 10);
};

export const useBreakpoint = (breakpoint: BreakpointKey): boolean => {
    const [isAboveBreakpoint, setIsAboveBreakpoint] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth >= getBreakpointValue(breakpoint);
    });

    useEffect(() => {
        const breakpointValue = getBreakpointValue(breakpoint);
        const mediaQuery = window.matchMedia(`(min-width: ${breakpointValue}px)`);

        const handleChange = (event: MediaQueryListEvent) => {
            setIsAboveBreakpoint(event.matches);
        };

        setIsAboveBreakpoint(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [breakpoint]);

    return isAboveBreakpoint;
};

export const useCurrentBreakpoint = (): BreakpointKey => {
    const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointKey>('xs');

    useEffect(() => {
        const checkBreakpoint = () => {
            const width = window.innerWidth;
            const breakpointEntries = Object.entries(breakpoints) as [BreakpointKey, string][];

            const sorted = breakpointEntries
                .map(([key, value]) => ({ key, value: parseInt(value.replace('px', ''), 10) }))
                .sort((a, b) => b.value - a.value);

            for (const { key, value } of sorted) {
                if (width >= value) {
                    setCurrentBreakpoint(key);
                    return;
                }
            }
            setCurrentBreakpoint('xs');
        };

        checkBreakpoint();
        window.addEventListener('resize', checkBreakpoint);

        return () => {
            window.removeEventListener('resize', checkBreakpoint);
        };
    }, []);

    return currentBreakpoint;
};