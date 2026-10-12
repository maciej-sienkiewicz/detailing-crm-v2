import { describe, expect, it } from 'vitest';
import type { ScheduledSmsItem } from '../types';
import { campaignCountLabel, matchesSearch, recipientLabel, sendDayLabel } from './scheduledSmsFormat';

const item = (over: Partial<ScheduledSmsItem>): ScheduledSmsItem => ({
    source: 'QUEUE', id: 'x', kindLabel: 'SMS z potwierdzeniem rezerwacji', waitingReason: '', state: 'PENDING',
    scheduledFor: null, messageContent: 'Potwierdzamy rezerwację', customerId: 'c', customerName: 'Anna Kowalska',
    phoneNumber: '+48534920205', visitId: null, appointmentId: null, appointmentStart: null, cancelledAt: null,
    editable: true, cancellable: true, resumable: false, campaign: null, ...over,
});

const now = new Date(2026, 9, 12, 10, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

describe('scheduledSmsFormat', () => {
    it('dzień: wczoraj, dziś, jutro, a dalej data bez roku, gdy to ten sam rok', () => {
        expect(sendDayLabel(at(12, 14), now)).toBe('Dziś');
        expect(sendDayLabel(at(13, 9), now)).toBe('Jutro');
        expect(sendDayLabel(at(14, 9), now)).toBe('14.10');
        expect(sendDayLabel(at(11, 9), now)).toBe('Wczoraj');
        expect(sendDayLabel(new Date(2027, 0, 5, 9).toISOString(), now)).toBe('05.01.2027');
    });

    it('kampania jest jednym wierszem z liczbą SMS-ów', () => {
        const campaign = item({
            source: 'CAMPAIGN', customerName: null, phoneNumber: null,
            campaign: { id: 'k', name: 'Jesienny przegląd', status: 'SENDING', pendingCount: 124 },
        });
        expect(recipientLabel(campaign)).toBe('Jesienny przegląd');
        expect(campaignCountLabel(124)).toBe('124 SMS-y czekają');
        expect(campaignCountLabel(125)).toBe('125 SMS-ów czeka');
        expect(campaignCountLabel(null)).toBe('Odbiorcy w dniu wysyłki');
    });


    it('szuka po kliencie, treści i numerze bez względu na zapis numeru', () => {
        const sms = item({});
        expect(matchesSearch(sms, 'kowal')).toBe(true);
        expect(matchesSearch(sms, 'REZERWAC')).toBe(true);
        expect(matchesSearch(sms, '534 920')).toBe(true);
        expect(matchesSearch(sms, 'Nowak')).toBe(false);
        expect(matchesSearch(sms, '  ')).toBe(true);
    });
});
