/** Two-letter initials for a PickerAvatar; falls back to a dash when there is no name. */
export const initialsOf = (...parts: Array<string | null | undefined>): string => {
    const letters = parts
        .map(p => (p || '').trim())
        .filter(Boolean)
        .map(p => p[0]!.toUpperCase());
    return letters.slice(0, 2).join('') || '-';
};
