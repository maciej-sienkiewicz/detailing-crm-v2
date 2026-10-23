// src/common/components/notifications/AppointmentReminderSetting.tsx
//
// „Przypomnienie o rezerwacji" w Ustawieniach → Telefon → Powiadomienia, w sekcji
// „Przypomnienia i podsumowania". Ile wcześniej (albo wcale) ustawia każda osoba dla
// siebie - push trafia na JEJ telefon (serwer: NotificationCategory.APPOINTMENT_REMINDER,
// AppointmentReminderJob). Na które urządzenia, decyduje tabela „Rodzaje powiadomień".
//
// Czas wpisuje się liczbą i jednostką, od 1 minuty do 30 dni. Pierwsza wersja miała
// sześć gotowych czasów do wyboru, a biznes chce dowolnego. Gotowe czasy przy okazji
// nie mieściły się na telefonie: „2 godz." i „1 dzień" chowały się za krawędzią.
//
// Domyślnie wyłączone: przypomnienie dotyczy każdej rezerwacji studia, więc włączone
// wszystkim naraz zasypałoby telefony zespołu.
//
// Zapis bez przycisku, jak pozostałe ustawienia w tej sekcji: po chwili bez pisania,
// po wyjściu z pola i po zmianie jednostki. Przycisk „Zapisz" byłby tu drugim
// wypełnieniem w oknie (CLAUDE.md §2) albo przyciskiem, o którym łatwo zapomnieć.
//
// Sam wiersz, bez własnej ramy - ramę i nagłówek daje sekcja, jak raportowi obok.

import { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { Segmented, touch, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import {
    DEFAULT_LEAD, LEAD_ERROR, UNITS, draftMinutes, leadMinutes, reminderHint, toDraft, toIso, unitLabel,
    type LeadDraft, type LeadUnit,
} from './appointmentReminderLead';
import { useNotificationPreferences } from './useNotificationPreferences';

const CATEGORY = 'APPOINTMENT_REMINDER';
const TITLE = 'Przypomnienie o rezerwacji';
const OFF_HINT = 'Włącz i wpisz, ile przed każdą rezerwacją z kalendarza przychodzi przypomnienie.';

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
    /** Czas sprzed wyłączenia - ponowne włączenie go przywraca, zamiast wracać do godziny. */
    const [lastOn, setLastOn] = useState(DEFAULT_LEAD);
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
    const saved = entry?.value ?? 'OFF';
    const savedMinutes = leadMinutes(saved);
    const on = savedMinutes !== null;
    const shown = draft ?? toDraft(savedMinutes ?? leadMinutes(lastOn) ?? 60);
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

    const toggle = (next: 'ON' | 'OFF') => {
        cancelPending();
        setDraft(null);
        if (next === 'OFF') {
            if (on) setLastOn(saved);
            update(CATEGORY, 'OFF');
        } else {
            update(CATEGORY, lastOn);
        }
    };

    const invalid = on && minutes === null;

    return (
        <Row aria-busy={preferences.isLoading}>
            <RowTitle>{TITLE}</RowTitle>
            <Controls>
                <Segmented
                    label={TITLE}
                    size="sm"
                    options={[
                        { value: 'OFF' as const, label: 'Wyłączone' },
                        { value: 'ON' as const, label: 'Włączone' },
                    ]}
                    value={on ? 'ON' : 'OFF'}
                    onChange={(next) => { if (next !== (on ? 'ON' : 'OFF')) toggle(next); }}
                />
                {on && (
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
                )}
            </Controls>
            {invalid
                ? <ErrorText id={hintId} role="alert">{LEAD_ERROR}</ErrorText>
                : <Hint id={hintId}>{on && minutes !== null ? reminderHint(minutes) : OFF_HINT}</Hint>}
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

const Controls = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    max-width: 100%;
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
