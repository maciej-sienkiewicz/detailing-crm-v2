/**
 * DayGrid — horizontally-scrollable timesheet grid for one month.
 *
 * Layout (sticky columns):
 *   [Label col | day-1 … day-N | Total col]
 *
 * Rows:
 *   • Header       — day number + short weekday name, coloured for weekends/holidays/today
 *   • Regular      — editable hour inputs (disabled on weekends/holidays or when period is read-only)
 *   • Benefit rows — one per active BenefitType, per-day editable inputs
 *   • Total        — sum of all rows per day
 */

import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
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
    BenefitLabelCell,
    RowRemoveBtn,
} from './styles';
import {
    toDateStr,
    isToday,
    isWeekendDay,
    dayNameShort,
    getDaysInMonth,
    BENEFIT_TYPE_LABELS,
} from './utils';
import { getPolishHolidays } from '../../utils/polishHolidays';
import { useSaveDailyHours, useAddWorkTimeBenefit, useDeleteWorkTimeEntry } from '../../hooks/useWorkTime';
import type { WorkTimeEntry, BenefitType } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: string;
    period: string;                    // YYYY-MM
    regularEntries: WorkTimeEntry[];   // REGULAR entries for this period
    benefitEntries: WorkTimeEntry[];   // non-REGULAR entries for this period
    activeBenefitTypes: BenefitType[]; // which benefit rows to show
    readOnly: boolean;                 // true when period is APPROVED
    onRemoveBenefitRow: (type: BenefitType) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRegularHoursMap(entries: WorkTimeEntry[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const e of entries) {
        map[e.date] = (map[e.date] ?? 0) + Number(e.effectiveHours);
    }
    return map;
}

/**
 * Builds a two-level map:  benefitType → dateStr → WorkTimeEntry[]
 * Used to look up existing entries when saving a benefit cell.
 */
function buildBenefitMap(entries: WorkTimeEntry[]): Map<string, Map<string, WorkTimeEntry[]>> {
    const map = new Map<string, Map<string, WorkTimeEntry[]>>();
    for (const e of entries) {
        if (!map.has(e.entryType)) map.set(e.entryType, new Map());
        const dateMap = map.get(e.entryType)!;
        if (!dateMap.has(e.date)) dateMap.set(e.date, []);
        dateMap.get(e.date)!.push(e);
    }
    return map;
}

function fmtHours(h: number): string {
    if (!h) return '';
    return h % 1 === 0 ? String(h) : h.toFixed(1);
}

