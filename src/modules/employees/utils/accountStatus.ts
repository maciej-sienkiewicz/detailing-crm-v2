import { formatDateTime } from '@/common/utils';
import type { EmployeeAccountInfo } from '../types';

/**
 * Stan konta pracownika, tak jak widzi go zarządzający zespołem.
 *
 * `isActive` z backendu znaczy tylko „nie zablokowane": konto założone z zaproszeniem
 * jest aktywne od pierwszej sekundy, zanim pracownik w ogóle otworzy e-mail. Dlatego
 * „Konto aktywne" pojawia się dopiero, gdy konto przestaje czekać na aktywację.
 * Blokada wygrywa ze wszystkim - zablokowany nie zaloguje się, zaproszenie czy nie.
 */
export type AccountStatus = 'none' | 'pending' | 'active' | 'blocked';

export const accountStatusOf = (account: EmployeeAccountInfo | null): AccountStatus => {
    if (!account) return 'none';
    if (!account.isActive) return 'blocked';
    if (account.invitationPending) return 'pending';
    return 'active';
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
    none: 'Brak konta',
    pending: 'Czeka na aktywację',
    active: 'Konto aktywne',
    blocked: 'Konto zablokowane',
};

/**
 * Zdanie pod plakietką konta, które czeka na aktywację: dokąd i kiedy poszło zaproszenie
 * i czy link jeszcze działa. Bez tego „Wyślij maila ponownie" byłoby strzałem w ciemno.
 */
export const invitationSummary = (account: EmployeeAccountInfo, now: Date = new Date()): string => {
    const to = account.email ? ` na ${account.email}` : '';
    if (!account.invitationSentAt) {
        return `Nie udało się wysłać zaproszenia${to}. Wyślij je ponownie.`;
    }
    const sent = `Zaproszenie wysłane ${formatDateTime(account.invitationSentAt)}${to}`;
    if (!account.invitationExpiresAt) return `${sent}.`;
    const expiresAt = new Date(account.invitationExpiresAt);
    return expiresAt.getTime() <= now.getTime()
        ? `${sent}. Link wygasł ${formatDateTime(expiresAt)} - wyślij nowy.`
        : `${sent}. Link działa do ${formatDateTime(expiresAt)}.`;
};
