// src/modules/comms/components/analytics/PeriodPicker.tsx
// Wybór okresu - w nagłówku strony, nie nad treścią.
//
// Okres jest właściwością CAŁEGO widoku, tak samo jak jego tytuł: „Pieniądze
// w zapytaniach - sierpień" to jedno zdanie, a nie tytuł i osobny pasek filtrów
// pod spodem. Postawiony niżej wyglądał jak jeszcze jedna sekcja do przeczytania
// i odbierał pierwszy ruch wzroku kwocie, która ma go dostać.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CalendarRange, Check } from 'lucide-react';
import {
    buildPeriod,
    customPeriod,
    fromInputValue,
    toInputValue,
    type Period,
} from './period';

const Wrap = styled.div`
    position: relative;
    display: inline-flex;
`;

/**
 * Przełącznik segmentowy. Dwa warianty tego samego wyboru:
 *  - dark (domyślny) na ciemnym PageHeaderze pełnoekranowego widoku,
 *  - light w panelu analityki na jasnym tle (osobne pigułki, jak zakładki niżej).
 * Trzy stany widoczne naraz, bo są trzy - rozwijana lista chowałaby wybór za
 * kliknięciem i kazała pamiętać, co jest ustawione.
 */
const Segments = styled.div<{ $light?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: ${p => (p.$light ? '6px' : '2px')};
    padding: ${p => (p.$light ? '0' : '3px')};
    border-radius: ${p => p.theme.radii.full};
    background: ${p => (p.$light ? 'transparent' : 'rgba(255, 255, 255, 0.08)')};
    border: ${p => (p.$light ? 'none' : '1px solid rgba(255, 255, 255, 0.14)')};
    backdrop-filter: ${p => (p.$light ? 'none' : 'blur(4px)')};
`;

const Segment = styled.button<{ $active: boolean; $light?: boolean }>`
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => (p.$active ? p.theme.fontWeights.semibold : p.theme.fontWeights.medium)};
    padding: 7px 14px;
    border-radius: ${p => p.theme.radii.full};
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 160ms ease;

    border: ${p => (p.$light ? `1px solid ${p.$active ? 'transparent' : p.theme.colors.border}` : 'none')};
    background: ${p => {
        if (p.$light) return p.$active ? p.theme.colors.text : p.theme.colors.surface;
        return p.$active ? '#f1f5f9' : 'transparent';
    }};
    color: ${p => {
        if (p.$light) return p.$active ? '#ffffff' : p.theme.colors.textSecondary;
        return p.$active ? '#0f172a' : 'rgba(241, 245, 249, 0.72)';
    }};

    &:hover {
        ${p => (p.$light
            ? (!p.$active && `color: ${p.theme.colors.text};`)
            : `color: ${p.$active ? '#0f172a' : '#f1f5f9'};`)}
    }

    svg { width: 14px; height: 14px; }
`;

const Popover = styled.div`
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    min-width: 260px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }

    input {
        font-family: inherit;
        font-size: 13px;
        color: ${p => p.theme.colors.text};
        padding: 8px 10px;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        background: ${p => p.theme.colors.surface};

        &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
    }
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const Apply = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    padding: 9px 14px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.primary};
    color: #fff;

    &:disabled { opacity: 0.5; cursor: default; }
    svg { width: 14px; height: 14px; }
`;

const Hint = styled.span`
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
`;

interface PeriodPickerProps {
    value: Period;
    onChange: (period: Period) => void;
    /** 'light' dla jasnego tła (panel analityki); 'dark' (domyślnie) dla ciemnego PageHeadera. */
    variant?: 'dark' | 'light';
}

export function PeriodPicker({ value, onChange, variant = 'dark' }: PeriodPickerProps) {
    const light = variant === 'light';
    const [open, setOpen] = useState(false);
    const [draftFrom, setDraftFrom] = useState(() => toInputValue(value.from));
    const [draftTo, setDraftTo] = useState(() => toInputValue(value.to));
    const wrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [open]);

    const pickMonth = (mode: 'current' | 'previous') => {
        setOpen(false);
        onChange(buildPeriod(mode, new Date()));
    };

    const parsedFrom = fromInputValue(draftFrom);
    const parsedTo = fromInputValue(draftTo);
    const rangeValid = parsedFrom !== null && parsedTo !== null && parsedFrom <= parsedTo;

    return (
        <Wrap ref={wrapRef}>
            <Segments role="group" aria-label="Okres" $light={light}>
                <Segment
                    type="button"
                    $active={value.mode === 'current'}
                    $light={light}
                    onClick={() => pickMonth('current')}
                >
                    Ten miesiąc
                </Segment>
                <Segment
                    type="button"
                    $active={value.mode === 'previous'}
                    $light={light}
                    onClick={() => pickMonth('previous')}
                >
                    Poprzedni
                </Segment>
                <Segment
                    type="button"
                    $active={value.mode === 'custom'}
                    $light={light}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={() => setOpen((current) => !current)}
                >
                    <CalendarRange />
                    {value.mode === 'custom' ? value.label : 'Zakres'}
                </Segment>
            </Segments>

            {open && (
                <Popover role="dialog" aria-label="Wybierz zakres dat">
                    <Row>
                        <label>
                            Od
                            <input
                                type="date"
                                value={draftFrom}
                                max={draftTo || undefined}
                                onChange={(event) => setDraftFrom(event.target.value)}
                            />
                        </label>
                        <label>
                            Do
                            <input
                                type="date"
                                value={draftTo}
                                min={draftFrom || undefined}
                                onChange={(event) => setDraftTo(event.target.value)}
                            />
                        </label>
                    </Row>
                    <Hint>Porównanie liczy się do okresu tej samej długości tuż przed wybranym.</Hint>
                    <Apply
                        type="button"
                        disabled={!rangeValid}
                        onClick={() => {
                            if (!parsedFrom || !parsedTo) return;
                            setOpen(false);
                            onChange(customPeriod(parsedFrom, parsedTo));
                        }}
                    >
                        <Check /> Pokaż ten zakres
                    </Apply>
                </Popover>
            )}
        </Wrap>
    );
}
