// src/modules/calendar/components/CalendarFilterBar.tsx
//
// Variant D: command-bar with scope chips (Linear / Raycast inspired).
// Replaces CalendarFilterDropdown + CalendarStatusBar.

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import styled from 'styled-components';
import type { AppointmentStatus, VisitStatus } from '../types';
import { useAppointmentColors } from '@/modules/appointment-colors/hooks/useAppointmentColors';

/* ─────────────────────────────────────────────────────────────────
   Status metadata (colours from design)
───────────────────────────────────────────────────────────────── */

const STATUS_META: Record<
    AppointmentStatus | VisitStatus,
    { label: string; dot: string; group: 'appointment' | 'visit' }
> = {
    CREATED:           { label: 'Potwierdzone',      dot: '#0ea5e9', group: 'appointment' },
    ABANDONED:         { label: 'Porzucone',         dot: '#94a3b8', group: 'appointment' },
    CANCELLED:         { label: 'Anulowane',         dot: '#ef4444', group: 'appointment' },
    IN_PROGRESS:       { label: 'W trakcie',         dot: '#f59e0b', group: 'visit' },
    READY_FOR_PICKUP:  { label: 'Gotowe do odbioru', dot: '#10b981', group: 'visit' },
    COMPLETED:         { label: 'Zakończone',        dot: '#16a34a', group: 'visit' },
    REJECTED:          { label: 'Odrzucone',         dot: '#dc2626', group: 'visit' },
    ARCHIVED:          { label: 'Zarchiwizowane',    dot: '#64748b', group: 'visit' },
};

const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = ['CREATED', 'ABANDONED', 'CANCELLED'];
const ALL_VISIT_STATUSES: VisitStatus[] = ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'ARCHIVED'];
const ALL_STATUSES = [...ALL_APPOINTMENT_STATUSES, ...ALL_VISIT_STATUSES] as (AppointmentStatus | VisitStatus)[];

/* Kolejność i etykiety kategorii pierwszego poziomu menu filtrów. */
type CategoryKey = 'visit' | 'appointment' | 'color';
const CATEGORY_ORDER: CategoryKey[] = ['visit', 'appointment', 'color'];
const CATEGORY_LABEL: Record<CategoryKey, string> = {
    visit: 'Wizyty',
    appointment: 'Rezerwacje',
    color: 'Kolory',
};

/* Szerokości obu paneli menu. Panele mają box-sizing: border-box, więc te
   liczby są ich rzeczywistą szerokością na ekranie (padding i ramka w środku) -
   inaczej wyliczona z nich pozycja rozjeżdża się z realnym renderem i menu
   wystaje poza prawą krawędź ekranu. */
const CATEGORY_PANEL_WIDTH = 220;
const OPTIONS_PANEL_WIDTH = 300;
/** Pełna szerokość rozsuniętego menu: oba panele + ramka PopupRoot (1px z każdej strony). */
const POPUP_FULL_WIDTH = CATEGORY_PANEL_WIDTH + OPTIONS_PANEL_WIDTH + 2;

/* ─────────────────────────────────────────────────────────────────
   Styled components
───────────────────────────────────────────────────────────────── */

const BarWrapper = styled.div`
    padding: 8px 16px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-shrink: 0;
    background: #fff;

    @media (max-width: 768px) {
        display: none;
    }
`;

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    flex-shrink: 0;
    min-height: 40px;
    flex-wrap: wrap;
    position: relative;
`;

const SearchIcon = styled.span`
    color: #94a3b8;
    display: flex;
    flex-shrink: 0;
`;

const ShowLabel = styled.span`
    font-size: 12px;
    color: #94a3b8;
    font-weight: 600;
    margin-right: 2px;
    white-space: nowrap;
`;

const Chip = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 10px;
    border-radius: 8px;
    background: ${p => p.$color}14;
    border: 1px solid ${p => p.$color}40;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
`;

const AllChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    background: #0ea5e914;
    border: 1px solid #0ea5e940;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
`;

const ChipDot = styled.span<{ $color: string }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const ChipRemove = styled.button`
    width: 18px;
    height: 18px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    margin-left: 2px;
    transition: background 150ms ease, color 150ms ease;

    &:hover {
        background: rgba(0, 0, 0, 0.08);
        color: #0f172a;
    }

    svg {
        width: 11px;
        height: 11px;
    }
