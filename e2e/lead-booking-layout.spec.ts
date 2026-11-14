import { test, expect, type Page } from '@playwright/test';
import { stubAppApi } from './fixtures/appApi';

/**
 * „Umów wizytę" z leada otwartego na tablicy: oba kroki nad oknem leada, na całym ekranie.
 *
 * Skąd ten plik: okno leada na tablicy (BoardCaseModal) ma `will-change: transform`,
 * a transform przodka zamienia `position: fixed` w pozycję względem jego pudełka.
 * Formularz rezerwacji, zamontowany w oknie leada bez portalu, stawał przesunięty
 * o szerokość sidebara od lewej krawędzi okna leada i przycięty do jego granic.
 * Kalendarz wyboru terminu miał portal, ale nakładkę od sidebara, więc lewy brzeg
 * okna leada wystawał spod przyciemnienia. W jsdom układ się nie liczy, stąd przeglądarka.
 */

const EMAIL = 'andrzej-reklewski@wp.pl';
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const lead = {
    id: 'lead-1', source: 'EMAIL', status: 'IN_PROGRESS', contactIdentifier: EMAIL, customerName: EMAIL,
    initialMessage: 'Dzień dobry, proszę o wycenę oklejenia BMW X6.', estimatedValue: 1_845_000, requiresVerification: false,
    customerId: null, appointmentId: null, visitId: null, assignedUserId: null, assignedUserName: null, threadId: null,
    tags: [], tagLabels: [], vehicleBrand: 'Bmw', vehicleModel: 'X6', vehicleKind: 'CAR', vehicleDetectionStatus: 'DONE',
    lostReasonCode: null, lostReasonLabel: null, lostReason: null,
    services: [{
        id: 'item-1', serviceId: null, name: 'Oklejenie pojazdu - Full Body', priceGross: 1_845_000, priceNet: 1_500_000,
        vatRate: 23, note: null, quantity: 1, totalGross: 1_845_000, status: 'ACCEPTED', source: 'MANUAL', priceSource: 'MANUAL',
    }],
    replyState: 'AWAITING_CUSTOMER', waitingSince: daysAgo(1), lastInboundAt: daysAgo(2), lastOutboundAt: daysAgo(1),
    firstResponseAt: daysAgo(1), closedAt: null, owedSince: null, owedNote: null, createdAt: daysAgo(3), updatedAt: daysAgo(1),
};

async function stubLead(page: Page) {
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    // Rejestrowane po stubAppApi, więc wygrywają z jego domyślnym `{}`.
    await page.context().route(url => url.pathname === '/api/v1/comms/form-sources', route => route.fulfill(json([])));
    await page.context().route(url => url.pathname.startsWith('/api/v1/leads'), route => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        if (path === '/v1/leads') return route.fulfill(json({ items: [lead], page: { number: 1, size: 25, totalItems: 1, totalPages: 1 } }));
        if (path === '/v1/leads/lead-1') return route.fulfill(json(lead));
        if (path === '/v1/leads/lead-1/contact-card') {
            return route.fulfill(json({ email: EMAIL, customer: null, vehicles: [], recentVisits: [], risk: { abandonedBookings: 0, abandonedLeads: 0 } }));
        }
        if (/\/(timeline|notes|callbacks)$/.test(path)) return route.fulfill(json([]));
        return route.fulfill(json({}));
    });
}

/** Prostokąt nakładki (najbliższy przodek `position: fixed`) i czy siedzi w oknie leada. */
async function overlayOf(page: Page, step: 'calendar' | 'form') {
    return page.evaluate((which) => {
        const sheet = which === 'calendar'
            ? [...document.querySelectorAll('h2')].find(h => h.textContent === 'Wybierz termin')?.closest('header')?.parentElement
            : document.querySelector('form')?.parentElement;
        let overlay: Element | null | undefined = sheet;
        while (overlay && getComputedStyle(overlay).position !== 'fixed') overlay = overlay.parentElement;
        const leadDialog = document.querySelector('[role="dialog"][aria-labelledby="case-title"]');
        const box = overlay?.getBoundingClientRect();
        return {
            left: box?.left, right: box?.right, top: box?.top, bottom: box?.bottom,
            insideLead: Boolean(overlay && leadDialog?.contains(overlay)),
        };
    }, step);
}

for (const viewport of [{ width: 1636, height: 830 }, { width: 1280, height: 800 }]) {
    test.describe(`Rezerwacja z leada na tablicy, ${viewport.width} px`, () => {
        test.use({ viewport });

        test('kalendarz i formularz zakrywają cały ekran, poza oknem leada', async ({ page }) => {
            await stubAppApi(page.context());
            await stubLead(page);
            await page.goto('/inbox?lead=lead-1');

            await page.getByRole('button', { name: /Umów wizytę/ }).first().click();
            await expect(page.getByRole('heading', { name: 'Wybierz termin' })).toBeVisible();
            expect(await overlayOf(page, 'calendar')).toEqual({
                left: 0, right: viewport.width, top: 0, bottom: viewport.height, insideLead: false,
            });

            const day = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
            await page.locator(`.fc-daygrid-day[data-date="${day}"]`).first().click();
            await expect(page.getByText('Zapisz rezerwację')).toBeVisible();
            expect(await overlayOf(page, 'form')).toEqual({
                left: 0, right: viewport.width, top: 0, bottom: viewport.height, insideLead: false,
            });
        });
    });
}
