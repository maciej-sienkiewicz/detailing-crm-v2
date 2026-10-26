import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chaptersLabel, formatDuration, lessonFor } from './tutorialLessons';

describe('lessonFor', () => {
    it('prowadzi z widoku do lekcji o tym module', () => {
        expect(lessonFor('/calendar', '')).toEqual({
            view: 'CALENDAR', slug: 'jak-poslugiwac-sie-kalendarzem', module: 'Kalendarz',
            title: 'Jak posługiwać się kalendarzem?', seconds: 65, chapters: 5,
        });
        expect(lessonFor('/bays/', '')).toMatchObject({ view: 'BAYS', slug: 'jak-zaplanowac-auto-na-stanowisku' });
        expect(lessonFor('/visits/123', '?tab=photos')?.view).toBe('VISIT');
        expect(lessonFor('/appointments/42/edit', '')?.view).toBe('APPOINTMENT_FORM');
        expect(lessonFor('/reservations/7/checkin', '')?.view).toBe('CHECKIN');
    });

    it('zakładki jednego modułu dzielą jedną chmurkę', () => {
        expect(lessonFor('/employees/leave-requests', '')?.view).toBe('EMPLOYEES');
        expect(lessonFor('/statistics/costs', '')?.view).toBe('FINANCE');
        expect(lessonFor('/campaigns/new', '')?.view).toBe('CAMPAIGNS');
    });

    it('sekcje Ustawień mają własne chmurki', () => {
        expect(lessonFor('/settings', '?tab=company')).toMatchObject({
            view: 'SETTINGS_COMPANY', slug: 'jak-uzupelnic-dane-firmy', module: 'Ustawienia',
        });
        expect(lessonFor('/settings', '?tab=bays')?.slug).toBe('jak-ustawic-stanowiska');
    });

    it('widok bez lekcji nie dostaje chmurki', () => {
        expect(lessonFor('/customers', '')).toBeNull();
        expect(lessonFor('/campaigns/settings', '')).toBeNull();
        expect(lessonFor('/settings', '?tab=roles')).toBeNull();
        expect(lessonFor('/settings', '')).toBeNull();
    });

    it('klucze widoków przechodzą walidację serwera', () => {
        const paths = ['/dashboard', '/calendar', '/mail', '/instagram', '/finances', '/batch-orders', '/vehicles/1'];
        for (const path of paths) expect(lessonFor(path, '')?.view).toMatch(/^[A-Z0-9_]{1,60}$/);
        expect(lessonFor('/settings', '?tab=templates')?.view).toMatch(/^[A-Z0-9_]{1,60}$/);
    });
});

describe('opis lekcji', () => {
    it('długość jak na odtwarzaczu', () => {
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(134)).toBe('2:14');
    });

    it('rozdziały z polską odmianą', () => {
        expect(chaptersLabel(1)).toBe('1 rozdział');
        expect(chaptersLabel(3)).toBe('3 rozdziały');
        expect(chaptersLabel(5)).toBe('5 rozdziałów');
        expect(chaptersLabel(12)).toBe('12 rozdziałów');
        expect(chaptersLabel(22)).toBe('22 rozdziały');
    });
});

describe('pliki lekcji', () => {
    it('każda lekcja z chmurki ma animację i plakat w public/animacje', () => {
        const paths = ['/dashboard', '/calendar', '/appointments/create', '/checkin/new', '/visits/1', '/bays', '/leads',
            '/mail', '/campaigns', '/scheduled-communication', '/instagram', '/finances', '/batch-orders', '/employees',
            '/vehicles/1'];
        const tabs = ['account', 'phone', 'company', 'services', 'documents', 'tablets', 'bays', 'templates', 'leads', 'finance'];
        const lessons = [...paths.map(p => lessonFor(p, '')), ...tabs.map(t => lessonFor('/settings', `?tab=${t}`))];
        for (const lesson of lessons) {
            expect(lesson, 'lekcja bez opisu w LESSONS').not.toBeNull();
            for (const file of ['index.html', 'plakat.webp']) {
                expect(existsSync(resolve(__dirname, '../../../public/animacje', lesson!.slug, file)), `${lesson!.slug}/${file}`).toBe(true);
            }
        }
    });
});
