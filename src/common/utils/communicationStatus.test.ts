import { describe, expect, it } from 'vitest';
import { communicationTone, queuedHint, COMMUNICATION_STATUS_LABEL } from './communicationStatus';

describe('communicationStatus', () => {
    it('QUEUED to osobny ton, nie „wysłano”', () => {
        expect(communicationTone('QUEUED')).toBe('queued');
        expect(COMMUNICATION_STATUS_LABEL.queued).toBe('W kolejce');
        expect(communicationTone('SENT')).toBe('sent');
        expect(communicationTone('FAILED')).toBe('failed');
        expect(communicationTone('RECEIVED')).toBe('received');
    });

    it('podpowiedź „wyjdzie o …” tylko dla wpisu w kolejce z terminem', () => {
        const hint = queuedHint({ status: 'QUEUED', scheduledFor: '2026-09-16T10:00:00Z' });
        expect(hint).toMatch(/^wyjdzie o \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
        expect(queuedHint({ status: 'QUEUED', scheduledFor: null })).toBeNull();
        expect(queuedHint({ status: 'SENT', scheduledFor: '2026-09-16T10:00:00Z' })).toBeNull();
    });
});
