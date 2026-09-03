import { describe, expect, it } from 'vitest';
import { isStartedVisit } from './visitStatus';

/** Rozpoczęta wizyta jest w kalendarzu lżejsza niż rezerwacja; ten predykat o tym decyduje. */
describe('isStartedVisit', () => {
    it('w trakcie i gotowa do odbioru są rozpoczęte', () => {
        expect(isStartedVisit('IN_PROGRESS')).toBe(true);
        expect(isStartedVisit('READY_FOR_PICKUP')).toBe(true);
    });

    it('rezerwacja, szkic, zakończone i anulowane nie są', () => {
        ['DRAFT', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'ARCHIVED', 'REJECTED', 'CANCELLED', 'ABANDONED', undefined]
            .forEach(s => expect(isStartedVisit(s)).toBe(false));
    });
});
