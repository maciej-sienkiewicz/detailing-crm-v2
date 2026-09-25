// src/modules/batch-orders/components/PeriodPicker.tsx
//
// Jeden okres dla całego ekranu. Strzałki przesuwają o miesiąc - to 90% użycia
// („rozliczam poprzedni miesiąc") - a etykieta otwiera panel z resztą: skróty,
// dowolny miesiąc z dwóch lat i zakres niestandardowy.

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    currentMonthPeriod, isWholeMonth, monthPeriod, parseIsoDate, periodTitle, shiftMonth,
    type Period,
} from '../utils/period';

const Wrap = styled.div`
    position: relative;
    display: inline-flex;
    max-width: 100%;
`;

const Stepper = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    width: 100%;
    padding: 3px;
    box-sizing: border-box;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
`;

const StepBtn = styled.button`
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: ${p => p.theme.radii.full};
    background: transparent;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    svg { width: 17px; height: 17px; }
    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
    @media (hover: none) and (pointer: coarse) { width: 44px; height: 42px; }
`;

const LabelBtn = styled.button<{ $open: boolean }>`
    flex: 1;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px;
    border: none;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.$open ? p.theme.colors.surfaceAlt : 'transparent'};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    white-space: nowrap;
    cursor: pointer;

    > span { overflow: hidden; text-overflow: ellipsis; }
    svg { width: 16px; height: 16px; flex-shrink: 0; }
    svg:first-child { color: #0369a1; }
    svg:last-child { color: ${p => p.theme.colors.textSecondary}; width: 14px; height: 14px; }
    &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
`;

const Panel = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
    width: 320px;
    max-width: calc(100vw - 32px);
    box-sizing: border-box;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
`;

const PresetRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const Chip = styled.button<{ $active?: boolean }>`
    height: 34px;
    padding: 0 12px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid ${p => p.$active ? '#38bdf8' : p.theme.colors.border};
    background: ${p => p.$active ? '#f0f9ff' : 'transparent'};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$active ? '#075985' : p.theme.colors.textSecondary};
    cursor: pointer;

    &:hover { border-color: #38bdf8; color: #075985; }
    @media (hover: none) and (pointer: coarse) { height: 40px; }
`;

const FieldLabel = styled.label`
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const Control = styled.select`
    height: 38px;
    padding: 0 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 14px;
    color: ${p => p.theme.colors.text};
`;

const DateInput = styled.input`
    min-width: 0;
    height: 38px;
    padding: 0 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 14px;
    color: ${p => p.theme.colors.text};
`;

const RangeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
`;

const Divider = styled.div`
    height: 1px;
    background: ${p => p.theme.colors.border};
`;

const RangeError = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.error};
`;

/* Tło i obwódka, bez wypełnienia: panel okresu jest drugorzędny wobec „Dodaj wpis"
   stojącego w tym samym oknie (CLAUDE.md §2). */
const ApplyBtn = styled.button`
    align-self: flex-end;
    height: 36px;
    padding: 0 16px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid #38bdf8;
    background: #f0f9ff;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #075985;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:hover:not(:disabled) { background: #e0f2fe; }
`;

const MONTH_LABELS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

function monthOptions(now: Date) {
    return Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return {
            value: `${d.getFullYear()}-${d.getMonth()}`,
            label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
            period: monthPeriod(d.getFullYear(), d.getMonth()),
        };
    });
}

interface Props {
    value: Period;
    onChange: (period: Period) => void;
}

export function PeriodPicker({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState(value.from);
    const [customTo, setCustomTo] = useState(value.to);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    function toggle() {
        // Zakres w panelu startuje od okresu, który jest właśnie na ekranie.
        if (!open) {
            setCustomFrom(value.from);
            setCustomTo(value.to);
        }
        setOpen(v => !v);
    }

    const now = new Date();
    const current = currentMonthPeriod(now);
    const previous = shiftMonth(current, -1);
    const options = monthOptions(now);
    const selectedMonth = isWholeMonth(value)
        ? `${parseIsoDate(value.from).getFullYear()}-${parseIsoDate(value.from).getMonth()}`
        : '';
    const rangeInvalid = !!customFrom && !!customTo && customFrom > customTo;

    function pick(period: Period) {
        onChange(period);
        setOpen(false);
    }

    return (
        <Wrap ref={wrapRef}>
            <Stepper>
                <StepBtn type="button" aria-label="Poprzedni miesiąc" onClick={() => onChange(shiftMonth(value, -1))}>
                    <ChevronLeft />
                </StepBtn>
                <LabelBtn
                    type="button"
                    $open={open}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={toggle}
                >
                    <CalendarDays />
                    <span>{periodTitle(value)}</span>
                    <ChevronDown />
                </LabelBtn>
                <StepBtn type="button" aria-label="Następny miesiąc" onClick={() => onChange(shiftMonth(value, 1))}>
                    <ChevronRight />
                </StepBtn>
            </Stepper>

            {open && (
                <Panel role="dialog" aria-label="Wybór okresu">
                    <PresetRow>
                        <Chip type="button" $active={value.from === current.from && value.to === current.to} onClick={() => pick(current)}>
                            Bieżący miesiąc
                        </Chip>
                        <Chip type="button" $active={value.from === previous.from && value.to === previous.to} onClick={() => pick(previous)}>
                            Poprzedni miesiąc
                        </Chip>
                    </PresetRow>

                    <FieldLabel>
                        Miesiąc
                        <Control
                            value={selectedMonth}
                            onChange={e => {
                                const opt = options.find(o => o.value === e.target.value);
                                if (opt) pick(opt.period);
                            }}
                        >
                            {!selectedMonth && <option value="">Zakres niestandardowy</option>}
                            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Control>
                    </FieldLabel>

                    <Divider />

                    <RangeGrid>
                        <FieldLabel>
                            Od
                            <DateInput type="date" value={customFrom} max={customTo || undefined} onChange={e => setCustomFrom(e.target.value)} />
                        </FieldLabel>
                        <FieldLabel>
                            Do
                            <DateInput type="date" value={customTo} min={customFrom || undefined} onChange={e => setCustomTo(e.target.value)} />
                        </FieldLabel>
                    </RangeGrid>
                    {rangeInvalid && <RangeError>Data „od" jest późniejsza niż „do".</RangeError>}
                    <ApplyBtn
                        type="button"
                        disabled={!customFrom || !customTo || rangeInvalid}
                        onClick={() => pick({ from: customFrom, to: customTo })}
                    >
                        Pokaż zakres
                    </ApplyBtn>
                </Panel>
            )}
        </Wrap>
    );
}
