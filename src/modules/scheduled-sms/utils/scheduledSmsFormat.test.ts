import { describe, expect, it } from 'vitest';
import type { ScheduledSmsItem } from '../types';
import { campaignCountLabel, dayLabel, groupByDay, matchesKind, recipientLabel } from './scheduledSmsFormat';

const item = (over: Partial<ScheduledSmsItem>): ScheduledSmsItem => ({
    source: 'QUEUE', id: 'x', kindLabel: 'SMS z potwierdzeniem rezerwacji', waitingReason: '', state: 'PENDING',
    scheduledFor: null, messageContent: 'Treść', customerId: 'c', customerName: 'Anna Kowalska',
    phoneNumber: '+48534920205', visitId: null, appointmentId: null, appointmentStart: null, cancelledAt: null,
    editable: true, cancellable: true, resumable: false, campaign: null, ...over,
});

const now = new Date(2026, 9, 12, 10, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

describe('scheduledSmsFormat', () => {
    it('dzień po ludzku: dziś, jutro, potem dzień tygodnia z datą', () => {
        expect(dayLabel(at(12, 14), now)).toBe('Dziś');
        expect(dayLabel(at(13, 9), now)).toBe('Jutro');
        expect(dayLabel(at(14, 9), now)).toBe('środa, 14.10');
    });

    it('grupuje po dniach w kolejności terminów, a zaległe i „jak najszybciej" stawia na początku', () => {
        const groups = groupByDay([
            item({ id: 'tomorrow', scheduledFor: at(13, 12) }),
            item({ id: 'today', scheduledFor: at(12, 15) }),
            item({ id: 'asap', source: 'CAMPAIGN', scheduledFor: null }),
            item({ id: 'overdue', scheduledFor: at(12, 9) }),
        ], now);

        expect(groups.map(g => g.label)).toEqual(['Najbliższa wysyłka', 'Dziś', 'Jutro']);
        expect(groups[0].items.map(i => i.id)).toEqual(['asap', 'overdue']);
    });

    it('kampania jest jednym wierszem z liczbą SMS-ów', () => {
        const campaign = item({
            source: 'CAMPAIGN', customerName: null, phoneNumber: null,
            campaign: { id: 'k', name: 'Jesienny przegląd', status: 'SENDING', pendingCount: 120 },
        });
        expect(recipientLabel(campaign)).toBe('Jesienny przegląd');
        expect(campaignCountLabel(120)).toBe('120 SMS-ów czeka');
        expect(campaignCountLabel(2)).toBe('2 SMS-y czekają');
        expect(campaignCountLabel(null)).toBe('Odbiorców ustalimy w dniu wysyłki');
        expect(matchesKind(campaign, 'campaigns')).toBe(true);
        expect(matchesKind(campaign, 'reminders')).toBe(false);
    });

    it('przypomnienia obejmują automat, ręczne przy wizycie i po usłudze', () => {
        expect(matchesKind(item({ source: 'PRE_VISIT' }), 'reminders')).toBe(true);
        expect(matchesKind(item({ source: 'VISIT_REMINDER' }), 'reminders')).toBe(true);
        expect(matchesKind(item({ source: 'DELAYED_REMINDER' }), 'reminders')).toBe(true);
        expect(matchesKind(item({ source: 'QUEUE' }), 'reminders')).toBe(false);
    });
});
