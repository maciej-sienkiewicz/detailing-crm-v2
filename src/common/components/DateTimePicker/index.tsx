import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

// ---- POLISH LOCALE ----
const WEEK_DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const MONTHS_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const MINUTE_STEPS = [0, 15, 30, 45];

// ---- HELPERS ----
function padTwo(n: number | string) {
    return String(n).padStart(2, '0');
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Monday, ..., 6=Sunday
function getFirstWeekDay(year: number, month: number) {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
}

function snapToStep(minute: number): number {
    return MINUTE_STEPS.reduce((prev, curr) =>
        Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev
    );
}

function getNearestUpcomingSlot(): { hour: number; minute: number } {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const nextStep = MINUTE_STEPS.find(s => s >= m);
    if (nextStep !== undefined) return { hour: h, minute: nextStep };
    return { hour: (h + 1) % 24, minute: 0 };
}

function formatDisplay(value: string, showTime: boolean) {
    if (!value) return '';
    const [datePart, timePart] = value.split('T');
    if (!datePart) return '';
    const parts = datePart.split('-');
    if (parts.length < 3) return '';
    const [y, m, d] = parts;
    const dateStr = `${d}.${m}.${y}`;
    if (showTime && timePart) {
        const [h, min] = timePart.split(':');
        return `${dateStr},  ${h}:${min}`;
    }
    return dateStr;
}

interface Parsed {
    year: number | null;
    month: number | null; // 0-indexed
    day: number | null;
    hour: number | null;
    minute: number | null;
}

function parseValue(value: string): Parsed {
    if (!value) return { year: null, month: null, day: null, hour: null, minute: null };
    const [datePart, timePart] = value.split('T');
    const dp = (datePart || '').split('-').map(Number);
    const year = dp[0] || null;
    const month = dp[1] ? dp[1] - 1 : null;
    const day = dp[2] || null;
    let hour: number | null = null;
    let minute: number | null = null;
    if (timePart) {
        const tp = timePart.split(':');
        hour = tp[0] !== undefined ? parseInt(tp[0], 10) : null;
        minute = tp[1] !== undefined ? parseInt(tp[1], 10) : null;
    }
    return { year, month, day, hour, minute };
}

/** `YYYY-MM-DD` for a calendar day; sorts chronologically as a plain string. */
function toDateKey(year: number, month: number, day: number) {
    return `${year}-${padTwo(month + 1)}-${padTwo(day)}`;
}

function dateKeyOf(value: string): string | null {
    const p = parseValue(value);
    return p.year !== null && p.month !== null && p.day !== null ? toDateKey(p.year, p.month, p.day) : null;
}

function shiftMonth(year: number, month: number, offset: -1 | 0 | 1): { year: number; month: number } {
    if (offset === -1) return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
    if (offset === 1) return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    return { year, month };
}

interface TimeOfDay {
    hour: number;
    minute: number;
}

function timeOf(value: string, fallback: TimeOfDay): TimeOfDay {
    const p = parseValue(value);
    return {
        hour: p.hour !== null ? p.hour : fallback.hour,
        minute: p.minute !== null ? snapToStep(p.minute) : fallback.minute,
    };
}

function hourLater(time: TimeOfDay): TimeOfDay {
    return { hour: (time.hour + 1) % 24, minute: time.minute };
}

function buildValue(dateKey: string, time: TimeOfDay | null): string {
    return time ? `${dateKey}T${padTwo(time.hour)}:${padTwo(time.minute)}` : dateKey;
}

/** Same format as [value], one hour later; rolls over midnight like the callers' Date arithmetic. */
function plusOneHour(value: string): string {
    const p = parseValue(value);
    if (p.year === null || p.month === null || p.day === null) return value;
    const d = new Date(p.year, p.month, p.day, p.hour ?? 0, (p.minute ?? 0) + 60);
    return buildValue(toDateKey(d.getFullYear(), d.getMonth(), d.getDate()), { hour: d.getHours(), minute: d.getMinutes() });
}

// ---- STYLED COMPONENTS ----
const Trigger = styled.button<{ $accentColor?: string; $hasError?: boolean; $hasValue?: boolean }>`
    width: 100%;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 12px;
    font-size: 15px;
    font-weight: 400;
    color: ${props => props.$hasValue ? '#0f172a' : '#94a3b8'};
    text-align: left;
    cursor: pointer;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease;
    font-family: inherit;

    &:hover:not(:focus) { border-color: #cbd5e1; }

    &:focus {
        border-color: ${props =>
            props.$hasError ? '#ef4444' : (props.$accentColor ?? '#0ea5e9')};
        box-shadow: 0 0 0 3px ${props =>
            props.$hasError ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }
`;

/* Współrzędne i widoczność nadaje usePickerDropdown wprost na elemencie, po zmierzeniu go. */
const DropdownFixed = styled.div`
    position: fixed;
    top: auto;
    bottom: auto;
    left: 0;
    z-index: 9999;
    background: ${props => props.theme.colors.surface};
    border: 1.5px solid #e2e8f0;
    border-radius: 16px;
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.03),
        0 8px 24px -4px rgba(0,0,0,0.12);
    display: flex;
    overflow: hidden;
    visibility: hidden;
`;

const CalendarSection = styled.div`
    padding: 14px;
    min-width: 232px;
`;

const NavRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
`;

const NavBtn = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 1;
    color: ${props => props.theme.colors.textSecondary};
    border-radius: ${props => props.theme.radii.md};
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.surfaceAlt};
        color: ${props => props.theme.colors.text};
    }
`;

const MonthYearLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
`;

/*
 * Kolumny 34 px bez odstępu: pas zakresu (DayWrap) ma być ciągły między dniami,
 * a kółko dnia (32 px) zachowuje dotychczasowy rytm 2 px między kolumnami.
 */
const CalGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 34px);
    row-gap: 2px;
    column-gap: 0;
`;

const DayHeader = styled.div`
    text-align: center;
    font-size: 11px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    padding: 4px 0 6px;
`;

type RangeBand = 'none' | 'start' | 'middle' | 'end';

const DayWrap = styled.div<{ $band: RangeBand; $accentColor?: string }>`
    width: 34px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => {
        if (props.$band === 'none') return 'transparent';
        const tint = `color-mix(in srgb, ${props.$accentColor || props.theme.colors.primary} 18%, transparent)`;
        if (props.$band === 'start') return `linear-gradient(to right, transparent 50%, ${tint} 50%)`;
        if (props.$band === 'end') return `linear-gradient(to right, ${tint} 50%, transparent 50%)`;
        return tint;
    }};
`;

const DayCell = styled.button<{
    $isCurrent: boolean;
    $isSelected: boolean;
    $isToday: boolean;
    $accentColor?: string;
}>`
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    font-size: ${props => props.theme.fontSizes.sm};
    cursor: pointer;
    background: ${props =>
        props.$isSelected ? props.$accentColor || props.theme.colors.primary : 'transparent'};
    color: ${props => {
        if (props.$isSelected) return 'white';
        if (!props.$isCurrent) return props.theme.colors.textMuted;
        if (props.$isToday) return props.$accentColor || props.theme.colors.primary;
        return props.theme.colors.text;
    }};
    font-weight: ${props =>
        props.$isSelected || props.$isToday
            ? props.theme.fontWeights.semibold
            : props.theme.fontWeights.normal};
    transition: background ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props =>
            props.$isSelected
                ? props.$accentColor || props.theme.colors.primary
                : props.theme.colors.surfaceAlt};
    }
`;

// ---- TIME SECTION STYLES ----
const TimeSection = styled.div`
    width: 130px;
    border-left: 1px solid ${props => props.theme.colors.border};
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    justify-content: center;
`;

const TimeLabel = styled.div`
    font-size: 10px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    align-self: flex-start;
`;

const AllDayNote = styled.div`
    font-size: 12px;
    color: ${props => props.theme.colors.textMuted};
    text-align: center;
`;

const HourSpinner = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
`;

const SpinBtn = styled.button`
    background: none;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    width: 40px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${props => props.theme.colors.textSecondary};
    font-size: 12px;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.surfaceAlt};
        border-color: ${props => props.theme.colors.textMuted};
        color: ${props => props.theme.colors.text};
    }
