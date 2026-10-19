import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANY_ADDRESS, COMPANY_CAPITAL, COMPANY_COURT, COMPANY_IDS, COMPANY_NAME } from './companyLegal';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const escape = (text: string) => text.replace(/&/g, '&amp;');

describe('dane spółki w statycznym index.html', () => {
    it('zawiera oficjalną nazwę z KRS - po nią przychodzi weryfikacja firmy w Meta', () => {
        expect(html).toContain(escape(COMPANY_NAME));
    });

    it('zgadza się z danymi w stopce logowania', () => {
        for (const line of [COMPANY_ADDRESS, COMPANY_COURT, COMPANY_CAPITAL, ...COMPANY_IDS]) {
            expect(html).toContain(escape(line));
        }
    });
});
