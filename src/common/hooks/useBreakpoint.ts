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