`;

const HourDisplay = styled.div<{ $accentColor?: string }>`
    width: 40px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    font-size: 18px;
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    font-variant-numeric: tabular-nums;
    cursor: default;
    user-select: none;
`;

const Divider = styled.div`
    width: 100%;
    height: 1px;
    background: ${props => props.theme.colors.border};
    margin: 2px 0;
`;

const MinuteGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    width: 100%;
`;

const MinuteBtn = styled.button<{ $active: boolean; $accentColor?: string }>`
    padding: 6px 0;
    border-radius: ${props => props.theme.radii.md};
    font-size: 13px;
    font-weight: ${props => props.$active
        ? props.theme.fontWeights.semibold
        : props.theme.fontWeights.normal};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    background: ${props => props.$active
        ? (props.$accentColor || props.theme.colors.primary)
        : props.theme.colors.surfaceAlt};
    color: ${props => props.$active ? '#fff' : props.theme.colors.text};
    border: 1.5px solid ${props => props.$active
        ? (props.$accentColor || props.theme.colors.primary)
        : 'transparent'};

    &:hover {
        background: ${props => props.$active
            ? (props.$accentColor || props.theme.colors.primary)
            : props.theme.colors.border};
    }
`;

// ---- RANGE PICKER STYLES ----
const RangeLayout = styled.div`
    display: flex;
    flex-direction: column;
`;

