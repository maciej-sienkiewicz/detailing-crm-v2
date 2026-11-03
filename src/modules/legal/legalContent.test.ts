// Treści dokumentów, które ktoś akceptuje, mają kopię
// w backendzie (`automotive-crm-v2-backend/src/main/resources/legal/`). Backend zapisuje
// przy akceptacji skrót SHA-256 TEJ kopii i z niej rysuje PDF do potwierdzenia, więc
// zmiana treści tylko tutaj sprawiłaby, że dowód wskazuje inny tekst niż ten na stronie.
//
// Gdy test pada po zmianie treści: skopiuj plik bez zmian do backendu, wpisz nowy skrót
// (`shasum -a 256 <plik>`) tutaj i w `LegalTextsTest.kt`, a przy zmianie regulaminu lub
// umowy powierzenia podbij też LEGAL_VERSION i `LegalDocumentVersions.CURRENT`.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PINNED: Record<string, string> = {
    'regulamin.json': 'a1abd69b5659b65d35b22e7da5a53cd940cf26f554c60f2cef2b49cdb8c058dc',
    'umowa-powierzenia.json': '286c329765d922337f98f1168649273994c82ce197fe2710b069bdd3db54fe27',
    'polityka-prywatnosci.json': '7b3708fec49ef9e475d8cda05da656701cbb5f6b1f0325913226bf4f27deed44',
};

describe('treści dokumentów prawnych', () => {
    it.each(Object.entries(PINNED))('%s ma ten sam skrót co kopia w backendzie', (file, sha256) => {
        const bytes = readFileSync(resolve(__dirname, 'content', file));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
    });
});
