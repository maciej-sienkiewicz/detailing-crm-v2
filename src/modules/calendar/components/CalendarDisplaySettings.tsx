/**
 * Ustawienia siatki miesiąca: weekendy i dni z sąsiednich miesięcy.
 *
 * Osobny przycisk, a nie kolejna kategoria w pasku filtrów: filtr decyduje,
 * KTÓRE wydarzenia widać, a to ustawienie - JAK zbudowana jest siatka. Zlanie
 * tych dwóch rzeczy w jedno menu zaciera różnicę, której użytkownik potrzebuje,
 * gdy czegoś nie widzi na kalendarzu.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';

const PANEL_WIDTH = 320;
const GAP = 8;

// ─── Trigger ──────────────────────────────────────────────────────────────────

const TriggerBtn = styled.button<{ $open: boolean; $modified: boolean }>`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    min-width: 36px;
    padding: 0 9px;
    border: 1px solid ${p => p.$open ? 'var(--brand-primary, #0ea5e9)' : '#e2e8f0'};
    border-radius: 8px;
    background: ${p => p.$open ? 'color-mix(in srgb, var(--brand-primary, #0ea5e9) 8%, #fff)' : '#fff'};
    color: ${p => p.$open ? 'var(--brand-primary, #0ea5e9)' : '#64748b'};
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 150ms ease, color 150ms ease, border-color 150ms ease;

    &:hover {
        background: #f8fafc;
        color: #334155;
        border-color: #cbd5e1;
    }

    svg { width: 17px; height: 17px; display: block; }
`;

/* Kropka mówi "ten kalendarz nie wygląda domyślnie" - bez niej użytkownik
   na cudzym stanowisku nie ma jak zauważyć, że weekendy są schowane celowo. */
const ModifiedDot = styled.span`
    position: absolute;
    top: 5px;
    right: 5px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-primary, #0ea5e9);
    box-shadow: 0 0 0 2px #fff;
`;

// ─── Popover ──────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
    background: transparent;

    @media (max-width: 768px) {
        background: rgba(15, 23, 42, 0.25);
    }
`;

const Panel = styled.div<{ $top: number; $left: number }>`
    position: fixed;
    top: ${p => p.$top}px;
    left: ${p => p.$left}px;
    z-index: 1000;
    width: ${PANEL_WIDTH}px;
    max-width: calc(100vw - 24px);
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06);
    overflow: hidden;

    /* Na telefonie to samo, co robi pasek filtrów: dolny arkusz zamiast
       dymka przyklejonego do krawędzi ekranu. */
    @media (max-width: 768px) {
        top: auto !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0;
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        max-height: 80vh;
        overflow-y: auto;
    }
`;

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 16px 11px;
    border-bottom: 1px solid #f1f5f9;
`;

const PanelTitle = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
`;

const ResetBtn = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: color 150ms ease;

    &:hover { color: #0f172a; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 16px;

    & + & { border-top: 1px solid #f1f5f9; }
`;

const RowText = styled.div`
    flex: 1;
    min-width: 0;
`;

const RowLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    cursor: pointer;
`;

const ToggleSlot = styled.div`
    flex-shrink: 0;
`;

const GearIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarDisplaySettingsProps {
    showWeekends: boolean;
    showAdjacentMonthDays: boolean;
    onShowWeekendsChange: (value: boolean) => void;
    onShowAdjacentMonthDaysChange: (value: boolean) => void;
    isDefault: boolean;
    onReset: () => void;
}

export const CalendarDisplaySettings = ({
    showWeekends,
    showAdjacentMonthDays,
    onShowWeekendsChange,
    onShowAdjacentMonthDaysChange,
    isDefault,
    onReset,
}: CalendarDisplaySettingsProps) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    /* useLayoutEffect, a nie useEffect: panel ma się pojawić już na swoim
       miejscu, bez przeskoku z (0,0) w pierwszej klatce. */
    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        // Wyrównanie do prawej krawędzi przycisku, ale nigdy poza ekran.
        const left = Math.max(12, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 12));
        setPos({ top: r.bottom + GAP, left });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <>
            <TriggerBtn
                ref={btnRef}
                type="button"
                $open={open}
                $modified={!isDefault}
                onClick={() => setOpen(v => !v)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label="Ustawienia widoku miesiąca"
                title="Ustawienia widoku miesiąca"
            >
                {/* Sam znak, bez podpisu — na telefonie stoi w rzędzie z lupką jako
                    para ikon, a „Widok" rozpychało rząd i tłumaczyło to, co i tak mówi
                    panel po otwarciu. */}
                <GearIcon />
                {!isDefault && !open && <ModifiedDot />}
            </TriggerBtn>

            {open && (
                <>
                    <Backdrop onClick={() => setOpen(false)} />
                    <Panel $top={pos.top} $left={pos.left} role="dialog" aria-label="Ustawienia widoku miesiąca">
                        <Row>
                            <RowText>
                                <RowLabel htmlFor="cal-weekends">Weekendy</RowLabel>
                            </RowText>
                            <ToggleSlot>
                                <Toggle
                                    inputId="cal-weekends"
                                    size="sm"
                                    checked={showWeekends}
                                    onChange={onShowWeekendsChange}
                                    ariaLabel="Pokazuj weekendy"
                                />
                            </ToggleSlot>
                        </Row>

                        <Row>
                            <RowText>
                                <RowLabel htmlFor="cal-adjacent">Dni z sąsiednich miesięcy</RowLabel>
                            </RowText>
                            <ToggleSlot>
                                <Toggle
                                    inputId="cal-adjacent"
                                    size="sm"
                                    checked={showAdjacentMonthDays}
                                    onChange={onShowAdjacentMonthDaysChange}
                                    ariaLabel="Pokazuj dni z sąsiednich miesięcy"
                                />
                            </ToggleSlot>
                        </Row>
                    </Panel>
                </>
            )}
        </>
    );
};
