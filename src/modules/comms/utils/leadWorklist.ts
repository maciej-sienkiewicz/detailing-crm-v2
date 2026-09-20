// src/modules/comms/utils/leadWorklist.ts
// Kolejka podzielona na sekcje - jedno źródło prawdy dla listy i dla panelu obok.
//
// ── Dlaczego sekcje, a nie zakładki ─────────────────────────────────────────
//
// „Czeka na nas" i „U klienta" były dwoma przyciskami przełączającymi widok tej samej
// listy. Kosztowało to dokładnie tyle, ile kosztuje każda zakładka: pracy, której
// nie widać, nie ma. Licznik przy „U klienta" był do tego celowo niepozorny (szary
// tekst, nie czerwona pigułka) - a to właśnie tam leżą rozmowy do odzyskania za
// zero złotych. Sami sobie zasłoniliśmy pieniądze.
//
// Jedna lista posortowana samym wiekiem też nie działa: pięć dni ciszy klienta to
// stan normalny, a pięć dni naszej zwłoki to katastrofa. Posortowane razem wypchnie
// na górę rzeczy nieszkodliwe. Stąd klucz dwustopniowy: najpierw czyj ruch, potem
// wiek oczekiwania - czyli Messenger, w którym „nieprzeczytane" znaczy „nasz ruch".
//
// ── Dlaczego to jest czysta funkcja ─────────────────────────────────────────
//
// Bo tę samą odpowiedź musi dać nagłówek sekcji („Czeka na nas 5") i kwota
// w panelu obok („Wyceny w rozmowach bez odzewu"). Policzone dwa razy rozjechałyby
// się pierwszego dnia, w którym ktoś zmieni jeden z warunków.
import type { Lead } from '../types';
import { CLOSED_STATUSES } from './leadFormat';
import {
    DEFAULT_STAGNATION,
    describeLeadUrgency,
    type LeadUrgency,
    type StagnationThresholds,
} from './leadUrgency';

/** OURS - klient czeka na nas. SILENT - cisza klienta przekroczyła próg. CLIENT - reszta. */
export type WorklistSectionKey = 'OURS' | 'SILENT' | 'CLIENT';

export interface WorklistEntry {
    lead: Lead;
    urgency: LeadUrgency;
}

export interface WorklistSection {
    key: WorklistSectionKey;
    /** Nagłówek sekcji - zdanie, nie nazwa filtru. */
    title: string;
    entries: WorklistEntry[];
    /**
     * Suma wycen spraw w sekcji (grosze).
     *
     * Ma sens WYŁĄCZNIE w „Ucichło": tam każda sprawa przeszła już przez wycenę,
     * więc kwota jest faktem. W „Czeka na nas" większość spraw ma zero złotych,
     * bo nikt ich jeszcze nie wycenił - suma mówiłaby tam, że najpilniejsze sprawy
     * są najmniej warte. Widok bierze tę liczbę tylko z sekcji ciszy.
     */
    value: number;
}

export interface Worklist {
    ours: WorklistSection;
    silent: WorklistSection;
    client: WorklistSection;
    /** Do wyrenderowania po kolei; sekcje puste wypadają bez śladu. */
    sections: WorklistSection[];
    /** Wszystkie sprawy otwarte razem - mianownik dla „nic nie czeka". */
    total: number;
    /**
     * Sprawa, od której zaczyna się dzisiejsza praca: najstarsza z „Czeka na nas",
     * a gdy tam pusto - najstarsza z „Ucichło".
     *
     * Dziś czyta to wyłącznie test i ewentualny skrót klawiaturowy - panel obok
     * świadomie nie ma przycisku, który by tu prowadził (to kolumna kontekstu,
     * nie druga kolejka). Zostaje, bo jest jednozdaniową definicją „od czego się
     * zaczyna", a ta definicja i tak musi gdzieś mieszkać.
     */
    head: WorklistEntry | null;
}

