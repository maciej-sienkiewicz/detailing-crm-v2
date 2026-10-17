import { useMemo } from 'react';
import { useInstagramProfiles } from './useInstagramProfiles';
import { buildProfileColors } from '../utils/profileColors';

/** Kolory liczone z całego koszyka obserwowanych, nie z wierszy jednej zakładki. */
export const useProfileColors = () => {
    const { profiles } = useInstagramProfiles();
    return useMemo(
        () => buildProfileColors(profiles.filter(p => p.status === 'ACTIVE')),
        [profiles],
    );
};