function parseHoursInput(raw: string): number {
    const n = parseFloat(raw.replace(',', '.'));
    if (isNaN(n) || n < 0) return 0;
    return Math.min(n, 24);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_DELAY_MS = 800;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export const DayGrid = ({
    employeeId,
    period,
    regularEntries,
    benefitEntries,
    activeBenefitTypes,
    readOnly,
    onRemoveBenefitRow,
}: Props) => {
    const days = getDaysInMonth(period);
    const [year, month] = period.split('-').map(Number);
    const holidays = getPolishHolidays(year);
    const holidaysNext = month === 12 ? getPolishHolidays(year + 1) : new Set<string>();
    const allHolidays = new Set([...holidays, ...holidaysNext]);

    // ── Regular hours state ──────────────────────────────────────────────────

    const serverHoursMap = buildRegularHoursMap(regularEntries);

    const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const day of days) {
            const key = toDateStr(day);
            init[key] = fmtHours(serverHoursMap[key] ?? 0);
        }
        return init;
    });

    const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

    const regularTimerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const saveMutation = useSaveDailyHours(employeeId);

    // ── Benefit rows state ───────────────────────────────────────────────────

    const benefitMap = useMemo(() => buildBenefitMap(benefitEntries), [benefitEntries]);

    // "type:dateStr" → display string (user-typed or server value)
    const [benefitLocalValues, setBenefitLocalValues] = useState<Record<string, string>>({});
    const [benefitSaveStates, setBenefitSaveStates] = useState<Record<string, SaveState>>({});

    const benefitTimerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const addBenefitMutation = useAddWorkTimeBenefit(employeeId);
    const deleteMutation = useDeleteWorkTimeEntry(employeeId);

    // Stable refs so that useEffect closures always see the latest values
    const benefitMapRef = useRef(benefitMap);
    benefitMapRef.current = benefitMap;
    const daysRef = useRef(days);
    daysRef.current = days;

    // Initialise cell values for newly-added benefit types (or on first load).
    // Only fills in cells that haven't been touched by the user yet.
    useEffect(() => {
        setBenefitLocalValues(prev => {
            const next = { ...prev };
            let changed = false;
            for (const type of activeBenefitTypes) {
                for (const day of daysRef.current) {
                    const dk = toDateStr(day);
                    const cellKey = `${type}:${dk}`;
                    if (!(cellKey in next)) {
                        const existing = benefitMapRef.current.get(type)?.get(dk);
                        const total = (existing ?? []).reduce((s, e) => s + Number(e.effectiveHours), 0);
                        next[cellKey] = fmtHours(total);
                        changed = true;
                    }
                }
            }
            return changed ? next : prev;
        });
    }, [activeBenefitTypes]); // eslint-disable-line react-hooks/exhaustive-deps

    // Ref used to avoid overwriting cells that are actively being edited
    const activeCell = useRef<string | null>(null);

    // ── Regular save helpers ─────────────────────────────────────────────────

    const triggerRegularSave = useCallback(
        (dateKey: string, hours: number) => {
            clearTimeout(regularTimerRefs.current[dateKey]);
            setSaveStates(prev => ({ ...prev, [dateKey]: 'saving' }));
            regularTimerRefs.current[dateKey] = setTimeout(async () => {
                try {
                    await saveMutation.mutateAsync({ date: dateKey, hours });
                    setSaveStates(prev => ({ ...prev, [dateKey]: 'saved' }));
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

    const handleRegularChange = useCallback(
        (dateKey: string, raw: string) => {
            setLocalValues(prev => ({ ...prev, [dateKey]: raw }));
            triggerRegularSave(dateKey, parseHoursInput(raw));
        },
        [triggerRegularSave],
    );

    const handleRegularFocus = (dateKey: string) => { activeCell.current = dateKey; };
    const handleRegularBlur  = (dateKey: string) => {
        activeCell.current = null;
        setLocalValues(prev => ({
            ...prev,
            [dateKey]: fmtHours(parseHoursInput(prev[dateKey] ?? '')),
        }));
    };

    // ── Benefit save helpers ─────────────────────────────────────────────────

    const triggerBenefitSave = useCallback(
        (type: BenefitType, dateKey: string, hours: number) => {
            const cellKey = `${type}:${dateKey}`;
            clearTimeout(benefitTimerRefs.current[cellKey]);
            setBenefitSaveStates(prev => ({ ...prev, [cellKey]: 'saving' }));

            benefitTimerRefs.current[cellKey] = setTimeout(async () => {
                try {
                    // Delete existing PENDING entries for this date+type before (re-)creating
                    const existingPending = (benefitMapRef.current.get(type)?.get(dateKey) ?? [])
                        .filter(e => e.status === 'PENDING');
                    for (const entry of existingPending) {
                        await deleteMutation.mutateAsync(entry.id);
                    }
                    if (hours > 0) {
                        await addBenefitMutation.mutateAsync({
                            date: dateKey,
                            benefitType: type,
                            hours,
                        });
                    }
                    setBenefitSaveStates(prev => ({ ...prev, [cellKey]: 'saved' }));
                    setTimeout(() => {
                        setBenefitSaveStates(prev => {
                            const next = { ...prev };
                            if (next[cellKey] === 'saved') delete next[cellKey];
                            return next;
                        });
                    }, 2000);
                } catch {
                    setBenefitSaveStates(prev => ({ ...prev, [cellKey]: 'error' }));
                }
            }, SAVE_DELAY_MS);
        },
        [addBenefitMutation, deleteMutation],
    );

    const handleBenefitChange = useCallback(
        (type: BenefitType, dateKey: string, raw: string) => {
            const cellKey = `${type}:${dateKey}`;
            setBenefitLocalValues(prev => ({ ...prev, [cellKey]: raw }));
            triggerBenefitSave(type, dateKey, parseHoursInput(raw));
        },
        [triggerBenefitSave],
    );

    const handleBenefitFocus = (cellKey: string) => { activeCell.current = cellKey; };
    const handleBenefitBlur  = (type: BenefitType, dateKey: string) => {
        activeCell.current = null;
        const cellKey = `${type}:${dateKey}`;
        setBenefitLocalValues(prev => ({
            ...prev,
            [cellKey]: fmtHours(parseHoursInput(prev[cellKey] ?? '')),
        }));
    };

    // ── Totals ───────────────────────────────────────────────────────────────

    const monthRegularTotal = days.reduce(
        (acc, day) => acc + parseHoursInput(localValues[toDateStr(day)] ?? ''),
        0,
    );

    const grandTotalByDay = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const day of days) {
            const dk = toDateStr(day);
            let sum = parseHoursInput(localValues[dk] ?? '');
            for (const type of activeBenefitTypes) {
                sum += parseHoursInput(benefitLocalValues[`${type}:${dk}`] ?? '');
            }
            totals[dk] = sum;
        }
        return totals;
    }, [days, localValues, activeBenefitTypes, benefitLocalValues]);

    const grandMonthTotal = Object.values(grandTotalByDay).reduce((a, b) => a + b, 0);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <GridScrollWrapper>
            <GridTable role="grid" aria-label={`Siatka godzin – ${period}`}>

                {/* ── Header row ── */}
                <GridThead>
                    <tr>
                        <LabelTh>Typ</LabelTh>
                        {days.map(day => {
                            const key     = toDateStr(day);
                            const weekend = isWeekendDay(day);
                            const holiday = allHolidays.has(key);
                            const today   = isToday(day);
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

                <GridTbody>
                    {/* ── Regular hours row ── */}
                    <tr>
                        <LabelCell>Godziny regularne</LabelCell>
                        {days.map(day => {
                            const key      = toDateStr(day);
                            const weekend  = isWeekendDay(day);
                            const holiday  = allHolidays.has(key);
                            const today    = isToday(day);
                            const disabled = readOnly;
                            const state    = saveStates[key];
                            return (
                                <DayTd key={key} $weekend={weekend} $holiday={holiday} $today={today}>
                                    {disabled ? (
                                        <EmptyDash>—</EmptyDash>
                                    ) : (
                                        <HoursInput
                                            type="text"
                                            inputMode="decimal"
                                            aria-label={`Godziny regularne ${key}`}
                                            value={localValues[key] ?? ''}
                                            placeholder="0"
                                            disabled={disabled}
                                            $saving={state === 'saving'}
                                            $saved={state === 'saved'}
                                            onChange={e => handleRegularChange(key, e.target.value)}
                                            onFocus={() => handleRegularFocus(key)}
                                            onBlur={() => handleRegularBlur(key)}
                                        />
                                    )}
                                </DayTd>
                            );
                        })}
                        <TotalCell>{fmtHours(monthRegularTotal) || '0'} h</TotalCell>
                    </tr>

                    {/* ── Benefit rows ── */}
                    {activeBenefitTypes.map(type => {
                        const typeLabel  = BENEFIT_TYPE_LABELS[type] ?? type;
                        const typeTotal  = days.reduce((acc, day) => {
                            const ck = `${type}:${toDateStr(day)}`;
                            return acc + parseHoursInput(benefitLocalValues[ck] ?? '');
                        }, 0);
                        // Row can be removed only when there are no entries at all
                        // (approved entries can't be deleted here)
                        const hasAnyEntries = (benefitMap.get(type)?.size ?? 0) > 0;

                        return (
                            <tr key={type}>
                                <BenefitLabelCell title={typeLabel}>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {typeLabel}
                                    </span>
                                    {!readOnly && (
                                        <RowRemoveBtn
                                            onClick={() => onRemoveBenefitRow(type)}
                                            aria-label={`Usuń wiersz ${typeLabel}`}
                                            title={
                                                hasAnyEntries
                                                    ? 'Usuń najpierw wpisy tego rodzaju'
                                                    : 'Usuń wiersz'
                                            }
                                            disabled={hasAnyEntries}
                                        >
                                            ×
                                        </RowRemoveBtn>
                                    )}
                                </BenefitLabelCell>

                                {days.map(day => {
                                    const dk        = toDateStr(day);
                                    const cellKey   = `${type}:${dk}`;
                                    const weekend   = isWeekendDay(day);
                                    const holiday   = allHolidays.has(dk);
                                    const today     = isToday(day);
                                    const cellState = benefitSaveStates[cellKey];

                                    // Cells with an APPROVED entry are read-only
                                    const cellEntries    = benefitMap.get(type)?.get(dk) ?? [];
                                    const hasApproved    = cellEntries.some(e => e.status === 'APPROVED');
                                    const cellDisabled   = readOnly || hasApproved;
                                    const displayedHours = fmtHours(parseHoursInput(benefitLocalValues[cellKey] ?? ''));

                                    return (
                                        <DayTd key={dk} $weekend={weekend} $holiday={holiday} $today={today}>
                                            {cellDisabled ? (
                                                <EmptyDash
                                                    as="span"
                                                    style={displayedHours
                                                        ? { color: 'inherit', fontWeight: 600, fontSize: '11px' }
                                                        : undefined
                                                    }
                                                >
                                                    {displayedHours || '—'}
                                                </EmptyDash>
                                            ) : (
                                                <HoursInput
                                                    type="text"
                                                    inputMode="decimal"
                                                    aria-label={`${typeLabel} ${dk}`}
                                                    value={benefitLocalValues[cellKey] ?? ''}
                                                    placeholder="0"
                                                    $saving={cellState === 'saving'}
                                                    $saved={cellState === 'saved'}
                                                    onChange={e => handleBenefitChange(type, dk, e.target.value)}
                                                    onFocus={() => handleBenefitFocus(cellKey)}
                                                    onBlur={() => handleBenefitBlur(type, dk)}
                                                />
                                            )}
                                        </DayTd>
                                    );
                                })}

                                <TotalCell>{fmtHours(typeTotal) || '0'} h</TotalCell>
                            </tr>
                        );
                    })}

                    {/* ── Total row ── */}
                    <TotalRow>
                        <LabelCell as="td">Suma</LabelCell>
                        {days.map(day => {
                            const key     = toDateStr(day);
                            const weekend = isWeekendDay(day);
                            const holiday = allHolidays.has(key);
                            const today   = isToday(day);
                            const dayTotal = grandTotalByDay[key] ?? 0;
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
                        <TotalCell>{fmtHours(grandMonthTotal) || '0'} h</TotalCell>
                    </TotalRow>
                </GridTbody>
            </GridTable>
        </GridScrollWrapper>
    );
};
