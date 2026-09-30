// src/modules/settings/views/legacyTeamRedirect.ts
//
// Dokąd prowadzi dawny adres sekcji „Pracownicy i role". SettingsView sprawdza to
// PRZED aliasami sekcji: `?tab=team` nie jest już sekcją ustawień, tylko modułem obok
// (/employees). Linki siedzą w mailach, powiadomieniach i zakładkach przeglądarki -
// nie mogą po cichu lądować na pierwszej sekcji ustawień.

export function legacyTeamRedirect(params: URLSearchParams): string | null {
    if (params.get('tab') !== 'team') return null;
    const view = params.get('view');
    if (view === 'settlements') return '/employees/worktime';
    if (view === 'roles') return '/settings?tab=roles';
    return '/employees';
}
