// src/modules/calendar/components/QuickEventModal/RecurrenceSidePanel.tsx
//
// Panel boczny cykliczności dla QuickEventModal.
// Wysuwa się z prawej strony głównego modalu po kliknięciu kafla.

import styled, { keyframes, css } from 'styled-components';
import type { RecurrenceRuleRequest, DayOfWeek } from '@/modules/appointments/types';

// ─── Animations ───────────────────────────────────────────────────────────────

const slideIn = keyframes`
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
`;

// ─── Panel container ──────────────────────────────────────────────────────────

export const SidePanelWrapper = styled.div<{ $visible: boolean }>`
    width: ${p => p.$visible ? '300px' : '0'};
    overflow: hidden;
    transition: width 280ms cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
`;

export const SidePanelInner = styled.div`
    width: 300px;
    background: #0F172A;
    border-radius: 0 16px 16px 0;
    padding: 20px;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 18px;
    animation: ${slideIn} 240ms ease both;
`;

export const PanelTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #94A3B8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
        width: 14px;
        height: 14px;
        color: #7C3AED;
    }
`;

const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
`;

const TypeRow = styled.div`
    display: flex;
    gap: 6px;
`;

const TypeBtn = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 8px 0;
    border-radius: 8px;
    border: 1.5px solid ${p => p.$active ? '#7C3AED' : '#1E293B'};
    background: ${p => p.$active ? 'rgba(124, 58, 237, 0.15)' : '#1E293B'};
    color: ${p => p.$active ? '#A78BFA' : '#64748B'};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        border-color: #7C3AED;
        color: #A78BFA;
    }
`;

const DaysRow = styled.div`
    display: flex;
    gap: 5px;
`;

const DayPill = styled.button<{ $active: boolean }>`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1.5px solid ${p => p.$active ? '#7C3AED' : '#1E293B'};
    background: ${p => p.$active ? '#7C3AED' : '#1E293B'};
    color: ${p => p.$active ? '#fff' : '#475569'};
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms ease;
    flex-shrink: 0;

    &:hover {
        border-color: #7C3AED;
        color: ${p => p.$active ? '#fff' : '#A78BFA'};
    }