/*
 * Nazwy sekcji mówią o STANIE SPRAWY, nie do użytkownika.
 *
 * „Czeka na nas", a nie „Czeka na Ciebie": w studiu przy skrzynce siada kilka
 * osób, a poza tym forma „my" jest już językiem tego modułu (podpowiedzi mówią
 * „odpisaliśmy", „czekamy na decyzję"). Przy okazji znika problem, którego polski
 * nie wybacza - druga osoba w czasie przeszłym ma rodzaj, a aplikacja nie wie,
 * kto siedzi po drugiej stronie.
 *
 * Bez wykrzykników, bez „aż" i „tylko", bez metafor z prezentacji sprzedażowej.
 * Etykieta nazywa rzecz; ocena należy do właściciela.
 */
const TITLES: Record<WorklistSectionKey, string> = {
    OURS: 'Czeka na nas',
    SILENT: 'Ucichło',
    CLIENT: 'U klienta',
};

/** Najdłużej czekające na górze - wiek rośnie sam i nigdy nie przeskakuje. */
const byAge = (a: WorklistEntry, b: WorklistEntry) => b.urgency.waitingMs - a.urgency.waitingMs;

const section = (key: WorklistSectionKey, entries: WorklistEntry[]): WorklistSection => ({
    key,
    title: TITLES[key],
    entries: entries.sort(byAge),
    value: entries.reduce((sum, entry) => sum + entry.lead.estimatedValue, 0),
});

/**
 * Trzy sekcje z listy spraw otwartych.
 *
 * [now] wstrzykiwane wyłącznie dla testów - w aplikacji zawsze bieżąca chwila.
 */
export function buildWorklist(
    leads: Lead[],
    thresholds: StagnationThresholds = DEFAULT_STAGNATION,
    now: number = Date.now()
): Worklist {
    const ours: WorklistEntry[] = [];
    const silent: WorklistEntry[] = [];
    const client: WorklistEntry[] = [];

    for (const lead of leads) {
        // Sprawa zamknięta nie ma czyjego ruchu i mieszka w archiwum. Filtr jest tu,
        // a nie w wywołaniu, żeby żaden widok nie mógł o nim zapomnieć.
        if (CLOSED_STATUSES.has(lead.status)) continue;

        const urgency = describeLeadUrgency(lead, thresholds, now);
        const entry = { lead, urgency };

        if (urgency.turn === 'OURS') ours.push(entry);
        else if (urgency.turn === 'CLIENT') {
            // „Ucichło" to nie trzeci rodzaj ruchu, tylko ten sam ruch po przekroczeniu
            // progu studia. Ton wylicza już reguła pilności - nie powtarzamy warunku,
            // bo dwa miejsca z tym samym progiem to dwa progi za rok.
            if (urgency.tone === 'stale') silent.push(entry);
            else client.push(entry);
        }
    }

    const oursSection = section('OURS', ours);
    const silentSection = section('SILENT', silent);
    const clientSection = section('CLIENT', client);

    return {
        ours: oursSection,
        silent: silentSection,
        client: clientSection,
        sections: [oursSection, silentSection, clientSection].filter((s) => s.entries.length > 0),
        total: ours.length + silent.length + client.length,
        head: oursSection.entries[0] ?? silentSection.entries[0] ?? null,
    };
}

/**
 * Ile spraw w „Czeka na nas" przekroczyło próg studia.
 *
 * Osobno od liczby spraw, bo to są dwa różne zdania: „pięć osób czeka" mówi o pracy
 * do zrobienia, „trzy czekają ponad dobę" mówi o długu. Pierwsze jest normalne,
 * drugie nie - i tylko drugie zasługuje na podniesienie głosu.
 */
export function overdueCount(
    worklist: Worklist,
    thresholds: StagnationThresholds = DEFAULT_STAGNATION
): number {
    const limit = thresholds.ourReplyHours * 3_600_000;
    return worklist.ours.entries.filter((entry) => entry.urgency.waitingMs >= limit).length;
}

/** „1 sprawa", „3 sprawy", „11 spraw" - polska odmiana bez zaskoczeń przy 12-14. */
export function caseCount(n: number): string {
    if (n === 1) return '1 sprawa';
    const rest = n % 10;
    const teens = n % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14) ? `${n} sprawy` : `${n} spraw`;
}
