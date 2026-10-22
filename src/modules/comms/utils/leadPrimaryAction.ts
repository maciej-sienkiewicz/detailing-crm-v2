// src/modules/comms/utils/leadPrimaryAction.ts
// Jedna akcja na karcie w kolejce - ta, którą trzeba wykonać TERAZ.
//
// Reguła jest przeniesiona z dawnego okna szczegółów leada, gdzie działała
// od dawna i była jedyną rzeczą w module, która sama wiedziała, co dalej. Karta
// w kolejce ma dokładnie ten sam problem, a właściciel z mokrymi rękami ma na
// niego piętnaście sekund - więc decyzja „co kliknąć" nie może należeć do niego.
//
// Kolejność gałęzi jest kolejnością pilności, nie wygody implementacji:
// zaległa odpowiedź bije wszystko inne, bo klient czeka teraz, a termin poczeka.
import type { Lead } from '../types';

/**
 * Adres e-mail kontaktu leada albo null.
 *
 * Wcześniej wystarczała „małpa" w identyfikatorze - aż przyszły leady z Instagrama,
 * których kontaktem jest login („@jan.kowalski"). Taki lead dostawał kompozytor
 * maila zaadresowany do loginu: wiadomość, która nie miała szans dojść, a sprawa
 * wyglądała na odpisaną. Adres to coś przed i po małpie, z kropką w domenie.
 */
export function leadEmail(lead: Pick<Lead, 'source' | 'contactIdentifier'> | null | undefined): string | null {
    if (!lead || lead.source === 'INSTAGRAM') return null;
    const value = lead.contactIdentifier?.trim() ?? '';
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}

/** Numer, pod który da się zadzwonić - tylko lead telefoniczny niesie go wprost. */
export function leadPhoneNumber(lead: Pick<Lead, 'source' | 'contactIdentifier'>): string | null {
    return lead.source === 'PHONE' ? lead.contactIdentifier : null;
}

