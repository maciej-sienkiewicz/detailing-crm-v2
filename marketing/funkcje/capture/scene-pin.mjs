// Kod PIN: tablet w studiu zna kilka profili, „Przełącz użytkownika” → Marek Zając
// (Detailer) → PIN na klawiaturze → CRM w widoku detailera (bez Finansów i Statystyk).
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio, seedPins } from './seed.mjs';
import { TITLE_HOLD, go, up } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, history: false });
        const profiles = seedPins(studioId);
        await go(page, '/dashboard', 'Do zrobienia');
        await page.evaluate((p) => localStorage.setItem('autocrm_known_profiles', JSON.stringify(p)), profiles);
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByTitle('Przełącz użytkownika').first().waitFor({ timeout: 20000 });
        await wait(page, 1500);
        await showCursorAt(page, 900, 600);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await click(page, page.getByTitle('Przełącz użytkownika').first(), { ms: 1000, settle: 1200 });
        await beat(page, rec, 'wybor', page.getByText('Wybierz użytkownika').first().locator('xpath=ancestor::*[3]'));
        await wait(page, 3600);
        await click(page, page.getByText('Marek Zając', { exact: false }).last(), { ms: 900, settle: 1000 });
        await beat(page, rec, 'pin', null);
        for (const k of ['1', '2', '3', '4']) await click(page, page.getByRole('button', { name: k, exact: true }).last(), { ms: 380, settle: 260 });
        await page.waitForLoadState('networkidle');
        await wait(page, 2500);
        await beat(page, rec, 'detailer', page.locator('nav, aside').first());
        await wait(page, 5200);
    },
};
