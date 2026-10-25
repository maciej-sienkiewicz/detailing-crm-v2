// src/common/components/notifications/AppointmentReminderSetting.tsx
//
// „Przypomnienie o rezerwacji" w Ustawieniach → Telefon → Powiadomienia, w sekcji
// „Przypomnienia i podsumowania". Ile wcześniej, ustawia każda osoba dla siebie - push
// trafia na JEJ telefon (serwer: NotificationCategory.APPOINTMENT_REMINDER,
// AppointmentReminderJob). Czy przychodzi i na które urządzenia, decyduje wyłącznie
// tabela „Rodzaje powiadomień".
//
// Do 25.10.2026 wiersz miał własne „Wyłączone / Włączone", domyślnie wyłączone, a tabela
// domyślnie włączone. Ekran mówił w tabeli „włączone", a przypomnienie nie przychodziło -
// dwa włączniki do jednej rzeczy. Został jeden (tabela), a tu - sam czas, domyślnie godzina.
//
// Czas wpisuje się liczbą i jednostką, od 1 minuty do 30 dni. Pierwsza wersja miała
// sześć gotowych czasów do wyboru, a biznes chce dowolnego. Gotowe czasy przy okazji
// nie mieściły się na telefonie: „2 godz." i „1 dzień" chowały się za krawędzią.
//
// Ciszę dla nowych osób trzyma tabela: nowo sparowane urządzenie ma przypomnienia
// wyciszone (serwer: PushNotificationCategory.OFF_BY_DEFAULT) - dotyczą każdej rezerwacji
// studia, więc włączone wszystkim naraz zasypałyby telefony zespołu.
//
// Zapis bez przycisku, jak pozostałe ustawienia w tej sekcji: po chwili bez pisania,
// po wyjściu z pola i po zmianie jednostki. Przycisk „Zapisz" byłby tu drugim
// wypełnieniem w oknie (CLAUDE.md §2) albo przyciskiem, o którym łatwo zapomnieć.
//
// Sam wiersz, bez własnej ramy - ramę i nagłówek daje sekcja, jak raportowi obok.

import { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { touch, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import {
    DEFAULT_LEAD, LEAD_ERROR, UNITS, draftMinutes, leadMinutes, reminderHint, toDraft, toIso, unitLabel,
    type LeadDraft, type LeadUnit,
} from './appointmentReminderLead';
import { useNotificationPreferences } from './useNotificationPreferences';

const CATEGORY = 'APPOINTMENT_REMINDER';
const TITLE = 'Przypomnienie o rezerwacji';

/** Tyle bez pisania i czas idzie na serwer - nie po każdej cyfrze. */
const SAVE_DELAY_MS = 800;

/** Przypomnienie idzie do osób, które widzą kalendarz - jak „Nowa rezerwacja". */
export const APPOINTMENT_REMINDER_PERMISSION = 'VISITS_VIEW';

export function AppointmentReminderSetting() {
    const { can } = usePermissions();
    if (!can(APPOINTMENT_REMINDER_PERMISSION)) return null;
    return <Setting />;
}

function Setting() {
    const { preferences, update } = useNotificationPreferences();
    /** To, co osoba właśnie wpisuje; null = pola pokazują zapisany czas. */
    const [draft, setDraft] = useState<LeadDraft | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pending = useRef<(() => void) | null>(null);
    const hintId = useId();

    // Czas wpisany tuż przed zamknięciem ekranu też się zapisuje.
    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
        pending.current?.();
    }, []);

    if (preferences.isError) return null;
    const entry = preferences.data?.find((item) => item.category === CATEGORY);
    // Serwer jeszcze nie zna przypomnień (starsza wersja) - bez pól, które niczego nie zmieniają.
    if (preferences.data && !entry) return null;

    // Wprost z odpowiedzi, bez preferenceValue(): ta odrzuca wartość spoza `options`, a przy
    // wpisywanym czasie `options` to samo „OFF". Wiersz, którego serwer nie przyjmuje, i tak
    // przychodzi już jako wartość domyślna (NotificationPreferenceService.list).
    // Serwer sprzed zmiany odda jeszcze „OFF" - pokazujemy wtedy czas domyślny.
    const saved = entry?.value ?? DEFAULT_LEAD;
    const shown = draft ?? toDraft(leadMinutes(saved) ?? leadMinutes(DEFAULT_LEAD) ?? 60);
    const minutes = draftMinutes(shown);

    const cancelPending = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        pending.current = null;
    };

    const save = (next: LeadDraft) => {
        const nextMinutes = draftMinutes(next);
        if (nextMinutes === null) return;
        const value = toIso(nextMinutes);
        if (value !== saved) update(CATEGORY, value);
    };

    const changeAmount = (amount: string) => {
        const next = { amount, unit: shown.unit };
        setDraft(next);
        cancelPending();
        pending.current = () => save(next);
        timer.current = setTimeout(() => {
            pending.current?.();
            pending.current = null;
            timer.current = null;
        }, SAVE_DELAY_MS);
    };

    // Po wyjściu z pola czas wraca w największej pełnej jednostce: „120 minut" → „2 godziny".
    // Błędny wpis zostaje w polu z komunikatem, żeby było widać, co poprawić.
    const commit = () => {
        if (!draft) return;
        cancelPending();
        if (draftMinutes(draft) === null) return;
        save(draft);
        setDraft(null);
    };

    const changeUnit = (unit: LeadUnit) => {
        cancelPending();
        const next = { amount: shown.amount, unit };
        if (draftMinutes(next) === null) {
            setDraft(next);
            return;
        }
        save(next);
        setDraft(null);
    };

    const invalid = minutes === null;

    return (
        <Row aria-busy={preferences.isLoading}>
            <RowTitle>{TITLE}</RowTitle>
            <Fields>
                <Amount
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={shown.amount}
                    aria-label="Ile przed rezerwacją"
                    aria-invalid={invalid}
                    aria-describedby={hintId}
                    onChange={(event) => changeAmount(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                />
                <Unit
                    aria-label="Jednostka czasu"
                    value={shown.unit}
                    onChange={(event) => changeUnit(event.target.value as LeadUnit)}
                >
                    {UNITS.map((unit) => <option key={unit} value={unit}>{unitLabel(unit, shown.amount)}</option>)}
                </Unit>
                <span>przed rezerwacją</span>
            </Fields>
            {invalid
                ? <ErrorText id={hintId} role="alert">{LEAD_ERROR}</ErrorText>
                : <Hint id={hintId}>{reminderHint(minutes)}</Hint>}
        </Row>
    );
}

const Row = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 100%;
`;

const RowTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Fields = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;

    > span { font-size: 13.5px; color: ${ui.inkSoft}; }
`;

const control = `
    height: 36px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface};
    font: inherit;
    font-size: 14px;
    color: ${ui.ink};

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const Amount = styled.input`
    ${control}
    width: 72px;
    padding: 0 10px;
    font-variant-numeric: tabular-nums;

    &[aria-invalid='true'] { border-color: ${ui.dangerInk}; }
    ${touch} { height: 44px; }
`;

const Unit = styled.select`
    ${control}
    padding: 0 8px;
    ${touch} { height: 44px; }
`;

const Hint = styled.p`
    margin: 0;
    max-width: 68ch;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: ${ui.dangerInk};
`;
