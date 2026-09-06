// src/modules/comms/utils/leadPrimaryAction.ts
// Jedna akcja na karcie w kolejce - ta, którą trzeba wykonać TERAZ.
//
// Reguła jest przeniesiona z okna szczegółów (LeadDetailModal), gdzie działała
// od dawna i była jedyną rzeczą w module, która sama wiedziała, co dalej. Karta
// w kolejce ma dokładnie ten sam problem, a właściciel z mokrymi rękami ma na
// niego piętnaście sekund - więc decyzja „co kliknąć" nie może należeć do niego.
//
// Kolejność gałęzi jest kolejnością pilności, nie wygody implementacji:
// zaległa odpowiedź bije wszystko inne, bo klient czeka teraz, a termin poczeka.
import type { Lead } from '../types';
import type { LeadUrgency } from './leadUrgency';

export type LeadActionKind = 'REPLY' | 'CALL' | 'BOOK' | 'APPOINTMENT';

export interface LeadPrimaryAction {
    kind: LeadActionKind;
    label: string;
    /** Krótka etykieta na wąską kartę telefonu. */
    shortLabel: string;
    /** Wypełniony przycisk w kolorze akcentu tylko dla akcji, która jest zadaniem. */
    emphasis: 'primary' | 'quiet';
    /** Dla telefonu: link `tel:`, który otwiera dialer bez przechodzenia przez CRM. */
    href?: string;
}

/** Numer, pod który da się zadzwonić - tylko lead telefoniczny niesie go wprost. */
export function leadPhoneNumber(lead: Pick<Lead, 'source' | 'contactIdentifier'>): string | null {
    return lead.source === 'PHONE' ? lead.contactIdentifier : null;
}

export function leadPrimaryAction(lead: Lead, urgency: LeadUrgency): LeadPrimaryAction {
    // Rezerwacja już stoi w kalendarzu. Drugiej się nie założy (backend odmówi),
    // więc oferowanie jej byłoby ślepą uliczką.
    if (lead.appointmentId) {
        return { kind: 'APPOINTMENT', label: 'Zobacz termin', shortLabel: 'Termin', emphasis: 'quiet' };
    }

    if (urgency.turn === 'OURS') {
        const phone = leadPhoneNumber(lead);
        // Lead z telefonu nie ma wątku, więc „odpisz" nie miałoby dokąd prowadzić.
        // Zadzwonienie jest tu jedyną sensowną odpowiedzią - i jedyną, która na
        // telefonie w hali wykonuje się jednym tapnięciem, bez wchodzenia w CRM.
        if (!lead.threadId && phone) {
            return {
                kind: 'CALL',
                label: 'Zadzwoń',
                shortLabel: 'Zadzwoń',
                emphasis: 'primary',
                href: `tel:${phone.replace(/\s/g, '')}`,
            };
        }
        return { kind: 'REPLY', label: 'Odpisz klientowi', shortLabel: 'Odpisz', emphasis: 'primary' };
    }

    // Odpisaliśmy i czekamy - następnym krokiem jest umówienie, czyli po co ten
    // moduł w ogóle jest.
    return { kind: 'BOOK', label: 'Stwórz rezerwację', shortLabel: 'Rezerwacja', emphasis: 'quiet' };
}
