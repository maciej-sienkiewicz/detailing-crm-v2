// src/modules/calendar/components/CalendarSearchModal.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useBreakpoint, useVisualViewportSheet } from '@/common/hooks';
import { calendarApi } from '../api/calendarApi';
import { PiiValue, PiiText } from '@/common/pii';
import type { CalendarEvent, AppointmentEventData, VisitEventData } from '../types';
import { localDateKey } from '../utils/calendarDates';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
    animation: ${fadeIn} 0.15s ease;

    @media (max-width: 640px) {
        padding-top: 0;
    }
`;

const Panel = styled.div`
    width: 640px;
    max-width: calc(100vw - 32px);
    background: #fff;
    border-radius: 16px;
    box-shadow:
        0 4px 6px rgba(0, 0, 0, 0.03),
        0 16px 32px rgba(0, 0, 0, 0.12),
        0 32px 64px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    animation: ${slideUp} 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;

    /* Telefon: arkusz na pełnym ekranie, liczony od GÓRY.
     *
     * Wcześniej było to okno przyklejone do dołu (align-items: flex-end, 80vh).
     * position: fixed rozlicza się z LAYOUT viewportem, a ten w Safari nie kurczy się
     * po otwarciu klawiatury — więc dolna krawędź arkusza lądowała pod klawiaturą
     * razem z polem wyszukiwania i całą listą. Teraz pole stoi na górze, lista bierze
     * resztę ekranu, a wysokość klawiatury schodzi do listy jako --kb-inset
     * (useVisualViewportSheet) — dokładnie tak jak w pickerze usług przy wizycie
     * (ServiceInlineRow) i w oknie pozycji zlecenia zbiorczego. */
    @media (max-width: 640px) {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        width: auto;
        max-width: none;
        max-height: none;
        border-radius: 0;
        box-shadow: none;
        animation: none;
        padding-top: env(safe-area-inset-top);
    }
`;

const SearchHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
`;

const SearchIconWrapper = styled.div`
    color: #94a3b8;
    display: flex;
    align-items: center;
    flex-shrink: 0;
`;

const SearchInput = styled.input`
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    color: #0f172a;
    font-family: inherit;
    background: transparent;

    &::placeholder {
        color: #94a3b8;
    }
`;

const ClearBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.12s;

    &:hover { background: #e2e8f0; }

    svg { width: 14px; height: 14px; }
`;

/**
 * Wyjście z arkusza na telefonie. Arkusz zakrywa cały ekran, więc kliknięcie w tło
 * — jedyna droga wyjścia na desktopie — jest tam nieosiągalne.
 */
const SheetClose = styled.button`
    display: none;

    @media (max-width: 640px) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-right: -8px;
        flex-shrink: 0;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;

        svg { width: 20px; height: 20px; }
        &:active { background: #f1f5f9; color: #0f172a; }
    }
`;

const ResultsArea = styled.div`
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    flex: 1;
    min-height: 0;
    padding: 8px 0 12px;
    /* Zapas pod ostatnim wynikiem: margines telefonu plus wysokość klawiatury.
       Dzięki niemu do ostatniej pozycji da się doscrollować, zamiast kurczyć arkusz. */
    padding-bottom: calc(12px + env(safe-area-inset-bottom) + var(--kb-inset, 0px));
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
    color: #94a3b8;
`;

const EmptyIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
`;

const EmptyText = styled.p`
    font-size: 14px;
    font-weight: 500;
    color: #94a3b8;
    margin: 0;
    text-align: center;
`;

const HintText = styled.p`
    font-size: 13px;
    color: #cbd5e1;
    margin: 0;
    text-align: center;
`;

const DayGroup = styled.div`
    margin-bottom: 4px;
`;

const DayLabel = styled.div`
    padding: 10px 20px 6px;
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 1;
`;

const ResultRow = styled.button<{ $muted?: boolean }>`
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: 8px;
    width: 100%;
    padding: 10px 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.1s;
    opacity: ${p => p.$muted ? 0.42 : 1};

    &:hover {
        background: #f8fafc;
    }

    &:active {
        background: #f1f5f9;
    }
`;

const ResultLeft = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
`;

const ColorDot = styled.div<{ $color: string; $muted?: boolean }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$muted ? '#cbd5e1' : p.$color};
    flex-shrink: 0;
    margin-top: 3px;
`;

const ResultContent = styled.div`
    min-width: 0;
`;

const ResultTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
`;

const ResultMeta = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ResultPrices = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
`;

const PriceBrutto = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
`;

const PriceNetto = styled.div`
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
`;

const LoadingRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    color: #94a3b8;
    font-size: 14px;
`;

const Spinner = styled.div`
    width: 16px;
    height: 16px;
    border: 2px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const ResultCount = styled.div`
    padding: 0 20px 8px;
    font-size: 12px;
    color: #94a3b8;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
    event: CalendarEvent;
    date: Date;
}

