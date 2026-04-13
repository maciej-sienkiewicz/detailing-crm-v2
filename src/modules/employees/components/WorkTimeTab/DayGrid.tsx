/**
 * DayGrid — horizontally-scrollable timesheet grid for one month.
 *
 * Layout (sticky columns):
 *   [Label col | day-1 … day-N | Total col]
 *
 * Rows:
 *   • Header  — day number + short weekday name, coloured for weekends/holidays/today
 *   • Regular — editable hour inputs (disabled if period is read-only)
 *   • Total   — sum per day (= regular hours, since benefits live in a separate section)
 */

import { useCallback, useRef, useState } from 'react';
import {
    GridScrollWrapper,
    GridTable,
    GridThead,
    GridTbody,
    LabelTh,
    TotalTh,
    LabelCell,
    TotalCell,
    DayTh,
    DayTd,
    DayNumber,
    DayName,
    HolidayDot,
    HoursInput,
    EmptyDash,
    TotalRow,
} from './styles';
import {
    toDateStr,
    isToday,
    isWeekendDay,
    dayNameShort,
    getDaysInMonth,
} from './utils';
import { getPolishHolidays } from '../../utils/polishHolidays';
import { useSaveDailyHours } from '../../hooks/useWorkTime';
import type { WorkTimeEntry } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: string;
    period: string;          // YYYY-MM
    entries: WorkTimeEntry[]; // REGULAR entries for this period
    readOnly: boolean;        // true when period is APPROVED
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a date-keyed map of effective hours from REGULAR entries. */
function buildHoursMap(entries: WorkTimeEntry[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const e of entries) {
        if (e.entryType !== 'REGULAR') continue;
        // Multiple REGULAR entries on the same day are summed.
        map[e.date] = (map[e.date] ?? 0) + Number(e.effectiveHours);
    }
    return map;
}

/**
 * Format a raw hours number for display/input:
 * 0 → '' (empty string so the placeholder shows)
 * 8 → '8'
 * 7.5 → '7.5'
 */
function fmtHours(h: number): string {
    if (!h) return '';
    return h % 1 === 0 ? String(h) : h.toFixed(1);
}