`;

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    background: transparent;
    border: 1px dashed #cbd5e1;
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
    white-space: nowrap;

    &:hover {
        border-color: #94a3b8;
        color: #475569;
        background: #f8fafc;
    }

    svg {
        width: 11px;
        height: 11px;
        flex-shrink: 0;
    }
`;

const Spacer = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ClearButton = styled.button`
    background: none;
    border: none;
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 150ms ease, background 150ms ease;
    white-space: nowrap;

    &:hover {
        color: #0f172a;
        background: #f1f5f9;
    }
`;

const CountBadge = styled.span`
    font-size: 11px;
    color: #0284c7;
    background: #e0f2fe;
    padding: 3px 10px;
    border-radius: 9999px;
    font-weight: 600;
    white-space: nowrap;
`;

/* ── Popup: two-level menu (kategoria -> panel z opcjami) ──────────────
   Poziom 1 (CategoryPanel) wylicza tylko trzy kategorie: Wizyty, Rezerwacje,
   Kolory. Na desktopie najechanie kursorem na kategorię rozsuwa panel z
   opcjami (OptionsPanel) obok, jak we flyout-menu. Na wąskich ekranach (bez
   hovera) panel z opcjami zajmuje całą szerokość i zastępuje listę kategorii
   (nawigacja "w głąb" z przyciskiem powrotu), bo flyout obok nie mieści się. */

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
    background: transparent;

    @media (max-width: 768px) {
        background: rgba(15, 23, 42, 0.25);
    }
`;

const PopupRoot = styled.div<{ $top: number; $left: number }>`
    display: flex;
    align-items: stretch;
    position: fixed;
    top: ${p => p.$top}px;
    left: ${p => p.$left}px;
    z-index: 1000;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06);
    overflow: hidden;
    max-width: calc(100vw - 24px);

    @media (max-width: 768px) {
        flex-direction: column;
        top: auto !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0;
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        max-height: 80vh;
    }
`;

const CategoryPanel = styled.div<{ $hideOnMobile: boolean }>`
    width: ${CATEGORY_PANEL_WIDTH}px;
    box-sizing: border-box;
    flex-shrink: 0;
    padding: 8px;
    overflow-y: auto;
    max-height: min(60vh, 420px);

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.12); border-radius: 2px; }

    @media (max-width: 768px) {
        width: 100%;
        max-height: 65vh;
        display: ${p => (p.$hideOnMobile ? 'none' : 'block')};
    }
`;

const CategoryRow = styled.div<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px;
    border-radius: 10px;
    cursor: pointer;
    background: ${p => (p.$active ? '#f0f9ff' : 'transparent')};
    transition: background 120ms ease;
    user-select: none;

    &:hover {
        background: ${p => (p.$active ? '#e0f2fe' : '#f8fafc')};
    }
`;

const CategoryIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: #f1f5f9;
    color: #64748b;
    flex-shrink: 0;

    svg { width: 15px; height: 15px; }
`;

const CategoryLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    flex: 1;
`;

const CategoryCount = styled.span<{ $partial: boolean }>`
    font-size: 11px;
    font-weight: 600;
    color: ${p => (p.$partial ? '#0284c7' : '#94a3b8')};
    background: ${p => (p.$partial ? '#e0f2fe' : '#f1f5f9')};
    padding: 2px 7px;
    border-radius: 9999px;
    flex-shrink: 0;
    white-space: nowrap;
`;

const CategoryChevron = styled.span`
    display: flex;
    align-items: center;
    color: #94a3b8;
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }
`;

const OptionsPanel = styled.div`
    width: ${OPTIONS_PANEL_WIDTH}px;
    box-sizing: border-box;
    flex-shrink: 0;
    border-left: 1px solid #e2e8f0;
    padding: 8px;
    overflow-y: auto;
    max-height: min(60vh, 420px);

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.12); border-radius: 2px; }

    @media (max-width: 768px) {
        width: 100%;
        border-left: none;
        max-height: 65vh;
    }
`;

const BackRow = styled.button`
    display: none;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    font-family: inherit;
    padding: 8px 10px 4px;
    text-align: left;

    svg { width: 13px; height: 13px; }

    @media (max-width: 768px) {
        display: flex;
        position: sticky;
        top: 0;
        z-index: 2;
        background: #fff;
    }
`;

const PopupSectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 4px;
    position: sticky;
    top: 0;
    z-index: 1;
    background: #fff;

    @media (max-width: 768px) {
        /* Pod przyklejonym BackRow (dotyczy tylko OptionsPanel na mobile). */
        top: 30px;
    }
