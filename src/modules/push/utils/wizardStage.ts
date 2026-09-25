// src/modules/push/utils/wizardStage.ts
//
// Na którym etapie kreatora powiadomień stoi użytkownik - wyliczane ze stanu
// urządzenia, nigdy zapamiętywane. Kreator nie ma „kroku 2 z 3" w pamięci:
// iPhone po dodaniu do ekranu początkowego otwiera aplikację z CZYSTĄ pamięcią
// (osobne localStorage, osobne ciasteczka niż w Safari), więc zapamiętany krok
// i tak by zginął. Stan urządzenia nie ginie - aplikacja z ikony sama wie, że
// pierwszy krok jest za nią.

import type { PushSupportState } from '../types';
import type { PushPlatform } from './pushPlatform';

export type WizardStage =
    /** Sprawdzamy, czy ta przeglądarka ma już subskrypcję. */
    | 'checking'
    /** iOS w karcie przeglądarki: najpierw „Dodaj do ekranu początkowego". */
    | 'install'
    /** Przeglądarka wbudowana (Facebook, Gmail, WebView): otwórz w Safari/Chrome. */
    | 'open-in-browser'
    /** iOS bez Web Push. */
    | 'update-os'
    | 'unsupported'
    /** Zgoda odmówiona - przeglądarka drugi raz nie zapyta, trzeba odblokować w ustawieniach. */
    | 'blocked'
    /** Wszystko gotowe do zapytania o zgodę: tu pada „dlaczego warto" i jeden przycisk. */
    | 'ask'
    /** To urządzenie dostaje powiadomienia. */
    | 'ready';

export interface WizardInput {
    platform: PushPlatform;
    support: PushSupportState;
    isSubscribedHere: boolean | null;
}

export const wizardStage = ({ platform, support, isSubscribedHere }: WizardInput): WizardStage => {
    switch (platform.kind) {
        case 'ios-update': return 'update-os';
        case 'open-in-browser': return 'open-in-browser';
        case 'ios-install': return 'install';
        case 'unsupported': return 'unsupported';
        default: break;
    }
    if (support === 'unsupported') return 'unsupported';
    if (support === 'denied') return 'blocked';
    if (isSubscribedHere === null) return 'checking';
    return isSubscribedHere ? 'ready' : 'ask';
};

/** Ścieżka, którą widzi użytkownik - na iPhonie o jeden krok dłuższa. */
export const wizardTrail = (platform: PushPlatform): string[] =>
    platform.kind === 'ios-install' || platform.kind === 'ios-app'
        ? ['Na ekran', 'Zezwól', 'Sprawdź']
        : ['Zezwól', 'Sprawdź'];

/** Indeks bieżącego kroku na ścieżce albo null, gdy etap leży poza nią (np. „zaktualizuj iOS"). */
export const wizardTrailIndex = (stage: WizardStage, platform: PushPlatform): number | null => {
    const trail = wizardTrail(platform);
    const permissionStep = trail.length - 2;
    switch (stage) {
        case 'install': return 0;
        case 'ask':
        case 'blocked':
        case 'checking': return permissionStep;
        case 'ready': return trail.length - 1;
        default: return null;
    }
};
