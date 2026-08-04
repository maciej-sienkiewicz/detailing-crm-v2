import { useCallback } from 'react';
import type { KnownProfile } from '../types';

const STORAGE_KEY = 'autocrm_known_profiles';

function readProfiles(): KnownProfile[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as KnownProfile[]) : [];
    } catch {
        return [];
    }
}

function writeProfiles(profiles: KnownProfile[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function useKnownProfiles() {
    const getProfiles = useCallback((): KnownProfile[] => readProfiles(), []);

    const addOrUpdateProfile = useCallback((profile: KnownProfile) => {
        const existing = readProfiles();
        const idx = existing.findIndex(p => p.userId === profile.userId);
        if (idx >= 0) {
            existing[idx] = profile;
        } else {
            existing.push(profile);
        }
        writeProfiles(existing);
    }, []);

    const removeProfile = useCallback((userId: string) => {
        const existing = readProfiles().filter(p => p.userId !== userId);
        writeProfiles(existing);
    }, []);

    const clearProfiles = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return { getProfiles, addOrUpdateProfile, removeProfile, clearProfiles };
}