`;

const PopupSectionTitle = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
`;

const SectionAllBtn = styled.button`
    font-size: 10px;
    font-weight: 600;
    color: #0284c7;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 120ms ease;
    flex-shrink: 0;

    &:hover {
        background: #e0f2fe;
    }
`;

/* OnlyBtn must be defined before PopupRow so the CSS reference works */
const OnlyBtn = styled.button`
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    background: none;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    font-family: inherit;
    padding: 2px 7px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 120ms ease, background 120ms ease, color 120ms ease, border-color 120ms ease;
    flex-shrink: 0;
    line-height: 1.4;

    &:hover {
        background: #0284c7;
        color: #fff;
        border-color: #0284c7;
    }
`;

const PopupRow = styled.div<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    background: ${p => (p.$active ? '#f0f9ff' : 'transparent')};
    transition: background 120ms ease;
    user-select: none;

    &:hover {
        background: ${p => (p.$active ? '#e0f2fe' : '#f8fafc')};
    }

    &:hover ${OnlyBtn} {
        opacity: 1;
    }
`;

const PopupRowLabel = styled.span`
    font-size: 13px;
    color: #0f172a;
    flex: 1;
`;

const PopupDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const PopupCheck = styled.span`
    color: #0284c7;
    display: flex;
    flex-shrink: 0;

    svg {
        width: 14px;
        height: 14px;
    }
`;

const ColorSwatch = styled.span<{ $hex: string }>`
    width: 14px;
    height: 14px;
    border-radius: 4px;
    background: ${p => p.$hex};
    flex-shrink: 0;
    border: 1px solid rgba(0,0,0,0.08);
`;

const ColorChip = styled.span<{ $hex: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 8px;
    border-radius: 8px;
    background: ${p => p.$hex}18;
    border: 1px solid ${p => p.$hex}50;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
`;

/* ─────────────────────────────────────────────────────────────────
   SVG helpers
───────────────────────────────────────────────────────────────── */

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 6 15 12 9 18" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 6 9 12 15 18" />
    </svg>
);

const WrenchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z" />
    </svg>
);

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const PaletteIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a10 10 0 1 1 0-20 8 8 0 0 1 8 8c0 2.2-1.8 4-4 4h-1.6c-1 0-1.4 1.4-.6 2 .5.4.8 1 .8 1.6 0 1.3-1 2.4-2.6 2.4Z" />
        <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="11.5" cy="7" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);

/* ─────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────── */

interface CalendarFilterBarProps {
    selectedAppointmentStatuses: AppointmentStatus[];
    selectedVisitStatuses: VisitStatus[];
    onAppointmentStatusesChange: (statuses: AppointmentStatus[]) => void;
    onVisitStatusesChange: (statuses: VisitStatus[]) => void;
    /** Kolory ukryte przez użytkownika (blacklist); puste = wszystkie widoczne. */
    hiddenColorIds: string[];
    onHiddenColorIdsChange: (ids: string[]) => void;
    /** When true, forces the popup open (e.g. triggered by mobile filter pill). */
    popupOpen?: boolean;
    onPopupClose?: () => void;
    eventsCount?: number;
}

/* ─────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────── */

