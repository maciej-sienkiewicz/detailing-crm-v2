import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chaptersLabel, formatDuration, lessonsLabel, tutorialFor } from './tutorialLessons';

const slugs = (path: string, search = '') => tutorialFor(path, search)?.lessons.map(l => l.slug);

describe('tutorialFor', () => {
    it('prowadzi z widoku do lekcji o tym module', () => {
        expect(tutorialFor('/calendar', '')).toMatchObject({ view: 'CALENDAR', module: 'Kalendarz' });
        expect(tutorialFor('/calendar', '')?.lessons[0]).toEqual({
            slug: 'jak-poslugiwac-sie-kalendarzem', title: 'Jak posługiwać się kalendarzem?', seconds: 65, chapters: 5,
        });
        expect(tutorialFor('/bays/', '')?.view).toBe('BAYS');
        expect(tutorialFor('/visits/123', '?tab=photos')?.view).toBe('VISIT');
        expect(tutorialFor('/appointments/42/edit', '')?.view).toBe('APPOINTMENT_FORM');
        expect(tutorialFor('/reservations/7/checkin', '')?.view).toBe('CHECKIN');
    });

    it('moduł ma kilka lekcji, pierwsza to ta, od której warto zacząć', () => {
        expect(slugs('/batch-orders')).toEqual([
            'jak-dodac-kontrahenta-do-zlecen-zbiorczych', 'jak-wygenerowac-pdf-zlecenia-zbiorczego',
        ]);
        expect(slugs('/visits/1')?.[0]).toBe('jak-edytowac-wizyte');
        expect(slugs('/visits/1')?.length).toBeGreaterThan(3);
    });

    it('zakładki jednego modułu dzielą jedną chmurkę', () => {
        expect(tutorialFor('/employees/leave-requests', '')?.view).toBe('EMPLOYEES');
        expect(tutorialFor('/statistics/costs', '')?.view).toBe('FINANCE');
        expect(tutorialFor('/campaigns/new', '')?.view).toBe('CAMPAIGNS');
    });

    it('sekcje Ustawień mają własne chmurki', () => {
        expect(tutorialFor('/settings', '?tab=company')).toMatchObject({ view: 'SETTINGS_COMPANY', module: 'Ustawienia' });
        expect(slugs('/settings', '?tab=services')).toEqual(['jak-dodac-usluge-do-cennika', 'jak-stworzyc-pakiet-uslug']);
    });

    it('widok bez lekcji nie dostaje chmurki', () => {
        expect(tutorialFor('/customers', '')).toBeNull();
        expect(tutorialFor('/campaigns/settings', '')).toBeNull();
        expect(tutorialFor('/settings', '?tab=roles')).toBeNull();
        expect(tutorialFor('/settings', '')).toBeNull();
    });

    it('klucze widoków przechodzą walidację serwera', () => {
        const paths = ['/dashboard', '/calendar', '/operations', '/mail', '/instagram', '/finances', '/batch-orders', '/vehicles/1'];
        for (const path of paths) expect(tutorialFor(path, '')?.view).toMatch(/^[A-Z0-9_]{1,60}$/);
        expect(tutorialFor('/settings', '?tab=templates')?.view).toMatch(/^[A-Z0-9_]{1,60}$/);
    });
});

describe('opis lekcji', () => {
    it('długość jak na odtwarzaczu', () => {
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(134)).toBe('2:14');
    });

    it('polska odmiana', () => {
        expect(chaptersLabel(1)).toBe('1 rozdział');
        expect(chaptersLabel(3)).toBe('3 rozdziały');
        expect(chaptersLabel(5)).toBe('5 rozdziałów');
        expect(chaptersLabel(12)).toBe('12 rozdziałów');
        expect(chaptersLabel(22)).toBe('22 rozdziały');
        expect(lessonsLabel(2)).toBe('2 lekcje');
        expect(lessonsLabel(7)).toBe('7 lekcji');
    });
});

describe('pliki lekcji', () => {
    it('każda lekcja z chmurki ma opis, animację i plakat w public/animacje', () => {
        const paths = ['/dashboard', '/calendar', '/appointments/create', '/checkin/new', '/operations', '/visits/1', '/bays',
            '/leads', '/mail', '/campaigns', '/scheduled-communication', '/instagram', '/finances', '/batch-orders',
            '/employees', '/vehicles/1'];
        const tabs = ['account', 'phone', 'company', 'services', 'documents', 'tablets', 'bays', 'templates', 'leads', 'finance'];
        const modules = [...paths.map(p => tutorialFor(p, '')), ...tabs.map(t => tutorialFor('/settings', `?tab=${t}`))];
        const expected: Record<string, number> = { VISIT: 7, CHECKIN: 4, SETTINGS_TEMPLATES: 3 };
        for (const module of modules) {
            expect(module, 'widok bez lekcji').not.toBeNull();
            // Wpis bez opisu w LESSONS wypadłby z listy po cichu.
            if (expected[module!.view]) expect(module!.lessons).toHaveLength(expected[module!.view]);
            for (const lesson of module!.lessons) {
                for (const file of ['index.html', 'plakat.webp']) {
                    expect(existsSync(resolve(__dirname, '../../../public/animacje', lesson.slug, file)), `${lesson.slug}/${file}`).toBe(true);
                }
            }
        }
    });
});
