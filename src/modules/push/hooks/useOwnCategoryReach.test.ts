// Czy rodzaj powiadomień dochodzi do osoby, która ogląda ekran. Tabela „Rodzaje
// powiadomień" to jedyny włącznik; wiersze „kiedy i jak często" pod nią są wyszarzone,
// gdy rodzaj nie dochodzi do żadnego WŁASNEGO urządzenia.
import { describe, expect, it } from 'vitest';
import type { PushDeviceNotifications, PushNotificationSettings } from '../types';
import { categoryReach, reachNote } from './useOwnCategoryReach';

const device = (mine: boolean, enabled: boolean, available = true): PushDeviceNotifications => ({
    id: Math.random().toString(36),
    deviceName: mine ? 'Mój iPhone' : 'Telefon recepcji',
    platform: 'IOS',
    transport: 'WEB_PUSH',
    createdAt: '2026-10-01T10:00:00Z',
    lastUsedAt: null,
    userId: mine ? 'ja' : 'recepcja',
    userName: mine ? 'Ja' : 'Recepcja',
    mine,
    categories: [{ category: 'APPOINTMENT_REMINDERS', enabled, available }],
});

const settings = (...devices: PushDeviceNotifications[]): PushNotificationSettings => ({ manageAll: true, devices });

describe('categoryReach', () => {
    it('włączone na jednym z własnych urządzeń - dochodzi', () => {
        expect(categoryReach(settings(device(true, false), device(true, true)), 'APPOINTMENT_REMINDERS')).toBe('reaches');
    });

    it('włączone tylko na cudzym urządzeniu (właściciel widzi telefon recepcji) - do mnie nie dochodzi', () => {
        expect(categoryReach(settings(device(true, false), device(false, true)), 'APPOINTMENT_REMINDERS')).toBe('off');
    });

    it('włączone, ale bez uprawnienia - nie dochodzi', () => {
        expect(categoryReach(settings(device(true, true, false)), 'APPOINTMENT_REMINDERS')).toBe('off');
    });

    it('bez własnego urządzenia i przed wczytaniem', () => {
        expect(categoryReach(settings(device(false, true)), 'APPOINTMENT_REMINDERS')).toBe('no-device');
        expect(categoryReach(undefined, 'APPOINTMENT_REMINDERS')).toBe('unknown');
    });
});

describe('reachNote', () => {
    it('mówi, który rodzaj i gdzie go włączyć - zdanie pasuje do każdej nazwy', () => {
        expect(reachNote('off', 'REPORTS')).toBe(
            'Rodzaj „Nowy raport” jest wyłączony na wszystkich Twoich urządzeniach. Włącz go w tabeli „Rodzaje powiadomień”.',
        );
        expect(reachNote('off', 'APPOINTMENT_REMINDERS')).toContain('Rodzaj „Przypomnienie o rezerwacji” jest wyłączony');
    });

    it('nic nie mówi, gdy dochodzi albo jeszcze nie wiadomo', () => {
        expect(reachNote('reaches', 'REPORTS')).toBeNull();
        expect(reachNote('unknown', 'REPORTS')).toBeNull();
        expect(reachNote('no-device', 'REPORTS')).toBe('Twoje konto nie ma jeszcze sparowanego urządzenia.');
    });
});