export const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
    selectedAppointmentStatuses,
    selectedVisitStatuses,
    onAppointmentStatusesChange,
    onVisitStatusesChange,
    hiddenColorIds,
    onHiddenColorIdsChange,
    popupOpen: popupOpenProp,
    onPopupClose,
    eventsCount,
}) => {
    const [popupOpen, setPopupOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
    // `null` = jeszcze nie zmierzono. Panel nie jest renderowany, dopóki nie
    // znamy pozycji, więc nie ma jak mignąć w (0,0) - patrz measurePopupPos.
    const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const { colors: availableColors } = useAppointmentColors({ limit: 100 });

    const activeStatuses = [
        ...selectedAppointmentStatuses,
        ...selectedVisitStatuses,
    ] as (AppointmentStatus | VisitStatus)[];

    const allStatusesActive = activeStatuses.length === ALL_STATUSES.length;
    const allActive = allStatusesActive && hiddenColorIds.length === 0;

    const toggle = (status: AppointmentStatus | VisitStatus) => {
        const meta = STATUS_META[status];
        if (meta.group === 'appointment') {
            const s = status as AppointmentStatus;
            if (selectedAppointmentStatuses.includes(s)) {
                onAppointmentStatusesChange(selectedAppointmentStatuses.filter(x => x !== s));
            } else {
                onAppointmentStatusesChange([...selectedAppointmentStatuses, s]);
            }
        } else {
            const s = status as VisitStatus;
            if (selectedVisitStatuses.includes(s)) {
                onVisitStatusesChange(selectedVisitStatuses.filter(x => x !== s));
            } else {
                onVisitStatusesChange([...selectedVisitStatuses, s]);
            }
        }
    };

    const onlyAppointmentStatus = (s: AppointmentStatus) => {
        onAppointmentStatusesChange([s]);
    };

    const onlyVisitStatus = (s: VisitStatus) => {
        onVisitStatusesChange([s]);
    };

    const onlyColor = (id: string) => {
        onHiddenColorIdsChange(availableColors.filter(c => c.id !== id).map(c => c.id));
    };

    const toggleColor = (id: string) => {
        const next = hiddenColorIds.includes(id)
            ? hiddenColorIds.filter(c => c !== id)
            : [...hiddenColorIds, id];
        onHiddenColorIdsChange(next);
    };

    const resetAll = () => {
        onAppointmentStatusesChange(ALL_APPOINTMENT_STATUSES);
        onVisitStatusesChange(ALL_VISIT_STATUSES);
        onHiddenColorIdsChange([]);
    };

    const closePopup = () => {
        setPopupOpen(false);
        setActiveCategory(null);
        onPopupClose?.();
    };

    // Pozycja panelu liczona z przycisku "Dodaj filtr". Na mobile media query
    // w PopupRoot i tak wymusza dolny arkusz (!important), więc liczy się to
    // tylko na desktopie, gdzie przycisk jest realnie widoczny.
    // Gdy dużo aktywnych filtrów rozepchnie chipy, przycisk potrafi wylądować
    // blisko prawej krawędzi - bez korekty rozsuwany OptionsPanel (300px)
    // wystawałby poza viewport, więc lewą pozycję z góry ograniczamy tak, żeby
    // zmieściła się pełna szerokość obu paneli (kategorie + opcje).
    const measurePopupPos = useCallback(() => {
        const trigger = addButtonRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const maxLeft = window.innerWidth - POPUP_FULL_WIDTH - 12;
        setPopupPos({ top: rect.bottom + 6, left: Math.min(rect.left, Math.max(12, maxLeft)) });
    }, []);

    // Mierzymy synchronicznie już w handlerze kliknięcia, żeby pierwszy render
    // panelu miał gotową pozycję. Pomiar dopiero w efekcie (nawet layoutowym)
    // dokłada osobny commit, a w wariancie pasywnym przeglądarka zdążyła
    // namalować panel w (0,0) - stąd mignięcie w lewym górnym rogu.
    const togglePopup = () => {
        if (!popupOpen) measurePopupPos();
        setPopupOpen(o => !o);
    };

    // Hover na desktopie ma sens tylko dla urządzeń z myszką - na dotyku
    // (bez hover) zostaje wyłącznie klik, więc kategoria startuje zwinięta
    // i użytkownik "wchodzi" w nią jawnym dotknięciem.
    const supportsHover = () =>
        typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

    const handleCategoryHover = (key: CategoryKey) => {
        if (supportsHover()) setActiveCategory(key);
    };

    const handleCategoryClick = (key: CategoryKey) => {
        setActiveCategory(prev => (prev === key ? (supportsHover() ? key : null) : key));
    };

    useEffect(() => {
        if (popupOpenProp) setPopupOpen(true);
    }, [popupOpenProp]);

    // Otwarcie sterowane z zewnątrz (mobilna pigułka filtra) nie przechodzi
    // przez togglePopup, więc pomiar trzeba dorobić tutaj - w layoutowym
    // efekcie, czyli jeszcze przed malowaniem klatki.
    useLayoutEffect(() => {
        if (popupOpen) measurePopupPos();
    }, [popupOpen, measurePopupPos]);

    useEffect(() => {
        if (!popupOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideBar = barRef.current?.contains(target);
            const insidePopup = popupRef.current?.contains(target);
            if (!insideBar && !insidePopup) {
                closePopup();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [popupOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const isActive = (s: AppointmentStatus | VisitStatus) =>
        STATUS_META[s].group === 'appointment'
            ? selectedAppointmentStatuses.includes(s as AppointmentStatus)
            : selectedVisitStatuses.includes(s as VisitStatus);

    const categoryCount = (key: CategoryKey): { active: number; total: number } => {
        if (key === 'appointment') return { active: selectedAppointmentStatuses.length, total: ALL_APPOINTMENT_STATUSES.length };
        if (key === 'visit') return { active: selectedVisitStatuses.length, total: ALL_VISIT_STATUSES.length };
        return { active: availableColors.length - hiddenColorIds.length, total: availableColors.length };
    };

    const categoryIcon = (key: CategoryKey) => {
        if (key === 'appointment') return <CalendarIcon />;
        if (key === 'visit') return <WrenchIcon />;
        return <PaletteIcon />;
    };

    return (
        <>
        <BarWrapper>
            <Bar ref={barRef}>
                {/* Search icon */}
                <SearchIcon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </SearchIcon>

                <ShowLabel>Pokaż:</ShowLabel>

                {/* All-active single chip */}
                {allActive ? (
                    <AllChip>
                        <ChipDot $color="#0ea5e9" />
                        Wszystkie wydarzenia
                    </AllChip>
                ) : (
                    <>
                        {!allStatusesActive && activeStatuses.map(s => {
                            const m = STATUS_META[s];
                            return (
                                <Chip key={s} $color={m.dot}>
                                    <ChipDot $color={m.dot} />
                                    {m.label}
                                    <ChipRemove
                                        onClick={() => toggle(s)}
                                        title={`Usuń filtr: ${m.label}`}
                                        aria-label={`Usuń filtr: ${m.label}`}
                                    >
                                        <XIcon />
                                    </ChipRemove>
                                </Chip>
                            );
                        })}

                        {hiddenColorIds.length > 0 && availableColors
                            .filter(color => !hiddenColorIds.includes(color.id))
                            .map(color => (
                                <ColorChip key={color.id} $hex={color.hexColor}>
                                    <ColorSwatch $hex={color.hexColor} />
                                    {color.name}
                                    <ChipRemove
                                        onClick={() => toggleColor(color.id)}
                                        title={`Ukryj kolor: ${color.name}`}
                                        aria-label={`Ukryj kolor: ${color.name}`}
                                    >
                                        <XIcon />
                                    </ChipRemove>
                                </ColorChip>
                            ))}
                    </>
                )}

                {/* Add filter button */}
                <AddButton
                    ref={addButtonRef}
                    onClick={togglePopup}
                    aria-expanded={popupOpen}
                    aria-haspopup="menu"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj filtr
                </AddButton>

                {/* Right side: clear + count */}
                <Spacer>
                    {!allActive && (
                        <ClearButton onClick={resetAll}>Wyczyść</ClearButton>
                    )}
                    {eventsCount !== undefined && (
                        <CountBadge>{eventsCount} wydarzeń</CountBadge>
                    )}
                </Spacer>
            </Bar>
        </BarWrapper>

        {/* Popup: renderowany poza BarWrapper (który na mobile ma display:none),
            żeby przycisk filtra z mobilnego nagłówka (poza tym komponentem, sterujący
            przez `popupOpen`) też mógł go otworzyć - patrz CalendarView.tsx. */}
        {popupOpen && popupPos && (
            <>
                <Backdrop onClick={closePopup} />
                <PopupRoot
                    ref={popupRef}
                    $top={popupPos.top}
                    $left={popupPos.left}
                    role="menu"
                    aria-label="Filtruj kalendarz"
                >
                    <CategoryPanel $hideOnMobile={activeCategory !== null}>
                        {CATEGORY_ORDER.map(key => {
                            const { active, total } = categoryCount(key);
                            const isCurrent = activeCategory === key;
                            if (key === 'color' && availableColors.length === 0) return null;
                            return (
                                <CategoryRow
                                    key={key}
                                    $active={isCurrent}
                                    onMouseEnter={() => handleCategoryHover(key)}
                                    onClick={() => handleCategoryClick(key)}
                                    role="menuitem"
                                    aria-haspopup="true"
                                    aria-expanded={isCurrent}
                                >
                                    <CategoryIcon>{categoryIcon(key)}</CategoryIcon>
                                    <CategoryLabel>{CATEGORY_LABEL[key]}</CategoryLabel>
                                    <CategoryCount $partial={active < total}>{active}/{total}</CategoryCount>
                                    <CategoryChevron><ChevronRightIcon /></CategoryChevron>
                                </CategoryRow>
                            );
                        })}
                    </CategoryPanel>

                    {activeCategory && (
                        <OptionsPanel
                            role="listbox"
                            aria-label={`Filtruj: ${CATEGORY_LABEL[activeCategory]}`}
                            onMouseLeave={() => { if (supportsHover()) setActiveCategory(null); }}
                        >
                            <BackRow onClick={() => setActiveCategory(null)}>
                                <ChevronLeftIcon />
                                Wróć do kategorii
                            </BackRow>

                            {activeCategory === 'appointment' && (
                                <>
                                    <PopupSectionHeader>
                                        <PopupSectionTitle>Rezerwacje</PopupSectionTitle>
                                        <SectionAllBtn
                                            onClick={e => { e.stopPropagation(); onAppointmentStatusesChange(ALL_APPOINTMENT_STATUSES); }}
                                        >
                                            Wszystkie
                                        </SectionAllBtn>
                                    </PopupSectionHeader>
                                    {ALL_APPOINTMENT_STATUSES.map(s => {
                                        const m = STATUS_META[s];
                                        const on = isActive(s);
                                        return (
                                            <PopupRow
                                                key={s}
                                                $active={on}
                                                onClick={() => toggle(s)}
                                                role="option"
                                                aria-selected={on}
                                            >
                                                <PopupDot $color={m.dot} />
                                                <PopupRowLabel>{m.label}</PopupRowLabel>
                                                <OnlyBtn
                                                    onClick={e => { e.stopPropagation(); onlyAppointmentStatus(s); }}
                                                    title={`Pokaż tylko: ${m.label}`}
                                                >
                                                    Tylko
                                                </OnlyBtn>
                                                {on && <PopupCheck><CheckIcon /></PopupCheck>}
                                            </PopupRow>
                                        );
                                    })}
                                </>
                            )}

                            {activeCategory === 'visit' && (
                                <>
                                    <PopupSectionHeader>
                                        <PopupSectionTitle>Wizyty</PopupSectionTitle>
                                        <SectionAllBtn
                                            onClick={e => { e.stopPropagation(); onVisitStatusesChange(ALL_VISIT_STATUSES); }}
                                        >
                                            Wszystkie
                                        </SectionAllBtn>
                                    </PopupSectionHeader>
                                    {ALL_VISIT_STATUSES.map(s => {
                                        const m = STATUS_META[s];
                                        const on = isActive(s);
                                        return (
                                            <PopupRow
                                                key={s}
                                                $active={on}
                                                onClick={() => toggle(s)}
                                                role="option"
                                                aria-selected={on}
                                            >
                                                <PopupDot $color={m.dot} />
                                                <PopupRowLabel>{m.label}</PopupRowLabel>
                                                <OnlyBtn
                                                    onClick={e => { e.stopPropagation(); onlyVisitStatus(s); }}
                                                    title={`Pokaż tylko: ${m.label}`}
                                                >
                                                    Tylko
                                                </OnlyBtn>
                                                {on && <PopupCheck><CheckIcon /></PopupCheck>}
                                            </PopupRow>
                                        );
                                    })}
                                </>
                            )}

                            {activeCategory === 'color' && (
                                <>
                                    <PopupSectionHeader>
                                        <PopupSectionTitle>Kolory</PopupSectionTitle>
                                        <SectionAllBtn
                                            onClick={e => { e.stopPropagation(); onHiddenColorIdsChange([]); }}
                                        >
                                            Wszystkie
                                        </SectionAllBtn>
                                    </PopupSectionHeader>
                                    {availableColors.map(color => {
                                        const on = !hiddenColorIds.includes(color.id);
                                        return (
                                            <PopupRow
                                                key={color.id}
                                                $active={on}
                                                onClick={() => toggleColor(color.id)}
                                                role="option"
                                                aria-selected={on}
                                            >
                                                <ColorSwatch $hex={color.hexColor} />
                                                <PopupRowLabel>{color.name}</PopupRowLabel>
                                                <OnlyBtn
                                                    onClick={e => { e.stopPropagation(); onlyColor(color.id); }}
                                                    title={`Pokaż tylko kolor: ${color.name}`}
                                                >
                                                    Tylko
                                                </OnlyBtn>
                                                {on && <PopupCheck><CheckIcon /></PopupCheck>}
                                            </PopupRow>
                                        );
                                    })}
                                </>
                            )}
                        </OptionsPanel>
                    )}
                </PopupRoot>
            </>
        )}
        </>
    );
};
