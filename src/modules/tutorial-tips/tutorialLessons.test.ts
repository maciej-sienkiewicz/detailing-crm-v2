import { describe, expect, it } from 'vitest';
import { lessonFor, lessonUrl } from './tutorialLessons';

describe('lessonFor', () => {
    it('prowadzi z widoku do lekcji o tym module', () => {
        expect(lessonFor('/calendar', '')).toEqual({ view: 'CALENDAR', slug: 'jak-poslugiwac-sie-kalendarzem' });
        expect(lessonFor('/bays/', '')).toEqual({ view: 'BAYS', slug: 'jak-zaplanowac-auto-na-stanowisku' });
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
        expect(lessonFor('/settings', '?tab=company')).toEqual({ view: 'SETTINGS_COMPANY', slug: 'jak-uzupelnic-dane-firmy' });
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

describe('lessonUrl', () => {
    it('otwiera lekcję na podstronie Poznaj program', () => {
        expect(lessonUrl({ view: 'CALENDAR', slug: 'jak-poslugiwac-sie-kalendarzem' }))
            .toBe('https://demo.detailboost.pl/poznaj-program#jak-poslugiwac-sie-kalendarzem');
    });
});
