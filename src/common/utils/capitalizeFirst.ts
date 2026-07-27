export const capitalizeFirst = (v: string): string =>
    v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v;
