import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

// ---- POLISH LOCALE ----
const WEEK_DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const MONTHS_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

// ---- HELPERS ----
function padTwo(n: number | string) {
    return String(n).padStart(2, '0');
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Monday … 6=Sunday
function getFirstWeekDay(year: number, month: number) {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
}

function formatDisplay(value: string) {
    if (!value) return '';
    const [datePart, timePart] = value.split('T');
    if (!datePart) return '';
    const parts = datePart.split('-');
    if (parts.length < 3) return '';
    const [y, m, d] = parts;
    const dateStr = `${d}.${m}.${y}`;
    if (timePart) {
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
    padding: 10px ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    border-radius: ${props => props.theme.radii.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.$hasValue ? props.theme.colors.text : props.theme.colors.textMuted};
    text-align: left;
    cursor: pointer;
    outline: none;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props =>
            props.$hasError
                ? props.theme.colors.error
                : props.$accentColor || props.theme.colors.primary};
    }
`;

const DropdownFixed = styled.div<{ $top: number; $left: number }>`
    position: fixed;
    top: ${props => props.$top}px;
    left: ${props => props.$left}px;
    z-index: 9999;
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.xl};
    display: flex;
    overflow: hidden;
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
    cursor: ${props => (props.$isCurrent ? 'pointer' : 'default')};
    background: ${props =>
        props.$isSelected ? props.$accentColor || props.theme.colors.primary : 'transparent'};
    color: ${props => {
        if (props.$isSelected) return 'white';
        if (!props.$isCurrent) return props.theme.colors.border;
        if (props.$isToday) return props.$accentColor || props.theme.colors.primary;
        return props.theme.colors.text;
    }};
    font-weight: ${props =>
        props.$isSelected || props.$isToday
            ? props.theme.fontWeights.semibold
            : props.theme.fontWeights.normal};
    transition: background ${props => props.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${props =>
            props.$isSelected
                ? props.$accentColor || props.theme.colors.primary
                : props.theme.colors.surfaceAlt};
    }

    &:disabled {
        cursor: default;
    }
`;

const TimeSection = styled.div`
    width: 110px;
    border-left: 1px solid ${props => props.theme.colors.border};
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    justify-content: center;
`;

const TimeLabel = styled.div`
    font-size: 11px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const TimeInputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const TimeInput = styled.input<{ $accentColor?: string }>`
    width: 40px;
    padding: 10px 4px;
    text-align: center;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: ${props => props.theme.radii.md};
    font-size: 16px;
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    outline: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder {
        color: ${props => props.theme.colors.border};
        font-weight: ${props => props.theme.fontWeights.normal};
        font-size: ${props => props.theme.fontSizes.sm};
    }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.$accentColor || props.theme.colors.primary};
    }

    /* Hide spinners */
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
        -webkit-appearance: none;
    }
    -moz-appearance: textfield;
`;

const TimeSep = styled.span`
    font-size: 20px;
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1;
    user-select: none;
    margin-bottom: 2px;
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
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const internalContainerRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const parsed = parseValue(value);

    const [viewYear, setViewYear] = useState(() => parsed.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => parsed.month ?? today.getMonth());

    const hourFocused = useRef(false);
    const minuteFocused = useRef(false);
    const [hourLocal, setHourLocal] = useState(() =>
        parsed.hour !== null ? padTwo(parsed.hour) : ''
    );
    const [minuteLocal, setMinuteLocal] = useState(() =>
        parsed.minute !== null ? padTwo(parsed.minute) : ''
    );

    // Sync from external value changes
    useEffect(() => {
        const p = parseValue(value);
        if (p.year !== null) setViewYear(p.year);
        if (p.month !== null) setViewMonth(p.month);
        if (!hourFocused.current) {
            setHourLocal(p.hour !== null ? padTwo(p.hour) : '');
        }
        if (!minuteFocused.current) {
            setMinuteLocal(p.minute !== null ? padTwo(p.minute) : '');
        }
    }, [value]);

    // Position dropdown below trigger
    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 4, left: rect.left });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
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

    type Cell = { day: number; isCurrent: boolean };
    const cells: Cell[] = [];
    for (let i = firstWeekDay - 1; i >= 0; i--) {
        cells.push({ day: prevMonthDays - i, isCurrent: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, isCurrent: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 35) {
        cells.push({ day: cells.length - daysInMonth - firstWeekDay + 1, isCurrent: false });
    }

    const handleDayClick = (cell: Cell) => {
        if (!cell.isCurrent) return;
        const m = padTwo(viewMonth + 1);
        const d = padTwo(cell.day);
        const datePart = `${viewYear}-${m}-${d}`;
        if (showTime) {
            onChange(`${datePart}T${hourLocal || '09'}:${minuteLocal || '00'}`);
            // Keep dropdown open so user can also adjust time
        } else {
            onChange(datePart);
            setIsOpen(false);
            onBlur?.();
        }
    };

    const updateTimeInValue = (hour: string, minute: string) => {
        const p = parseValue(value);
        if (p.year !== null && p.month !== null && p.day !== null) {
            const datePart = `${p.year}-${padTwo(p.month + 1)}-${padTwo(p.day)}`;
            onChange(`${datePart}T${hour}:${minute}`);
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

    const displayValue = formatDisplay(value);

    // Attach external containerRef to the wrapping div
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
                <DropdownFixed ref={dropdownRef} $top={dropdownPos.top} $left={dropdownPos.left}>
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
                                    disabled={!cell.isCurrent}
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
                            <TimeInputRow>
                                <TimeInput
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={2}
                                    placeholder="GG"
                                    value={hourLocal}
                                    $accentColor={accentColor}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
                                        setHourLocal(raw);
                                        if (raw !== '') {
                                            const num = parseInt(raw, 10);
                                            if (!isNaN(num) && num <= 23) {
                                                updateTimeInValue(padTwo(num), minuteLocal || '00');
                                            }
                                        }
                                    }}
                                    onFocus={() => { hourFocused.current = true; }}
                                    onBlur={(e) => {
                                        hourFocused.current = false;
                                        const raw = e.target.value.replace(/\D/g, '');
                                        if (raw) {
                                            const num = Math.min(23, Math.max(0, parseInt(raw, 10)));
                                            const fmt = padTwo(num);
                                            setHourLocal(fmt);
                                            updateTimeInValue(fmt, minuteLocal || '00');
                                        }
                                    }}
                                />
                                <TimeSep>:</TimeSep>
                                <TimeInput
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={2}
                                    placeholder="MM"
                                    value={minuteLocal}
                                    $accentColor={accentColor}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
                                        setMinuteLocal(raw);
                                        if (raw !== '') {
                                            const num = parseInt(raw, 10);
                                            if (!isNaN(num) && num <= 59) {
                                                updateTimeInValue(hourLocal || '09', padTwo(num));
                                            }
                                        }
                                    }}
                                    onFocus={() => { minuteFocused.current = true; }}
                                    onBlur={(e) => {
                                        minuteFocused.current = false;
                                        const raw = e.target.value.replace(/\D/g, '');
                                        if (raw) {
                                            const num = Math.min(59, Math.max(0, parseInt(raw, 10)));
                                            const fmt = padTwo(num);
                                            setMinuteLocal(fmt);
                                            updateTimeInValue(hourLocal || '09', fmt);
                                        }
                                    }}
                                />
                            </TimeInputRow>
                        </TimeSection>
                    )}
                </DropdownFixed>,
                document.body
            )}
        </div>
    );
};
