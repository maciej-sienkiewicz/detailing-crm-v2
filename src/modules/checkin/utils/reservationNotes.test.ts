import { describe, it, expect } from 'vitest';
import { reservationTechnicalNotes } from './reservationNotes';

describe('reservationTechnicalNotes', () => {
    it('przenosi notatkę wewnętrzną i notatkę do protokołu', () => {
        expect(reservationTechnicalNotes({
            note: 'stara notatka',
            internalNote: 'klient płaci gotówką',
            protocolNote: 'rysa na tylnym zderzaku zgłoszona przy rezerwacji',
        })).toEqual({
            inspectionNotes: 'klient płaci gotówką',
            protocolNotes: 'rysa na tylnym zderzaku zgłoszona przy rezerwacji',
        });
    });

    it('rezerwacja sprzed rozdzielenia pól: dawne note jako notatka wewnętrzna', () => {
        expect(reservationTechnicalNotes({ note: 'oddzwonić przed odbiorem' })).toEqual({
            inspectionNotes: 'oddzwonić przed odbiorem',
            protocolNotes: '',
        });
    });

    it('brak danych daje puste pola, nie undefined', () => {
        expect(reservationTechnicalNotes(undefined)).toEqual({ inspectionNotes: '', protocolNotes: '' });
        expect(reservationTechnicalNotes({ note: null, internalNote: null, protocolNote: null }))
            .toEqual({ inspectionNotes: '', protocolNotes: '' });
    });
});
