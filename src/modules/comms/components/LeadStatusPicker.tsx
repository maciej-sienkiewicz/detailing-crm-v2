// src/modules/comms/components/LeadStatusPicker.tsx
// Status leada w panelu szczegółów: bieżący + strzałka, reszta pod kliknięciem.
//
// Sześć statusów rozłożonych jednocześnie na kafelki kazało czytać całą siatkę,
// żeby znaleźć ten jeden podświetlony - a pytanie brzmi „w jakim stanie jest ten
// lead", nie „jakie stany istnieją". Lista pozostałych to informacja potrzebna
// dopiero w chwili zmiany, więc mieszka pod strzałką.
//
// Menu w portalu i pozycjonowane fixed, jak LeadCellEditor: panel szczegółów jest
// przewijalny, a element absolutny zostałby przez niego przycięty przy przewinięciu.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Check, ChevronDown } from 'lucide-react';
import { LEAD_STATUS_COLORS, LEAD_STATUS_FLOW, LEAD_STATUS_LABELS, type LeadStatus } from '../types';

const MENU_WIDTH = 220;
const MENU_GAP = 6;
/** Zapas na wysokość menu, gdy nie mieści się pod przyciskiem - wtedy otwiera się nad. */
const MENU_MAX_HEIGHT = 280;

const Trigger = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    border-radius: ${p => p.theme.radii.full};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    padding: 6px 12px 6px 14px;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
    &:disabled { opacity: 0.6; cursor: default; }

    svg { width: 14px; height: 14px; color: ${p => p.theme.colors.textMuted}; }
`;

const Dot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    flex-shrink: 0;
`;

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1200;
`;

const Menu = styled.div`
    position: fixed;
    z-index: 1201;
    width: ${MENU_WIDTH}px;
    max-height: ${MENU_MAX_HEIGHT}px;
    overflow-y: auto;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 16px 44px rgba(15, 23, 42, 0.18);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const Option = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : 'transparent')};
    color: ${p => p.theme.colors.text};
    border-radius: ${p => p.theme.radii.sm};
    padding: 8px 10px;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${({ $active, theme }) =>
        $active ? theme.fontWeights.semibold : theme.fontWeights.normal};
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    .check { margin-left: auto; width: 13px; height: 13px; flex-shrink: 0; }
`;

interface LeadStatusPickerProps {
    status: LeadStatus;
    onChange: (status: LeadStatus) => void;
    disabled?: boolean;
}

export function LeadStatusPicker({ status, onChange, disabled }: LeadStatusPickerProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    // Pozycję liczymy przed malowaniem - menu nie ma prawa mrugnąć w lewym górnym rogu.
    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const opensUpward = rect.bottom + MENU_GAP + MENU_MAX_HEIGHT > window.innerHeight;
        setPosition({
            top: opensUpward
                ? Math.max(MENU_GAP, rect.top - MENU_GAP - MENU_MAX_HEIGHT)
                : rect.bottom + MENU_GAP,
            left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - MENU_GAP),
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const pick = (next: LeadStatus) => {
        setOpen(false);
        if (next !== status) onChange(next);
    };

    return (
        <>
            <Trigger
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                <Dot $color={LEAD_STATUS_COLORS[status].fg} />
                {LEAD_STATUS_LABELS[status]}
                <ChevronDown />
            </Trigger>

            {open && position && createPortal(
                <>
                    <Backdrop onClick={() => setOpen(false)} />
                    <Menu role="listbox" style={{ top: position.top, left: position.left }}>
                        {LEAD_STATUS_FLOW.map((option) => (
                            <Option
                                key={option}
                                type="button"
                                role="option"
                                aria-selected={option === status}
                                $active={option === status}
                                onClick={() => pick(option)}
                            >
                                <Dot $color={LEAD_STATUS_COLORS[option].fg} />
                                {LEAD_STATUS_LABELS[option]}
                                {option === status && <Check className="check" />}
                            </Option>
                        ))}
                    </Menu>
                </>,
                document.body
            )}
        </>
    );
}