const PickerRow = styled.div`
    display: flex;
`;

const RangeHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 14px 0;
`;

const Segment = styled.button<{ $active: boolean; $accentColor?: string }>`
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1.5px solid ${props => props.$active
        ? (props.$accentColor || props.theme.colors.primary)
        : props.theme.colors.border};
    background: ${props => props.$active
        ? `color-mix(in srgb, ${props.$accentColor || props.theme.colors.primary} 8%, transparent)`
        : props.theme.colors.surface};
    cursor: pointer;
    font-family: inherit;
    transition: border-color ${props => props.theme.transitions.fast};
`;

const SegmentLabel = styled.span`
    display: block;
    font-size: 10px;
    font-weight: ${props => props.theme.fontWeights.medium};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${props => props.theme.colors.textMuted};
`;

const SegmentValue = styled.span<{ $empty: boolean }>`
    display: block;
    font-size: 13px;
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.$empty ? props.theme.colors.textMuted : props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
`;

const SegmentArrow = styled.span`
    color: ${props => props.theme.colors.textMuted};
    font-size: 16px;
    line-height: 1;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px 12px;
`;

const FooterHint = styled.span`
    font-size: 12px;
    color: ${props => props.theme.colors.textSecondary};
`;

const DoneBtn = styled.button<{ $accentColor?: string }>`
    padding: 7px 16px;
    border: none;
    border-radius: 10px;
    background: ${props => props.$accentColor || props.theme.colors.primary};
    color: #fff;
    font-size: 13px;
    font-weight: ${props => props.theme.fontWeights.semibold};
    font-family: inherit;
    cursor: pointer;
    transition: filter ${props => props.theme.transitions.fast};

    &:hover { filter: brightness(0.95); }