/** Parse user-typed string to a number, clamped to [0, 24]. */
function parseHoursInput(raw: string): number {
    const n = parseFloat(raw.replace(',', '.'));
    if (isNaN(n) || n < 0) return 0;
    return Math.min(n, 24);
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

const SAVE_DELAY_MS = 800;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export const DayGrid = ({ employeeId, period, entries, readOnly }: Props) => {
    const days = getDaysInMonth(period);
    const [year, month] = period.split('-').map(Number);
    const holidays = getPolishHolidays(year);

    // Also fetch previous-year holidays to cover Jan (e.g., Easter from prev year never wraps, but Dec 26 etc.)
    // In practice we only need current year; add next year only when month = December.
    const holidaysNext = month === 12 ? getPolishHolidays(year + 1) : new Set<string>();
    const allHolidays = new Set([...holidays, ...holidaysNext]);

    // Derived from server entries; kept in sync via React Query invalidation.
    const serverHoursMap = buildHoursMap(entries);

    // Local input state — keyed by YYYY-MM-DD.
    const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const day of days) {
            const key = toDateStr(day);
            init[key] = fmtHours(serverHoursMap[key] ?? 0);
        }
        return init;
    });

    // Per-cell save state for visual feedback.
    const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

    const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const saveMutation = useSaveDailyHours(employeeId);

    // When server entries update (e.g. after refetch), sync local values
    // only for cells the user is NOT currently editing.
    const activeCell = useRef<string | null>(null);

    const triggerSave = useCallback(
        (dateKey: string, hours: number) => {
            clearTimeout(timerRefs.current[dateKey]);
            setSaveStates(prev => ({ ...prev, [dateKey]: 'saving' }));

            timerRefs.current[dateKey] = setTimeout(async () => {
                try {
                    await saveMutation.mutateAsync({ date: dateKey, hours });
                    setSaveStates(prev => ({ ...prev, [dateKey]: 'saved' }));
                    // Auto-clear "saved" indicator after 2 s
                    setTimeout(() => {
                        setSaveStates(prev => {
                            const next = { ...prev };
                            if (next[dateKey] === 'saved') delete next[dateKey];
                            return next;
                        });
                    }, 2000);
                } catch {
                    setSaveStates(prev => ({ ...prev, [dateKey]: 'error' }));
                }
            }, SAVE_DELAY_MS);
        },
        [saveMutation],
    );

    const handleChange = useCallback(
        (dateKey: string, raw: string) => {
            setLocalValues(prev => ({ ...prev, [dateKey]: raw }));
            const hours = parseHoursInput(raw);
            triggerSave(dateKey, hours);
        },
        [triggerSave],
    );

    const handleFocus = (dateKey: string) => {
        activeCell.current = dateKey;
    };

    const handleBlur = (dateKey: string) => {
        activeCell.current = null;
        // Normalize displayed value on blur
        const hours = parseHoursInput(localValues[dateKey] ?? '');
        setLocalValues(prev => ({ ...prev, [dateKey]: fmtHours(hours) }));
    };

    // Total regular hours for the month
    const monthTotal = days.reduce((acc, day) => {
        const key = toDateStr(day);
        return acc + parseHoursInput(localValues[key] ?? '');
    }, 0);

    return (
        <GridScrollWrapper>
            <GridTable role="grid" aria-label={`Siatka godzin – ${period}`}>
                {/* ── Header row ── */}
                <GridThead>
                    <tr>
                        <LabelTh>Typ</LabelTh>
                        {days.map(day => {
                            const key = toDateStr(day);
                            const weekend = isWeekendDay(day);
                            const holiday = allHolidays.has(key);
                            const today = isToday(day);
                            return (
                                <DayTh
                                    key={key}
                                    $weekend={weekend}
                                    $holiday={holiday}
                                    $today={today}
                                    title={holiday ? 'Dzień wolny' : undefined}
                                >
                                    <DayNumber>{day.getDate()}</DayNumber>
                                    <DayName>{dayNameShort(day)}</DayName>
                                    {holiday && <HolidayDot />}
                                </DayTh>
                            );
                        })}
                        <TotalTh>Suma</TotalTh>
                    </tr>
                </GridThead>

                {/* ── Regular hours row ── */}
                <GridTbody>
                    <tr>
                        <LabelCell>Godziny regularne</LabelCell>
                        {days.map(day => {
                            const key = toDateStr(day);
                            const weekend = isWeekendDay(day);
                            const holiday = allHolidays.has(key);
                            const today = isToday(day);
                            const disabled = readOnly || weekend || holiday;
                            const saveState = saveStates[key];

                            return (
                                <DayTd
                                    key={key}
                                    $weekend={weekend}
                                    $holiday={holiday}
                                    $today={today}
                                >
                                    {disabled ? (
                                        <EmptyDash>—</EmptyDash>
                                    ) : (
                                        <HoursInput
                                            type="text"
                                            inputMode="decimal"
                                            aria-label={`Godziny ${key}`}
                                            value={localValues[key] ?? ''}
                                            placeholder="0"
                                            disabled={disabled}
                                            $saving={saveState === 'saving'}
                                            $saved={saveState === 'saved'}
                                            onChange={e => handleChange(key, e.target.value)}
                                            onFocus={() => handleFocus(key)}
                                            onBlur={() => handleBlur(key)}
                                        />
                                    )}
                                </DayTd>
                            );
                        })}
                        <TotalCell>
                            {fmtHours(monthTotal) || '0'} h
                        </TotalCell>
                    </tr>

                    {/* ── Total row (mirrors regular when there's only one data row) ── */}
                    <TotalRow>
                        <LabelCell as="td">Suma</LabelCell>
                        {days.map(day => {
                            const key = toDateStr(day);
                            const weekend = isWeekendDay(day);
                            const holiday = allHolidays.has(key);
                            const today = isToday(day);
                            const dayTotal = parseHoursInput(localValues[key] ?? '');
                            return (
                                <DayTd
                                    key={key}
                                    $weekend={weekend}
                                    $holiday={holiday}
                                    $today={today}
                                    style={{ fontWeight: 700 }}
                                >
                                    {dayTotal > 0 ? (
                                        <EmptyDash as="span" style={{ color: 'inherit', fontWeight: 700, fontSize: '11px' }}>
                                            {fmtHours(dayTotal)}
                                        </EmptyDash>
                                    ) : (
                                        <EmptyDash>—</EmptyDash>
                                    )}
                                </DayTd>
                            );
                        })}
                        <TotalCell>{fmtHours(monthTotal) || '0'} h</TotalCell>
                    </TotalRow>
                </GridTbody>
            </GridTable>
        </GridScrollWrapper>
    );
};