`;

const InlineRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const DarkInput = styled.input`
    background: #1E293B;
    border: 1.5px solid #334155;
    border-radius: 8px;
    color: #E2E8F0;
    font-size: 13px;
    padding: 7px 10px;
    outline: none;
    text-align: center;
    transition: border-color 140ms;

    &:focus { border-color: #7C3AED; }

    &[type="date"] {
        text-align: left;
        width: 100%;
        color-scheme: dark;
    }
`;

const DarkLabel = styled.span`
    font-size: 12px;
    color: #64748B;
    white-space: nowrap;
`;

const EndTypeCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const RadioRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
`;

const DarkRadio = styled.input.attrs({ type: 'radio' })`
    width: 14px;
    height: 14px;
    accent-color: #7C3AED;
    cursor: pointer;
    flex-shrink: 0;
`;

const RadioLabel = styled.span`
    font-size: 12px;
    color: #94A3B8;
`;

const InlineEndRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 22px;
    margin-top: 4px;
`;

const PanelDivider = styled.div`
    height: 1px;
    background: #1E293B;
`;

const PreviewBox = styled.div`
    background: #1E293B;
    border-radius: 8px;
    padding: 10px 12px;
`;

const PreviewLine = styled.div`
    font-size: 12px;
    color: #64748B;
    line-height: 1.6;

    strong {
        color: #E2E8F0;
        font-weight: 600;
    }
`;

const ValidationNote = styled.div`
    font-size: 11px;
    color: #EF4444;
    margin-top: 4px;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS: { key: DayOfWeek; label: string }[] = [
    { key: 'MONDAY',    label: 'Pn' },
    { key: 'TUESDAY',   label: 'Wt' },
    { key: 'WEDNESDAY', label: 'Śr' },
    { key: 'THURSDAY',  label: 'Cz' },
    { key: 'FRIDAY',    label: 'Pt' },
    { key: 'SATURDAY',  label: 'Sb' },
    { key: 'SUNDAY',    label: 'Nd' },
];

const DAY_INDEX: Record<DayOfWeek, number> = {
    MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
    FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
};

function formatDatePL(d: Date): string {
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function computePreview(rule: RecurrenceRuleRequest, startIso: string): { count: number; first: string; last: string } | null {
    if (!startIso) return null;
    const base = new Date(startIso.includes('T') ? startIso : `${startIso}T00:00`);
    if (isNaN(base.getTime())) return null;

    const dates: Date[] = [];
    const MAX = 104;
    const limit = rule.endType === 'COUNT' ? Math.min(rule.maxOccurrences ?? 1, MAX) : MAX;
    const endDate = rule.endType === 'DATE' && rule.endDate ? new Date(rule.endDate) : null;

    if (rule.type === 'WEEKLY') {
        if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return null;
        const interval = rule.intervalWeeks ?? 1;
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => DAY_INDEX[a] - DAY_INDEX[b]);
        const weekStart = new Date(base);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        let weekCursor = new Date(weekStart);

        while (dates.length < limit) {
            for (const day of sortedDays) {
                const offset = (DAY_INDEX[day] - weekCursor.getDay() + 7) % 7;
                const d = new Date(weekCursor);
                d.setDate(d.getDate() + offset);
                if (d >= base) {
                    if (endDate && d > endDate) break;
                    dates.push(new Date(d));
                    if (dates.length >= limit) break;
                }
            }
            weekCursor.setDate(weekCursor.getDate() + 7 * interval);
            if (endDate && weekCursor > endDate) break;
        }
    } else {
        const dom = rule.dayOfMonth ?? base.getDate();
        let y = base.getFullYear(), m = base.getMonth();
        while (dates.length < limit) {
            const d = new Date(y, m, Math.min(dom, 28));
            if (d >= base) {
                if (endDate && d > endDate) break;
                dates.push(d);
            }
            m++;
            if (m > 11) { m = 0; y++; }
        }
    }

    if (dates.length === 0) return null;
    return { count: dates.length, first: formatDatePL(dates[0]), last: formatDatePL(dates[dates.length - 1]) };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurrenceSidePanelProps {
    rule: RecurrenceRuleRequest;
    onChange: (r: RecurrenceRuleRequest) => void;
    startDateTime: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecurrenceSidePanel = ({ rule, onChange, startDateTime }: RecurrenceSidePanelProps) => {
    const update = (patch: Partial<RecurrenceRuleRequest>) => onChange({ ...rule, ...patch });

    const toggleDay = (day: DayOfWeek) => {
        const cur = rule.daysOfWeek ?? [];
        const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day];
        if (next.length > 0) update({ daysOfWeek: next });
    };

    const preview = computePreview(rule, startDateTime);

    const intervalLabel = () => {
        const n = rule.intervalWeeks ?? 1;
        return n === 1 ? 'tygodniu' : n < 5 ? 'tygodnie' : 'tygodni';
    };

    return (
        <>
            <PanelTitle>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Cykliczność
            </PanelTitle>

            {/* Typ */}
            <div>
                <SectionLabel>Typ powtarzania</SectionLabel>
                <TypeRow>
                    <TypeBtn
                        type="button"
                        $active={rule.type === 'WEEKLY'}
                        onClick={() => update({ type: 'WEEKLY', intervalWeeks: rule.intervalWeeks ?? 1, daysOfWeek: rule.daysOfWeek ?? ['MONDAY'], dayOfMonth: undefined })}
                    >
                        Co tydzień
                    </TypeBtn>
                    <TypeBtn
                        type="button"
                        $active={rule.type === 'MONTHLY'}
                        onClick={() => update({ type: 'MONTHLY', dayOfMonth: rule.dayOfMonth ?? 1, intervalWeeks: undefined, daysOfWeek: undefined })}
                    >
                        Co miesiąc
                    </TypeBtn>
                </TypeRow>
            </div>

            {/* WEEKLY */}
            {rule.type === 'WEEKLY' && (
                <>
                    <div>
                        <SectionLabel>Powtarzaj co</SectionLabel>
                        <InlineRow>
                            <DarkInput
                                type="number"
                                min={1}
                                max={52}
                                value={rule.intervalWeeks ?? 1}
                                onChange={e => update({ intervalWeeks: Math.max(1, Math.min(52, Number(e.target.value))) })}
                                style={{ width: '60px' }}
                            />
                            <DarkLabel>{intervalLabel()}</DarkLabel>
                        </InlineRow>
                    </div>
                    <div>
                        <SectionLabel>Dni tygodnia</SectionLabel>
                        <DaysRow>
                            {DAYS.map(d => (
                                <DayPill
                                    key={d.key}
                                    type="button"
                                    $active={(rule.daysOfWeek ?? []).includes(d.key)}
                                    onClick={() => toggleDay(d.key)}
                                >
                                    {d.label}
                                </DayPill>
                            ))}
                        </DaysRow>
                        {(!rule.daysOfWeek || rule.daysOfWeek.length === 0) && (
                            <ValidationNote>Wybierz co najmniej jeden dzień.</ValidationNote>
                        )}
                    </div>
                </>
            )}

            {/* MONTHLY */}
            {rule.type === 'MONTHLY' && (
                <div>
                    <SectionLabel>Dzień miesiąca</SectionLabel>
                    <InlineRow>
                        <DarkInput
                            type="number"
                            min={1}
                            max={28}
                            value={rule.dayOfMonth ?? 1}
                            onChange={e => update({ dayOfMonth: Math.max(1, Math.min(28, Number(e.target.value))) })}
                            style={{ width: '60px' }}
                        />
                        <DarkLabel>dzień (maks. 28)</DarkLabel>
                    </InlineRow>
                </div>
            )}

            <PanelDivider />

            {/* Koniec serii */}
            <div>
                <SectionLabel>Koniec serii</SectionLabel>
                <EndTypeCol>
                    <RadioRow>
                        <DarkRadio
                            name="qem-endType"
                            checked={rule.endType === 'COUNT'}
                            onChange={() => update({ endType: 'COUNT', maxOccurrences: rule.maxOccurrences ?? 12, endDate: undefined })}
                        />
                        <RadioLabel>Po N wizytach</RadioLabel>
                    </RadioRow>
                    {rule.endType === 'COUNT' && (
                        <InlineEndRow>
                            <DarkInput
                                type="number"
                                min={1}
                                max={104}
                                value={rule.maxOccurrences ?? 12}
                                onChange={e => update({ maxOccurrences: Math.max(1, Math.min(104, Number(e.target.value))) })}
                                style={{ width: '60px' }}
                            />
                            <DarkLabel>wizyt (max 104)</DarkLabel>
                        </InlineEndRow>
                    )}

                    <RadioRow>
                        <DarkRadio
                            name="qem-endType"
                            checked={rule.endType === 'DATE'}
                            onChange={() => update({ endType: 'DATE', endDate: rule.endDate ?? '', maxOccurrences: undefined })}
                        />
                        <RadioLabel>Do daty</RadioLabel>
                    </RadioRow>
                    {rule.endType === 'DATE' && (
                        <InlineEndRow>
                            <DarkInput
                                type="date"
                                value={rule.endDate ?? ''}
                                onChange={e => update({ endDate: e.target.value })}
                                style={{ width: '140px', textAlign: 'left' }}
                            />
                        </InlineEndRow>
                    )}

                    <RadioRow>
                        <DarkRadio
                            name="qem-endType"
                            checked={rule.endType === 'OPEN'}
                            onChange={() => update({ endType: 'OPEN', maxOccurrences: undefined, endDate: undefined })}
                        />
                        <RadioLabel>Bez końca (max 104)</RadioLabel>
                    </RadioRow>
                </EndTypeCol>
            </div>

            {/* Podgląd */}
            {preview && (
                <>
                    <PanelDivider />
                    <PreviewBox>
                        <PreviewLine>
                            Zostanie utworzonych <strong>{preview.count} {preview.count === 1 ? 'wizytę' : preview.count < 5 ? 'wizyty' : 'wizyt'}</strong>
                        </PreviewLine>
                        <PreviewLine>
                            Od <strong>{preview.first}</strong>
                            {preview.count > 1 && <> do <strong>{preview.last}</strong></>}
                        </PreviewLine>
                    </PreviewBox>
                </>
            )}
        </>
    );
};