`;

// ---- SHARED DROPDOWN BEHAVIOUR ----
/**
 * Otwieranie, pozycjonowanie w porcie widoku i zamykanie kliknięciem poza
 * oknem lub klawiszem Escape. Wspólne dla obu pickerów.
 */
function usePickerDropdown(onFocus?: () => void, onBlur?: () => void) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => {
        setIsOpen(false);
        onBlur?.();
    }, [onBlur]);

    const toggle = () => {
        if (isOpen) {
            close();
        } else {
            setIsOpen(true);
            onFocus?.();
        }
    };

    // Okno pod (albo nad) przyciskiem, docięte do portu widoku. Współrzędne idą
    // wprost na element: montuje się ukryty i pokazuje dopiero po zmierzeniu, więc
    // nie ma klatki w rogu ekranu ani dodatkowej rundy stanu.
    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        const drop = dropdownRef.current;
        if (!trigger || !drop) return;
        const rect = trigger.getBoundingClientRect();
        const vvHeight = window.visualViewport?.height ?? window.innerHeight;
        let left = rect.left;
        const maxLeft = window.innerWidth - drop.offsetWidth - 8;
        if (left > maxLeft) left = Math.max(8, maxLeft);
        const dropH = drop.offsetHeight || 320;
        const spaceBelow = vvHeight - rect.bottom - 4;
        const spaceAbove = rect.top - 4;
        if (spaceBelow < dropH && spaceAbove > spaceBelow) {
            drop.style.top = 'auto';
            drop.style.bottom = `${vvHeight - rect.top + 4}px`;
        } else {
            drop.style.top = `${rect.bottom + 4}px`;
            drop.style.bottom = 'auto';
        }
        drop.style.left = `${left}px`;
        drop.style.visibility = 'visible';
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        window.visualViewport?.addEventListener('resize', updatePosition);
        window.visualViewport?.addEventListener('scroll', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            window.visualViewport?.removeEventListener('resize', updatePosition);
            window.visualViewport?.removeEventListener('scroll', updatePosition);
        };
    }, [isOpen, updatePosition]);

    // Close on outside click or Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleMouse = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return;
            close();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('mousedown', handleMouse);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleMouse);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, close]);

    return { isOpen, toggle, close, triggerRef, dropdownRef };
}

// ---- CALENDAR MONTH ----
interface CalendarMonthProps {
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    accentColor?: string;
    /** Dni rysowane jako wypełnione kółka (klucze `YYYY-MM-DD`). */
    selectedKeys: string[];
    /** Pas zakresu między końcami, włącznie; tylko gdy oba końce są znane i początek jest przed końcem. */
    rangeStartKey?: string | null;
    rangeEndKey?: string | null;
    onDayClick: (year: number, month: number, day: number) => void;
}

const CalendarMonth: React.FC<CalendarMonthProps> = ({
    viewYear, viewMonth, onPrevMonth, onNextMonth, accentColor,
    selectedKeys, rangeStartKey, rangeEndKey, onDayClick,
}) => {
    const today = new Date();
    const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const hasBand = !!rangeStartKey && !!rangeEndKey && rangeStartKey < rangeEndKey;

    const firstWeekDay = getFirstWeekDay(viewYear, viewMonth);
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);

    type Cell = { day: number; isCurrent: boolean; monthOffset: -1 | 0 | 1 };
    const cells: Cell[] = [];
    for (let i = firstWeekDay - 1; i >= 0; i--) {
        cells.push({ day: prevMonthDays - i, isCurrent: false, monthOffset: -1 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, isCurrent: true, monthOffset: 0 });
    }
    while (cells.length % 7 !== 0 || cells.length < 35) {
        cells.push({ day: cells.length - daysInMonth - firstWeekDay + 1, isCurrent: false, monthOffset: 1 });
    }

    const bandFor = (key: string): RangeBand => {
        if (!hasBand) return 'none';
        if (key === rangeStartKey) return 'start';
        if (key === rangeEndKey) return 'end';
        return key > rangeStartKey! && key < rangeEndKey! ? 'middle' : 'none';
    };

    return (
        <CalendarSection>
            <NavRow>
                <NavBtn type="button" onClick={onPrevMonth} aria-label="Poprzedni miesiąc">‹</NavBtn>
                <MonthYearLabel>{MONTHS_PL[viewMonth]} {viewYear}</MonthYearLabel>
                <NavBtn type="button" onClick={onNextMonth} aria-label="Następny miesiąc">›</NavBtn>
            </NavRow>
            <CalGrid>
                {WEEK_DAYS.map(d => <DayHeader key={d}>{d}</DayHeader>)}
                {cells.map((cell, idx) => {
                    const { year, month } = shiftMonth(viewYear, viewMonth, cell.monthOffset);
                    const key = toDateKey(year, month, cell.day);
                    const band = bandFor(key);
                    return (
                        <DayWrap
                            key={idx}
                            $band={band}
                            $accentColor={accentColor}
                            data-range={band === 'none' ? undefined : band}
                        >
                            <DayCell
                                type="button"
                                $isCurrent={cell.isCurrent}
                                $isSelected={selectedKeys.includes(key)}
                                $isToday={key === todayKey}
                                $accentColor={accentColor}
                                aria-pressed={selectedKeys.includes(key)}
                                onClick={() => onDayClick(year, month, cell.day)}
                            >
                                {cell.day}
                            </DayCell>
                        </DayWrap>
                    );
                })}
            </CalGrid>
        </CalendarSection>
    );
};

// ---- TIME CONTROLS ----
interface TimeControlsProps {
    hour: number;
    minute: number;
    accentColor?: string;
    caption?: string;
    onHourDelta: (delta: number) => void;
    onMinuteSelect: (minute: number) => void;
}

const TimeControls: React.FC<TimeControlsProps> = ({ hour, minute, accentColor, caption, onHourDelta, onMinuteSelect }) => (
    <TimeSection>
        <TimeLabel>{caption ?? 'Godzina'}</TimeLabel>
        <HourSpinner>
            <SpinBtn type="button" onClick={() => onHourDelta(1)} aria-label="Godzina do przodu">▲</SpinBtn>
            <HourDisplay $accentColor={accentColor}>
                {padTwo(hour)}
            </HourDisplay>
            <SpinBtn type="button" onClick={() => onHourDelta(-1)} aria-label="Godzina do tyłu">▼</SpinBtn>
        </HourSpinner>

        <Divider />

        <TimeLabel>Minuty</TimeLabel>
        <MinuteGrid>
            {MINUTE_STEPS.map(step => (
                <MinuteBtn
                    key={step}
                    type="button"
                    $active={minute === step}
                    $accentColor={accentColor}
                    onClick={() => onMinuteSelect(step)}
                >
                    :{padTwo(step)}
                </MinuteBtn>
            ))}
        </MinuteGrid>
    </TimeSection>
);

// ---- SINGLE DATE PICKER ----
export interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    showTime?: boolean;
    placeholder?: string;
    accentColor?: string;
    hasError?: boolean;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    onFocus?: () => void;
    onBlur?: () => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
    value,
    onChange,
    showTime = true,
    placeholder = 'Wybierz datę',
    accentColor,
    hasError,
    containerRef: externalContainerRef,
    onFocus,
    onBlur,
}) => {
    const { isOpen, toggle, close, triggerRef, dropdownRef } = usePickerDropdown(onFocus, onBlur);
    const internalContainerRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const parsed = parseValue(value);

    const [viewYear, setViewYear] = useState(() => parsed.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => parsed.month ?? today.getMonth());

    // Godzina pochodzi z wartości pola; własny stan trzyma tylko wybór sprzed
    // kliknięcia dnia (najbliższy kwadrans), więc nic nie trzeba synchronizować.
    const [pendingTime, setPendingTime] = useState<TimeOfDay>(getNearestUpcomingSlot);
    const time = timeOf(value, pendingTime);
    const selectedKey = dateKeyOf(value);

    const buildIso = (key: string, t: TimeOfDay) => buildValue(key, showTime ? t : null);

    const handleTriggerClick = () => {
        if (!isOpen && parsed.year !== null && parsed.month !== null) {
            setViewYear(parsed.year);
            setViewMonth(parsed.month);
        }
        toggle();
    };

    const handleDayClick = (year: number, month: number, day: number) => {
        setViewYear(year);
        setViewMonth(month);
        onChange(buildIso(toDateKey(year, month, day), time));
        close();
    };

    const changeTime = (next: TimeOfDay) => {
        setPendingTime(next);
        if (selectedKey) onChange(buildIso(selectedKey, next));
    };

    const handleHourChange = (delta: number) =>
        changeTime({ hour: (time.hour + delta + 24) % 24, minute: time.minute });

    const handleMinuteClick = (minute: number) =>
        changeTime({ hour: time.hour, minute });

    const handlePrevMonth = () => {
        const next = shiftMonth(viewYear, viewMonth, -1);
        setViewYear(next.year); setViewMonth(next.month);
    };

    const handleNextMonth = () => {
        const next = shiftMonth(viewYear, viewMonth, 1);
        setViewYear(next.year); setViewMonth(next.month);
    };

    const displayValue = formatDisplay(value, showTime);
    const wrapperRef = externalContainerRef ?? internalContainerRef;

    return (
        <div ref={wrapperRef as React.RefObject<HTMLDivElement>} style={{ position: 'relative', width: '100%' }}>
            <Trigger
                ref={triggerRef}
                type="button"
                $accentColor={accentColor}
                $hasError={hasError}
                $hasValue={!!displayValue}
                onClick={handleTriggerClick}
            >
                {displayValue || placeholder}
            </Trigger>

            {isOpen && createPortal(
                <DropdownFixed
                    ref={dropdownRef}
                >
                    <CalendarMonth
                        viewYear={viewYear}
                        viewMonth={viewMonth}
                        onPrevMonth={handlePrevMonth}
                        onNextMonth={handleNextMonth}
                        accentColor={accentColor}
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        onDayClick={handleDayClick}
                    />

                    {showTime && (
                        <TimeControls
                            hour={time.hour}
                            minute={time.minute}
                            accentColor={accentColor}
                            onHourDelta={handleHourChange}
                            onMinuteSelect={handleMinuteClick}
                        />
                    )}
                </DropdownFixed>,
                document.body
            )}
        </div>
    );
};

// ---- DATE RANGE PICKER ----
export type DateRangeRole = 'start' | 'end';

export interface DateRangePickerProps {
    /** Który koniec pary pokazuje to pole i który jest aktywny zaraz po otwarciu. */
    role: DateRangeRole;
    start: string;
    end: string;
    onStartChange: (value: string) => void;
    onEndChange: (value: string) => void;
    /** Godzina przy początku (i przy końcu, chyba że [endHasTime] mówi inaczej). */
    showTime?: boolean;
    /** `false`, gdy koniec jest całym dniem (emitowany jako sama data), a początek ma godzinę. */
    endHasTime?: boolean;
    placeholder?: string;
    accentColor?: string;
    hasError?: boolean;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    onFocus?: () => void;
    onBlur?: () => void;
}

/**
 * Para pól „od” i „do” z jednym kalendarzem. Pierwsze kliknięcie w dzień ustawia
 * początek i nie zamyka okna, drugie ustawia koniec; wybrany zakres jest
 * podświetlony pasem między końcami. Okno zamyka przycisk „Gotowe” (albo
 * kliknięcie poza nim lub Escape). Każde pole pary renderuje ten komponent ze
 * swoją rolą, więc z obu stron otwiera się ten sam kalendarz.
 *
 * Zakres nigdy nie „odwraca się”: przesunięcie początku za koniec przesuwa też
 * koniec, a dzień kliknięty przed początkiem podczas wyboru końca staje się
 * nowym początkiem. Godzina końca wcześniejsza niż początku tego samego dnia
 * pozostaje do sprawdzenia wywołującemu, tak jak w pojedynczym pickerze.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    role,
    start,
    end,
    onStartChange,
    onEndChange,
    showTime = true,
    endHasTime: endHasTimeProp,
    placeholder = 'Wybierz datę',
    accentColor,
    hasError,
    containerRef: externalContainerRef,
    onFocus,
    onBlur,
}) => {
    const startHasTime = showTime;
    const endHasTime = endHasTimeProp ?? showTime;

    const { isOpen, toggle, close, triggerRef, dropdownRef } = usePickerDropdown(onFocus, onBlur);
    const internalContainerRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<DateRangeRole>(role);

    const today = new Date();
    const anchor = parseValue(role === 'end' && end ? end : (start || end));
    const [viewYear, setViewYear] = useState(() => anchor.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => anchor.month ?? today.getMonth());

    // Godziny pochodzą z wartości pól; własny stan trzyma tylko wybór sprzed
    // kliknięcia dnia (najbliższy kwadrans i godzina później dla końca).
    const [pendingStartTime, setPendingStartTime] = useState<TimeOfDay>(getNearestUpcomingSlot);
    const [pendingEndTime, setPendingEndTime] = useState<TimeOfDay>(() => hourLater(timeOf(start, getNearestUpcomingSlot())));
    const startTime = timeOf(start, pendingStartTime);
    const endTime = timeOf(end, pendingEndTime);

    const startKey = dateKeyOf(start);
    const endKey = dateKeyOf(end);

    const valueFor = (key: string, side: DateRangeRole) =>
        side === 'start'
            ? buildValue(key, startHasTime ? startTime : null)
            : buildValue(key, endHasTime ? endTime : null);

    /** Koniec wcześniejszy niż początek: tego samego dnia liczy się godzina, inaczej sam dzień. */
    const endTooEarly = (startValue: string, endValue: string) => {
        const s = dateKeyOf(startValue);
        const e = dateKeyOf(endValue);
        if (!s || !e) return false;
        if (s !== e) return e < s;
        return startHasTime && endHasTime && endValue <= startValue;
    };

    /** Koniec, który nie zostaje w tyle za nowym początkiem: ten sam dzień z godziną końca albo godzinę później. */
    const endFollowing = (newStart: string) => {
        const key = dateKeyOf(newStart)!;
        if (!endHasTime) return key;
        const candidate = buildValue(key, endTime);
        return startHasTime && candidate <= newStart ? plusOneHour(newStart) : candidate;
    };

    const changeStart = (newStart: string) => {
        onStartChange(newStart);
        if (end && endTooEarly(newStart, end)) onEndChange(endFollowing(newStart));
    };

    const handleDayClick = (year: number, month: number, day: number) => {
        setViewYear(year);
        setViewMonth(month);
        const key = toDateKey(year, month, day);

        if (active === 'start') {
            changeStart(valueFor(key, 'start'));
            setActive('end');
            return;
        }

        if (startKey && key < startKey) {
            // Dzień przed początkiem podczas wyboru końca: to jest nowy początek, koniec zostaje.
            onStartChange(valueFor(key, 'start'));
            return;
        }
        let newEnd = valueFor(key, 'end');
        if (start && endTooEarly(start, newEnd)) newEnd = endFollowing(start);
        onEndChange(newEnd);
    };

    const changeTime = (next: TimeOfDay) => {
        if (active === 'start') {
            setPendingStartTime(next);
            if (startKey) changeStart(buildValue(startKey, next));
        } else {
            setPendingEndTime(next);
            if (endKey) onEndChange(buildValue(endKey, next));
        }
    };

    const activeTime = active === 'start' ? startTime : endTime;
    const activeHasTime = active === 'start' ? startHasTime : endHasTime;

    const handleHourDelta = (delta: number) =>
        changeTime({ hour: (activeTime.hour + delta + 24) % 24, minute: activeTime.minute });

    const handleMinuteSelect = (minute: number) =>
        changeTime({ hour: activeTime.hour, minute });

    const handlePrevMonth = () => {
        const next = shiftMonth(viewYear, viewMonth, -1);
        setViewYear(next.year); setViewMonth(next.month);
    };

    const handleNextMonth = () => {
        const next = shiftMonth(viewYear, viewMonth, 1);
        setViewYear(next.year); setViewMonth(next.month);
    };

    const handleTriggerClick = () => {
        if (!isOpen) {
            setActive(role);
            const p = parseValue(role === 'end' && end ? end : (start || end));
            if (p.year !== null && p.month !== null) {
                setViewYear(p.year);
                setViewMonth(p.month);
            }
        }
        toggle();
    };

    const ownValue = role === 'start' ? start : end;
    const ownHasTime = role === 'start' ? startHasTime : endHasTime;
    const displayValue = formatDisplay(ownValue, ownHasTime);
    const startDisplay = formatDisplay(start, startHasTime);
    const endDisplay = formatDisplay(end, endHasTime);
    const wrapperRef = externalContainerRef ?? internalContainerRef;

    const hint = active === 'start'
        ? 'Wybierz dzień rozpoczęcia'
        : endKey ? 'Popraw zakres albo zatwierdź' : 'Teraz wybierz dzień zakończenia';

    return (
        <div ref={wrapperRef as React.RefObject<HTMLDivElement>} style={{ position: 'relative', width: '100%' }}>
            <Trigger
                ref={triggerRef}
                type="button"
                $accentColor={accentColor}
                $hasError={hasError}
                $hasValue={!!displayValue}
                onClick={handleTriggerClick}
            >
                {displayValue || placeholder}
            </Trigger>

            {isOpen && createPortal(
                <DropdownFixed
                    ref={dropdownRef}
                    role="dialog"
                    aria-label="Wybór zakresu dat"
                >
                    <RangeLayout>
                        <RangeHeader>
                            <Segment
                                type="button"
                                $active={active === 'start'}
                                $accentColor={accentColor}
                                aria-pressed={active === 'start'}
                                onClick={() => setActive('start')}
                            >
                                <SegmentLabel>Od</SegmentLabel>
                                <SegmentValue $empty={!startDisplay}>{startDisplay || 'Wybierz'}</SegmentValue>
                            </Segment>
                            <SegmentArrow aria-hidden="true">›</SegmentArrow>
                            <Segment
                                type="button"
                                $active={active === 'end'}
                                $accentColor={accentColor}
                                aria-pressed={active === 'end'}
                                onClick={() => setActive('end')}
                            >
                                <SegmentLabel>Do</SegmentLabel>
                                <SegmentValue $empty={!endDisplay}>{endDisplay || 'Wybierz'}</SegmentValue>
                            </Segment>
                        </RangeHeader>

                        <PickerRow>
                            <CalendarMonth
                                viewYear={viewYear}
                                viewMonth={viewMonth}
                                onPrevMonth={handlePrevMonth}
                                onNextMonth={handleNextMonth}
                                accentColor={accentColor}
                                selectedKeys={[startKey, endKey].filter((k): k is string => !!k)}
                                rangeStartKey={startKey}
                                rangeEndKey={endKey}
                                onDayClick={handleDayClick}
                            />

                            {(startHasTime || endHasTime) && (
                                activeHasTime ? (
                                    <TimeControls
                                        hour={activeTime.hour}
                                        minute={activeTime.minute}
                                        accentColor={accentColor}
                                        caption={active === 'start' ? 'Godzina od' : 'Godzina do'}
                                        onHourDelta={handleHourDelta}
                                        onMinuteSelect={handleMinuteSelect}
                                    />
                                ) : (
                                    <TimeSection>
                                        <AllDayNote>{active === 'start' ? 'Początek' : 'Koniec'} bez godziny, liczy się cały dzień</AllDayNote>
                                    </TimeSection>
                                )
                            )}
                        </PickerRow>

                        <FooterRow>
                            <FooterHint>{hint}</FooterHint>
                            <DoneBtn type="button" $accentColor={accentColor} onClick={close}>
                                Gotowe
                            </DoneBtn>
                        </FooterRow>
                    </RangeLayout>
                </DropdownFixed>,
                document.body
            )}
        </div>
    );
};
