// Random, realistic-looking fake values rendered (blurred) in place of masked
// personal data. Generated client-side from Math.random() — no relation to the
// real values, which never leave the backend.

/** Shape of the fake value rendered under the blur. */
export type PiiKind = 'name' | 'firstName' | 'phone' | 'email' | 'text';

const CONSONANTS = 'bcdgjklmnprstwz';
const VOWELS = 'aeiouy';
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

/** Pronounceable gibberish word, e.g. "morela", "kubat". */
const fakeWord = (syllables: number): string =>
    Array.from({ length: syllables }, () => pick(CONSONANTS) + pick(VOWELS)).join('');

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const generatePiiFake = (kind: PiiKind): string => {
    switch (kind) {
        case 'firstName':
            return capitalize(fakeWord(randInt(2, 3)));
        case 'name':
            return `${capitalize(fakeWord(randInt(2, 3)))} ${capitalize(fakeWord(randInt(3, 4)))}`;
        case 'phone':
            return `${randInt(500, 899)} ${randInt(100, 999)} ${randInt(100, 999)}`;
        case 'email':
            return `${fakeWord(randInt(2, 3))}.${fakeWord(randInt(2, 3))}@${fakeWord(2)}.pl`;
        case 'text':
            return fakeWord(randInt(3, 5));
    }
};
