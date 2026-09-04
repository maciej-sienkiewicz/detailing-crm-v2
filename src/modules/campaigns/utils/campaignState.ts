// src/modules/campaigns/utils/campaignState.ts
// „Co się z tą kampanią dzieje" - cała arytmetyka stanu w jednym miejscu.
//
// Mieszka poza komponentami, bo z tej samej odpowiedzi korzystają trzy widoki:
// pasek pilności przy krawędzi wiersza tabeli, znacznik pod statusem w tej samej
// tabeli i komórka „Co dalej" w oknie kampanii. Progi liczone trzy razy
// rozjechałyby się przy pierwszej zmianie.
//
// Odpowiednik leadReply.ts z modułu leadów - i celowo tego samego kształtu:
// ton ('due' / 'stale' / 'neutral') znaczy tutaj dokładnie to, co tam, więc
// czerwony pasek przy wierszu kampanii nie wymaga osobnego tłumaczenia od kogoś,
// kto nauczył się go na liście leadów.
import type { Campaign, CampaignStatus } from '../types';

/** 'due' - coś nie wyszło i trzeba zareagować. 'stale' - stoi i czeka na człowieka. */
export type CampaignTone = 'neutral' | 'due' | 'stale';

export interface CampaignMarker {
    tone: CampaignTone;
    /** Krótko, do wąskiej kolumny tabeli. Pełne zdanie idzie do [title]. */
    label: string;
    title: string;
}

const DAY_MS = 86_400_000;

/** Statusy, po których kampania już nic nie zrobi. */
export const CLOSED_STATUSES: Set<CampaignStatus> = new Set([
    'COMPLETED', 'CANCELLED', 'FAILED', 'ARCHIVED',
]);

/** „1 wiadomość", „2 wiadomości", „5 wiadomości". */
export const messageWord = (count: number): string =>
    count === 1 ? 'wiadomość' : 'wiadomości';

/** „za 3 dni", „jutro", „dziś o 10:00", „12 gru, 10:00". */
export function describeMoment(iso: string | null): string {
    if (!iso) return 'natychmiast';
    const date = new Date(iso);
    const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const days = Math.floor((date.getTime() - startOfToday) / DAY_MS);
    if (days === 0) return `dziś, ${time}`;
    if (days === 1) return `jutro, ${time}`;
    if (days > 1 && days < 7) return `za ${days} dni, ${time}`;
    return `${date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}, ${time}`;
}

/**
 * Jedno zdanie o tym, czy kampania czegoś od nas chce.
 *
 * Kolejność jest kolejnością pilności, nie kolejnością statusów w enumie:
 * nieudane wiadomości biją wszystko inne, bo to jedyny stan, w którym klient
 * czegoś nie dostał, a my myślimy, że dostał. Zaraz za nimi brak kredytów na
 * zaplanowaną wysyłkę - jeszcze da się temu zapobiec, ale tylko przed terminem.
 *
 * [creditsShort] przychodzi z zewnątrz, bo stan konta kredytowego nie jest
 * własnością kampanii: ta sama kampania jest opłacalna rano i za droga po
 * południu, gdy w międzyczasie wyszła inna.
 */
export function describeCampaign(campaign: Campaign, creditsShort = false): CampaignMarker {
    const failed = campaign.recipientsFailed;

    if (campaign.status === 'FAILED') {
        return {
            tone: 'due',
            label: 'Wysyłka nie powiodła się',
            title: 'Kampania zakończyła się błędem - sprawdź listę odbiorców',
        };
    }
    if (failed > 0) {
        return {
            tone: 'due',
            label: `${failed} nie wyszło`,
            title: `${failed} ${messageWord(failed)} nie dotarło do odbiorców - można ponowić wysyłkę`,
        };
    }
    if (creditsShort && (campaign.status === 'SCHEDULED' || campaign.status === 'ACTIVE')) {
        return {
            tone: 'due',
            label: 'Zabraknie kredytów',
            title: 'Kredytów SMS nie starczy na tę wysyłkę - doładuj przed terminem',
        };
    }

    switch (campaign.status) {
        case 'SENDING':
            return {
                tone: 'neutral',
                label: 'Wysyła się teraz',
                title: 'Wiadomości wychodzą w tej chwili',
            };
        case 'SCHEDULED':
            return {
                tone: 'neutral',
                label: describeMoment(campaign.scheduledAt),
                title: 'Wyjdzie sama, bez Twojego udziału',
            };
        case 'ACTIVE':
            return {
                tone: 'neutral',
                label: 'Sprawdza codziennie',
                title: 'Kampania sama wysyła wiadomość każdemu klientowi, który spełni warunek',
            };
        case 'PAUSED':
            return {
                tone: 'stale',
                label: 'Wstrzymana',
                title: 'Warunek nie jest sprawdzany - nikt nie dostaje tych wiadomości',
            };
        case 'DRAFT':
            return {
                tone: 'stale',
                label: 'Niedokończony szkic',
                title: 'Szkic nie wysyła się sam - dokończ go albo usuń',
            };
        case 'COMPLETED':
            return { tone: 'neutral', label: 'Zakończona', title: 'Wysyłka dobiegła końca' };
        case 'CANCELLED':
            return { tone: 'neutral', label: 'Anulowana', title: 'Wysyłka została odwołana przed terminem' };
        default:
            return { tone: 'neutral', label: 'Zarchiwizowana', title: 'Kampania odłożona do archiwum' };
    }
}

/**
 * Sam ton, bez etykiety - dla wiersza tabeli, który zaznacza pilne kampanie
 * paskiem przy krawędzi. Pasek nie zajmuje ani piksela szerokości tabeli,
 * więc znajduje kłopot szybciej niż jakakolwiek plakietka w środku wiersza.
 */
export const campaignTone = (campaign: Campaign, creditsShort = false): CampaignTone =>
    describeCampaign(campaign, creditsShort).tone;

/**
 * Ilu ludzi dostało albo dostanie tę wiadomość - liczba, dla której ktoś w ogóle
 * otwiera kampanię. Zwracamy też mianownik, gdy wysyłka jeszcze trwa: „412 z 980"
 * to inna informacja niż „412".
 */
export function recipientsFigure(campaign: Campaign): { value: string; note: string | null } {
    if (campaign.status === 'SENDING') {
        return {
            value: String(campaign.recipientsSent),
            note: `z ${campaign.recipientsTotal}`,
        };
    }
    if (campaign.recipientsSent > 0) {
        return { value: String(campaign.recipientsSent), note: 'wysłanych wiadomości' };
    }
    if (campaign.recipientsTotal > 0) {
        return { value: String(campaign.recipientsTotal), note: 'odbiorców na liście' };
    }
    return { value: '-', note: 'lista powstanie przy wysyłce' };
}
