// src/modules/appointments/components/RecurrenceSection.tsx
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Toggle } from '@/common/components/Toggle';
import type { RecurrenceRuleRequest, DayOfWeek } from '../types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.lg};
    margin-top: ${p => p.theme.spacing.lg};
`;

const FieldLabel = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: ${p => p.theme.spacing.sm};
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: ${p => p.theme.spacing.sm};
    flex-wrap: wrap;
`;

const NumberInput = styled.input`
    width: 72px;
    padding: 8px 10px;
    border: 1.5px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    outline: none;
    text-align: center;

    &:focus {
        border-color: ${p => p.theme.colors.primary};
    }
`;

const UnitText = styled.span`
    font-size: 14px;
    color: ${p => p.theme.colors.textMuted};
`;

const TypeToggleGroup = styled.div`
    display: flex;
    gap: ${p => p.theme.spacing.sm};
`;

const TypeBtn = styled.button<{ $active: boolean }>`
    padding: 8px 18px;
    border-radius: 8px;
    border: 1.5px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
    background: ${p => p.$active ? `${p.theme.colors.primary}15` : p.theme.colors.background};
    color: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
    }
`;

const DayPillGroup = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const DayPill = styled.button<{ $active: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1.5px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
    background: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.background};
    color: ${p => p.$active ? '#fff' : p.theme.colors.textMuted};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms ease;
    flex-shrink: 0;

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.$active ? '#fff' : p.theme.colors.primary};
    }
`;

const EndTypeGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const RadioRow = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
`;

const RadioInput = styled.input.attrs({ type: 'radio' })`
    width: 16px;
    height: 16px;
    accent-color: ${p => p.theme.colors.primary};
    cursor: pointer;
    flex-shrink: 0;
`;

const RadioLabel = styled.span`
    font-size: 14px;
    color: ${p => p.theme.colors.text};
`;

const InlineInputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 26px;
    margin-top: 4px;
`;

const DateInput = styled.input`
    padding: 7px 10px;
    border: 1.5px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    outline: none;

    &:focus {
        border-color: ${p => p.theme.colors.primary};
    }
`;

const PreviewBox = styled.div`
    background: ${p => p.theme.colors.surface ?? p.theme.colors.background};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    padding: 12px 14px;
`;

const PreviewLine = styled.div`
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.6;

    strong {
        color: ${p => p.theme.colors.text};
        font-weight: 600;
    }
`;

const Divider = styled.div`
    height: 1px;
    background: ${p => p.theme.colors.border};
`;

const ValidationMsg = styled.div`
    font-size: 12px;
    color: #DC2626;
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
    const limit = rule.endType === 'COUNT'
        ? Math.min(rule.maxOccurrences ?? 1, MAX)
        : MAX;

    const endDate = rule.endType === 'DATE' && rule.endDate
        ? new Date(rule.endDate)
        : null;

    if (rule.type === 'WEEKLY') {
        if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return null;
        const interval = rule.intervalWeeks ?? 1;
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => DAY_INDEX[a] - DAY_INDEX[b]);

        let cursor = new Date(base);
        const weekStart = new Date(base);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

        let weekCursor = new Date(weekStart);
        let weekCount = 0;

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
            weekCount++;
            weekCursor.setDate(weekCursor.getDate() + 7 * interval);
            if (endDate && weekCursor > endDate) break;
        }
    } else {
        // MONTHLY
        const dom = rule.dayOfMonth ?? base.getDate();
        let y = base.getFullYear();
        let m = base.getMonth();

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
    return {
        count: dates.length,
        first: formatDatePL(dates[0]),
        last: formatDatePL(dates[dates.length - 1]),
    };
}

