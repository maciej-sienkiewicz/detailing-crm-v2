import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const DropdownFixed = styled.div<{ $top?: number; $bottom?: number; $left: number; $ready: boolean }>`
    position: fixed;
    top: ${props => props.$top !== undefined ? `${props.$top}px` : 'auto'};
    bottom: ${props => props.$bottom !== undefined ? `${props.$bottom}px` : 'auto'};
    left: ${props => props.$left}px;
    z-index: 9999;
    background: ${props => props.theme.colors.surface};
    border: 1.5px solid #e2e8f0;
    border-radius: 16px;
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.03),
        0 8px 24px -4px rgba(0,0,0,0.12);
    display: flex;
    overflow: hidden;
    visibility: ${props => props.$ready ? 'visible' : 'hidden'};
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

const CalGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 32px);
    gap: 2px;
`;

const DayHeader = styled.div`
    text-align: center;
    font-size: 11px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    padding: 4px 0 6px;
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

// ---- COMPONENT ----
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
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
    const [posReady, setPosReady] = useState(false);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const internalContainerRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const parsed = parseValue(value);

    const [viewYear, setViewYear] = useState(() => parsed.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => parsed.month ?? today.getMonth());

    const _defaultSlot = getNearestUpcomingSlot();
    // Hour state, derived from value, or nearest upcoming slot
    const [hour, setHour] = useState(() =>
        parsed.hour !== null ? parsed.hour : _defaultSlot.hour
    );
    // Minute, snapped to nearest 15-min step, or nearest upcoming slot
    const [minute, setMinute] = useState(() =>
        parsed.minute !== null ? snapToStep(parsed.minute) : _defaultSlot.minute
    );

    // Sync from external value changes
    useEffect(() => {
        const p = parseValue(value);
        if (p.year !== null) setViewYear(p.year);
        if (p.month !== null) setViewMonth(p.month);
        if (p.hour !== null) setHour(p.hour);
        if (p.minute !== null) setMinute(snapToStep(p.minute));
    }, [value]);

    // Position dropdown below (or above) trigger, clamped to viewport
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vvHeight = window.visualViewport?.height ?? window.innerHeight;
        let left = rect.left;
        if (dropdownRef.current) {
            const dropW = dropdownRef.current.offsetWidth;
            const maxLeft = window.innerWidth - dropW - 8;
            if (left > maxLeft) left = Math.max(8, maxLeft);
        }
        const dropH = dropdownRef.current?.offsetHeight ?? 320;
        const spaceBelow = vvHeight - rect.bottom - 4;
        const spaceAbove = rect.top - 4;
        if (spaceBelow < dropH && spaceAbove > spaceBelow) {
            setDropdownPos({ bottom: vvHeight - rect.top + 4, left });
        } else {
            setDropdownPos({ top: rect.bottom + 4, left });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) { setPosReady(false); return; }
        updatePosition();
        setPosReady(true);
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

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handle = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return;
            setIsOpen(false);
            onBlur?.();
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [isOpen, onBlur]);

    // Build calendar cells
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

    const buildIso = (y: number, mo: number, d: number, h: number, min: number) => {
        const datePart = `${y}-${padTwo(mo + 1)}-${padTwo(d)}`;
        return showTime ? `${datePart}T${padTwo(h)}:${padTwo(min)}` : datePart;
    };

    const handleDayClick = (cell: Cell) => {
        let year = viewYear;
        let month = viewMonth;
        if (cell.monthOffset === -1) {
            if (month === 0) { month = 11; year -= 1; } else { month -= 1; }
            setViewYear(year); setViewMonth(month);
        } else if (cell.monthOffset === 1) {
            if (month === 11) { month = 0; year += 1; } else { month += 1; }
            setViewYear(year); setViewMonth(month);
        }
        onChange(buildIso(year, month, cell.day, hour, minute));
        setIsOpen(false);
        onBlur?.();
    };

    const handleHourChange = (delta: number) => {
        const newHour = (hour + delta + 24) % 24;
        setHour(newHour);
        const p = parseValue(value);
        if (p.year !== null && p.month !== null && p.day !== null) {
            onChange(buildIso(p.year, p.month, p.day, newHour, minute));
        }
    };

    const handleMinuteClick = (min: number) => {
        setMinute(min);
        const p = parseValue(value);
        if (p.year !== null && p.month !== null && p.day !== null) {
            onChange(buildIso(p.year, p.month, p.day, hour, min));
        }
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const isSelected = (day: number) =>
        parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;

    const isTodayCell = (day: number) =>
        today.getFullYear() === viewYear &&
        today.getMonth() === viewMonth &&
        today.getDate() === day;

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
                onClick={() => {
                    const opening = !isOpen;
                    setIsOpen(opening);
                    if (opening) onFocus?.();
                    else onBlur?.();
                }}
            >
                {displayValue || placeholder}
            </Trigger>

            {isOpen && createPortal(
                <DropdownFixed
                    ref={dropdownRef}
                    $top={dropdownPos.top}
                    $bottom={dropdownPos.bottom}
                    $left={dropdownPos.left}
                    $ready={posReady}
                >
                    <CalendarSection>
                        <NavRow>
                            <NavBtn type="button" onClick={handlePrevMonth}>‹</NavBtn>
                            <MonthYearLabel>{MONTHS_PL[viewMonth]} {viewYear}</MonthYearLabel>
                            <NavBtn type="button" onClick={handleNextMonth}>›</NavBtn>
                        </NavRow>
                        <CalGrid>
                            {WEEK_DAYS.map(d => <DayHeader key={d}>{d}</DayHeader>)}
                            {cells.map((cell, idx) => (
                                <DayCell
                                    key={idx}
                                    type="button"
                                    $isCurrent={cell.isCurrent}
                                    $isSelected={cell.isCurrent && isSelected(cell.day)}
                                    $isToday={cell.isCurrent && isTodayCell(cell.day)}
                                    $accentColor={accentColor}
                                    onClick={() => handleDayClick(cell)}
                                >
                                    {cell.day}
                                </DayCell>
                            ))}
                        </CalGrid>
                    </CalendarSection>

                    {showTime && (
                        <TimeSection>
                            <TimeLabel>Godzina</TimeLabel>
                            <HourSpinner>
                                <SpinBtn type="button" onClick={() => handleHourChange(1)}>▲</SpinBtn>
                                <HourDisplay $accentColor={accentColor}>
                                    {padTwo(hour)}
                                </HourDisplay>
                                <SpinBtn type="button" onClick={() => handleHourChange(-1)}>▼</SpinBtn>
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
                                        onClick={() => handleMinuteClick(step)}
                                    >
                                        :{padTwo(step)}
                                    </MinuteBtn>
                                ))}
                            </MinuteGrid>
                        </TimeSection>
                    )}
                </DropdownFixed>,
                document.body
            )}
        </div>
    );
};