interface GroupedResults {
    dayKey: string;
    dayLabel: string;
    results: SearchResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLN_DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

function formatDayLabel(date: Date): string {
    const dayName = PLN_DAYS[date.getDay()];
    const day = date.getDate();
    const months = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
    return `${dayName}, ${day} ${months[date.getMonth()]}`;
}

function formatPrice(amount: number | undefined, currency = 'PLN'): string {
    if (!amount) return '-';
    return `${(amount / 100).toFixed(2)} ${currency}`;
}

const FINISHED_STATUSES = new Set(['COMPLETED', 'ARCHIVED', 'ABANDONED', 'CANCELLED']);

function isFinished(event: CalendarEvent): boolean {
    const status = (event.extendedProps as AppointmentEventData | VisitEventData).status;
    return !!status && FINISHED_STATUSES.has(status);
}

function matchesQuery(event: CalendarEvent, q: string): boolean {
    const lower = q.toLowerCase();
    const props = event.extendedProps as AppointmentEventData | VisitEventData;
    const fields = [
        event.title,
        props.customerName,
        props.vehicleInfo,
        (props as VisitEventData).licensePlate,
        (props as VisitEventData).visitNumber,
        (props as AppointmentEventData).serviceNames?.join(' '),
    ];
    return fields.some(f => f && f.toLowerCase().includes(lower));
}

function groupByDay(results: SearchResult[]): GroupedResults[] {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
        // Dzień lokalny, jak w etykiecie grupy: rezerwacja całodniowa zaczyna się o 22:00Z
        // dnia poprzedniego i w kluczu z UTC trafiała do grupy dnia wcześniejszego.
        const key = localDateKey(r.date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({
            dayKey: key,
            dayLabel: formatDayLabel(items[0].date),
            results: items,
        }));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarSearchModalProps {
    onClose: () => void;
    onSelectEvent: (event: CalendarEvent, sourceRect: DOMRect) => void;
}

export const CalendarSearchModal: React.FC<CalendarSearchModalProps> = ({ onClose, onSelectEvent }) => {
    const [query, setQuery] = useState('');
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const fetchedRef = useRef(false);
    const isMobile = !useBreakpoint('sm');

    // Przypina arkusz do WIDOCZNEGO obszaru ekranu i oddaje wysokość klawiatury liście.
    useVisualViewportSheet(isMobile, sheetRef);

    // Fetch a wide range of events once on mount
    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const now = new Date();
        const start = new Date(now.getFullYear() - 1, 0, 1).toISOString();
        const end   = new Date(now.getFullYear() + 2, 11, 31).toISOString();

        setIsLoading(true);
        calendarApi.getCalendarEvents(
            { start, end },
            ['CREATED', 'ABANDONED', 'CANCELLED'],
            ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'ARCHIVED'],
            [],
        ).then(events => {
            setAllEvents(events);
        }).catch(() => {
            // silently ignore errors, user can still see empty state
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // ESC closes the modal
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const filteredResults: SearchResult[] = query.trim().length >= 2
        ? allEvents
            .filter(e => matchesQuery(e, query))
            .map(e => ({ event: e, date: new Date(e.start as string) }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
        : [];

    const grouped = groupByDay(filteredResults);

    const handleSelect = useCallback((event: CalendarEvent, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onSelectEvent(event, rect);
        onClose();
    }, [onSelectEvent, onClose]);

    return (
        <Backdrop onClick={onClose}>
            <Panel ref={sheetRef} onClick={e => e.stopPropagation()}>
                <SearchHeader>
                    <SearchIconWrapper>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </SearchIconWrapper>
                    <SearchInput
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Szukaj wizyt, rezerwacji, klientów, pojazdów..."
                    />
                    {query && (
                        <ClearBtn onClick={() => setQuery('')} aria-label="Wyczyść">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </ClearBtn>
                    )}
                    <SheetClose type="button" onClick={onClose} aria-label="Zamknij wyszukiwanie">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </SheetClose>
                </SearchHeader>

                <ResultsArea>
                    {isLoading ? (
                        <LoadingRow>
                            <Spinner />
                            Ładowanie danych...
                        </LoadingRow>
                    ) : query.trim().length < 2 ? (
                        <EmptyState>
                            <EmptyIcon>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </EmptyIcon>
                            <EmptyText>Wyszukaj wizytę lub rezerwację</EmptyText>
                            <HintText>Wpisz co najmniej 2 znaki: tytuł, klient, pojazd lub tablica rejestracyjna</HintText>
                        </EmptyState>
                    ) : filteredResults.length === 0 ? (
                        <EmptyState>
                            <EmptyIcon>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </EmptyIcon>
                            <EmptyText>Brak wyników dla „{query}"</EmptyText>
                            <HintText>Spróbuj innej frazy</HintText>
                        </EmptyState>
                    ) : (
                        <>
                            <ResultCount>{filteredResults.length} {filteredResults.length === 1 ? 'wynik' : filteredResults.length < 5 ? 'wyniki' : 'wyników'}</ResultCount>
                            {grouped.map(group => (
                                <DayGroup key={group.dayKey}>
                                    <DayLabel>{group.dayLabel}</DayLabel>
                                    {group.results.map(({ event }) => {
                                        const props = event.extendedProps as AppointmentEventData | VisitEventData;
                                        const vehicle = (props as VisitEventData).licensePlate
                                            ? `${props.vehicleInfo} · ${(props as VisitEventData).licensePlate}`
                                            : props.vehicleInfo;
                                        const muted = isFinished(event);
                                        return (
                                            <ResultRow key={event.id} $muted={muted} onClick={(e) => handleSelect(event, e)}>
                                                <ResultLeft>
                                                    <ColorDot $color={event.backgroundColor || '#6366f1'} $muted={muted} />
                                                    <ResultContent>
                                                        <ResultTitle><PiiText value={event.title} kind="name" /></ResultTitle>
                                                        <ResultMeta><PiiValue value={props.customerName} kind="name" /> · {vehicle}</ResultMeta>
                                                    </ResultContent>
                                                </ResultLeft>
                                                {(props.totalPrice || props.totalNet) ? (
                                                    <ResultPrices>
                                                        <PriceBrutto>{formatPrice(props.totalPrice, props.currency)}</PriceBrutto>
                                                        <PriceNetto>netto {formatPrice(props.totalNet, props.currency)}</PriceNetto>
                                                    </ResultPrices>
                                                ) : null}
                                            </ResultRow>
                                        );
                                    })}
                                </DayGroup>
                            ))}
                        </>
                    )}
                </ResultsArea>
            </Panel>
        </Backdrop>
    );
};