function defaultRule(): RecurrenceRuleRequest {
    return {
        type: 'WEEKLY',
        intervalWeeks: 1,
        daysOfWeek: ['MONDAY'],
        endType: 'COUNT',
        maxOccurrences: 12,
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurrenceSectionProps {
    enabled: boolean;
    onEnabledChange: (v: boolean) => void;
    recurrence: RecurrenceRuleRequest | null;
    onRecurrenceChange: (r: RecurrenceRuleRequest | null) => void;
    startDateTime: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecurrenceSection = ({
    enabled,
    onEnabledChange,
    recurrence,
    onRecurrenceChange,
    startDateTime,
}: RecurrenceSectionProps) => {
    const rule = recurrence ?? defaultRule();

    const handleToggle = (v: boolean) => {
        onEnabledChange(v);
        if (v && !recurrence) onRecurrenceChange(defaultRule());
        if (!v) onRecurrenceChange(null);
    };

    const update = (patch: Partial<RecurrenceRuleRequest>) => {
        onRecurrenceChange({ ...rule, ...patch });
    };

    const toggleDay = (day: DayOfWeek) => {
        const current = rule.daysOfWeek ?? [];
        const next = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day];
        if (next.length > 0) update({ daysOfWeek: next });
    };

    const preview = enabled ? computePreview(rule, startDateTime) : null;

    const weeklyIntervalLabel = () => {
        const n = rule.intervalWeeks ?? 1;
        if (n === 1) return 'tygodniu';
        if (n < 5) return 'tygodnie';
        return 'tygodni';
    };

    return (
        <Card>
            <CardHeader>
                <HeaderRow>
                    <CardTitle>Cykliczność</CardTitle>
                    <Toggle
                        checked={enabled}
                        onChange={handleToggle}
                        label=""
                        size="sm"
                    />
                </HeaderRow>
            </CardHeader>

            {enabled && (
                <Body>
                    {/* Typ */}
                    <div>
                        <FieldLabel>Typ powtarzania</FieldLabel>
                        <TypeToggleGroup>
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
                        </TypeToggleGroup>
                    </div>

                    <Divider />

                    {/* WEEKLY config */}
                    {rule.type === 'WEEKLY' && (
                        <>
                            <div>
                                <FieldLabel>Powtarzaj co</FieldLabel>
                                <Row>
                                    <NumberInput
                                        type="number"
                                        min={1}
                                        max={52}
                                        value={rule.intervalWeeks ?? 1}
                                        onChange={e => update({ intervalWeeks: Math.max(1, Math.min(52, Number(e.target.value))) })}
                                    />
                                    <UnitText>{weeklyIntervalLabel()}</UnitText>
                                </Row>
                            </div>
                            <div>
                                <FieldLabel>Dni tygodnia</FieldLabel>
                                <DayPillGroup>
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
                                </DayPillGroup>
                                {(!rule.daysOfWeek || rule.daysOfWeek.length === 0) && (
                                    <ValidationMsg>Wybierz co najmniej jeden dzień tygodnia.</ValidationMsg>
                                )}
                            </div>
                        </>
                    )}

                    {/* MONTHLY config */}
                    {rule.type === 'MONTHLY' && (
                        <div>
                            <FieldLabel>Dzień miesiąca</FieldLabel>
                            <Row>
                                <NumberInput
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={rule.dayOfMonth ?? 1}
                                    onChange={e => update({ dayOfMonth: Math.max(1, Math.min(28, Number(e.target.value))) })}
                                />
                                <UnitText>dzień miesiąca (maks. 28)</UnitText>
                            </Row>
                        </div>
                    )}

                    <Divider />

                    {/* Koniec serii */}
                    <div>
                        <FieldLabel>Koniec serii</FieldLabel>
                        <EndTypeGroup>
                            <RadioRow>
                                <RadioInput
                                    name="endType"
                                    checked={rule.endType === 'COUNT'}
                                    onChange={() => update({ endType: 'COUNT', maxOccurrences: rule.maxOccurrences ?? 12, endDate: undefined })}
                                />
                                <RadioLabel>Po określonej liczbie wizyt</RadioLabel>
                            </RadioRow>
                            {rule.endType === 'COUNT' && (
                                <InlineInputRow>
                                    <NumberInput
                                        type="number"
                                        min={1}
                                        max={104}
                                        value={rule.maxOccurrences ?? 12}
                                        onChange={e => update({ maxOccurrences: Math.max(1, Math.min(104, Number(e.target.value))) })}
                                        style={{ width: '80px' }}
                                    />
                                    <UnitText>wizyt (maks. 104)</UnitText>
                                </InlineInputRow>
                            )}

                            <RadioRow>
                                <RadioInput
                                    name="endType"
                                    checked={rule.endType === 'DATE'}
                                    onChange={() => update({ endType: 'DATE', endDate: rule.endDate ?? '', maxOccurrences: undefined })}
                                />
                                <RadioLabel>Do określonej daty</RadioLabel>
                            </RadioRow>
                            {rule.endType === 'DATE' && (
                                <InlineInputRow>
                                    <DateInput
                                        type="date"
                                        value={rule.endDate ?? ''}
                                        onChange={e => update({ endDate: e.target.value })}
                                    />
                                </InlineInputRow>
                            )}

                            <RadioRow>
                                <RadioInput
                                    name="endType"
                                    checked={rule.endType === 'OPEN'}
                                    onChange={() => update({ endType: 'OPEN', maxOccurrences: undefined, endDate: undefined })}
                                />
                                <RadioLabel>Bez końca (max. 104 wizyt)</RadioLabel>
                            </RadioRow>
                        </EndTypeGroup>
                    </div>

                    {/* Podgląd */}
                    {preview && (
                        <>
                            <Divider />
                            <PreviewBox>
                                <PreviewLine>
                                    Zostanie utworzonych <strong>{preview.count} {preview.count === 1 ? 'wizytę' : preview.count < 5 ? 'wizyty' : 'wizyt'}</strong>
                                </PreviewLine>
                                <PreviewLine>
                                    Pierwsza: <strong>{preview.first}</strong>
                                    {preview.count > 1 && <> · Ostatnia: <strong>{preview.last}</strong></>}
                                </PreviewLine>
                            </PreviewBox>
                        </>
                    )}
                </Body>
            )}
        </Card>
    );
};
