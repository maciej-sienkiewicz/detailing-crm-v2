// src/modules/bays/components/WeekPlanner.tsx
//
// Tydzień po stanowiskach (komputer i tablet). Wiersz = stanowisko z własnym
// podziałem dnia, oś = czas. Gesty pod myszą, wszystkie z przyciąganiem do okienek
// wiersza:
//
//   - zaznaczenie wolnych okienek → formularz rezerwacji (QuickEventModal),
//     z etykietą na żywo, zanim puścisz przycisk;
//   - przeciągnięcie paska PLANU → inne stanowisko albo inny czas (długość zostaje);
//   - chwycenie krawędzi paska planu → rozciągnięcie albo skrócenie;
//   - przeciągnięcie auta z paska „Oczekuje na przypisanie" (albo z listy „X więcej")
//     → plan bez formularza (auto już jest);
//   - przeciągnięcie paska planu na strefę u dołu ekranu → zdjęcie z planu;
//   - Alt (⌥) + przeciągnięcie dowolnego paska auta → KOPIA jako kolejny etap tego auta
//     (podnośnik rano, myjnia po południu). Oryginał zostaje na miejscu.
//
// Pasek planu łapie wciśnięcie przycisku jako początek przeciągania, a na czas gestu paski
// nie przyjmują myszy - puszczenie bez ruchu trafiało więc w wiersz pod spodem i kliknięcie
// nie otwierało podglądu. Gest bez ruchu jest dlatego obsługiwany jako kliknięcie tutaj.
//
// Faktu (zrobione, trwa) nie da się przeciągnąć - fakt zmienia się zdarzeniem na hali.
// Nałożenie planu jest dozwolone, ale nigdy ciche: przed zapisem okno pyta.
//
// Pozycja paska to czas, nie numer kolumny: wiersze z różnym podziałem dnia leżą na
// tej samej osi, a pionowa linia „teraz" przecina je wszystkie w tym samym miejscu.
//
// Tło: mocna granica dnia, co drugi dzień na ciemniejszym tle i jedno „minione" od lewej
// do teraz - wspólne dla wszystkich wierszy. Okienka są per wiersz (przerywana kreska),
// bo to w nie trafia zaznaczenie: linie pełnych godzin w wierszach, niezgodne z okienkami,
// sprawiały, że jedno okienko pod kursorem wyglądało jak kilka. Linijki godzin nie ma -
// godzinę okienka mówi podpowiedź pod kursorem i etykieta zaznaczenia.
// Pod kursorem podświetla się dokładnie to okienko, które zajmie kliknięcie.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { CalendarX2, Hourglass, MoveHorizontal } from 'lucide-react';
import { ui } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import { pluralPl } from '@/common/utils/plural';
import type { BaysSnapshot } from '../types';
import { buildWeekRows, carStages, cellBox, cellIsFree, freeCellsOn, overlapsInRange, type WeekBar, type WeekRow } from '../utils/weekLayout';
import {
    cellIndexAt, clockText, dayMonth, dayShort, durationLabel, hoursOf, longestDay, rangeText,
    timeAtWeekX, toDateKey, weekX, workMinutes, type Cell,
} from '../utils/slots';
import { Avatar, Plate } from './primitives';
import { carLabel } from '../utils/labels';

/** Ile aut pasek oczekujących pokazuje, zanim resztę schowa pod „X więcej" - jeden wiersz na komputerze. */
const TRAY_VISIBLE = 4;

export interface RangeRequest {
    bayId: string;
    start: Date;
    end: Date;
    /** Z kim nachodzi - okno potwierdzenia pokazuje to przed formularzem. */
    overlaps: WeekBar[];
}

export interface MoveRequest {
    bookingId: string | null;
    carId: string;
    bayId: string;
    start: Date;
    end: Date;
    overlaps: WeekBar[];
}

interface Props {
    snap: BaysSnapshot;
    now: Date;
    days: string[];
    canEdit: boolean;
    onRange: (r: RangeRequest) => void;
    onTapCell: (bayId: string, cell: Cell) => void;
    onMove: (m: MoveRequest) => void;
    /** Pasek planu upuszczony na strefę „zdejmij z planu". */
    onUnplan: (bookingId: string) => void;
    /** Kliknięcie paska: podgląd usług auta (BarPreviewDrawer w WeekView). */
    onOpenBar: (bar: WeekBar, bayId: string) => void;
    /** Kliknięcie auta z paska „Oczekuje na przypisanie" - podgląd auta bez paska. */
    onOpenCar: (car: BaysSnapshot['cars'][number]) => void;
}

/** Wiersz ma stałą wysokość jednego paska; nałożone paski dzielą ją między siebie. */
const ROW_H = 56;
const LANE_MIN = 34;
const rowHeight = (lanes: number) => Math.max(ROW_H, lanes * LANE_MIN + 8);
const pct = (v: number) => `${(v * 100).toFixed(4)}%`;

const Scroller = styled.div`
    overflow-x: auto;
    overscroll-behavior-x: contain;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
`;

/* Kolumna nazw węższa na tablecie: tam każdy piksel osi to czytelniejszy pasek. */
const Grid = styled.div<{ $days: number }>`
    --label-w: 168px;
    min-width: calc(var(--label-w) + ${p => p.$days * 132}px);
    display: flex;
    flex-direction: column;

    @media (max-width: 1023px) { --label-w: 124px; }
`;

const rowGrid = css`
    display: grid;
    grid-template-columns: var(--label-w) minmax(0, 1fr);
`;

const HeadRow = styled.div`
    ${rowGrid}
    position: sticky;
    top: 0;
    z-index: 6;
    background: ${ui.surface};
    border-bottom: 1px solid ${ui.line};
`;

const Corner = styled.div`
    position: sticky;
    left: 0;
    z-index: 2;
    background: ${ui.surface};
    border-right: 1px solid ${ui.line};
`;

/* Same nazwy dni. Bez linijki godzin: w wierszach liczą się okienka stanowiska
   („Podział dnia"), a godziny nad nimi nie trafiały w ich granice. */
const Axis = styled.div`
    position: relative;
    display: flex;
`;

/* Granica dnia - mocniejsza niż linie godzin, ciągnie się przez nagłówek i wszystkie wiersze. */
const DAY_LINE = '#cbd5e1';
/* Co drugi dzień leży na odrobinę ciemniejszym tle: dzień czyta się jako pas, nie jako
   odcinek między dwiema kreskami. */
const DAY_ALT = '#fafbfd';
const TODAY_BG = '#f3f8fb';

const DayHead = styled.div<{ $today: boolean; $alt: boolean }>`
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 9px 10px;
    border-left: 1px solid ${DAY_LINE};
    &:first-child { border-left: none; }
    background: ${p => (p.$today ? TODAY_BG : p.$alt ? DAY_ALT : 'transparent')};

    strong { font-size: 13.5px; font-weight: 700; color: ${p => (p.$today ? ui.brandDeep : ui.ink)}; }
    span { font-size: 12px; color: ${p => (p.$today ? ui.brandDeep : ui.textMuted)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const Row = styled.div`
    ${rowGrid}
    border-bottom: 1px solid ${ui.lineSoft};
    &:last-child { border-bottom: none; }
`;

const RowLabel = styled.div`
    position: sticky;
    left: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 8px 14px;
    background: ${ui.surface};
    border-right: 1px solid ${ui.line};

    strong { font-size: 14px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 12px; color: ${ui.textMuted}; }
`;

const Track = styled.div<{ $lanes: number; $selectable: boolean; $target: boolean }>`
    position: relative;
    height: ${p => rowHeight(p.$lanes)}px;
    cursor: ${p => (p.$selectable ? 'cell' : 'default')};
    touch-action: pan-x pan-y;
    /* Wiersz, nad którym wisi przenoszone auto - widać, na które stanowisko trafi. */
    background: ${p => (p.$target ? 'rgba(240, 246, 249, 0.85)' : 'transparent')};
    transition: background 120ms ease;
`;

/*
 * Pasek „w ręce": idzie za kursorem co do piksela (pozycja pisana wprost w styl, bez
 * renderu Reacta), a obrys w wierszu pokazuje okienka, do których się przyciągnie.
 * Samo skakanie obrysu o całe okienka wyglądało na zacinanie się przeciągania.
 */
const DragAvatar = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2000;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    padding: 0 10px;
    box-sizing: border-box;
    border-radius: 8px;
    border: 1.5px solid ${ui.brandLine};
    background: ${ui.surface};
    color: ${ui.inkSoft};
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
    /* Półprzezroczysty: pod spodem widać obrys okienek, do których pasek się przyciągnie. */
    opacity: 0.78;
    overflow: hidden;
    white-space: nowrap;
    will-change: transform;

    span { font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
`;

const Abs = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
`;

const DayBand = styled(Abs)<{ $today: boolean }>`
    background: ${p => (p.$today ? TODAY_BG : DAY_ALT)};
`;

const DayLine = styled(Abs)`
    width: 0;
    border-left: 1px solid ${DAY_LINE};
`;

const Past = styled(Abs)`
    left: 0;
    background: rgba(241, 245, 249, 0.6);
`;

const SlotLine = styled(Abs)`
    width: 0;
    border-left: 1px dashed ${ui.line};
`;

/* Okienko pod kursorem: to, co zajmie kliknięcie albo początek zaznaczenia. */
const HoverCell = styled(Abs)`
    top: 3px;
    bottom: 3px;
    border-radius: 8px;
    /* Samo tło, bez obrysu: przerywany obrys to plan, a to jeszcze nie jest plan. */
    background: ${ui.brandTint};
`;

/* Godziny okienka w dymku nad nim - w samym okienku (myjnia co godzinę, 14 na dzień)
   nie mieściły się i ucinały do „13:0…". Poza siatką, więc nie zasłania pasków. */
const HoverTip = styled.div`
    position: fixed;
    z-index: 1800;
    transform: translate(-50%, calc(-100% - 6px));
    padding: 4px 8px;
    border-radius: 6px;
    background: ${ui.ink};
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
`;

const Closed = styled(Abs)`
    background: repeating-linear-gradient(135deg, ${ui.surfaceAlt} 0 6px, ${ui.surface} 6px 12px);
`;

/* Linia „teraz" leży NAD paskami (pod podglądem przeciągania) - pod nimi znikała akurat
   na pasku „trwa", przy którym pytanie „ile już minęło" pada najczęściej. Pasek pod nią
   dalej łapie kliknięcia: linia ich nie przyjmuje (Abs). */
const NowLine = styled(Abs)`
    width: 0;
    border-left: 1.5px solid ${ui.brand};
    z-index: 4;
`;

const BAR_TONES = {
    done: css`background: ${ui.surfaceAlt}; border: 1px solid ${ui.line}; color: ${ui.inkSoft};`,
    active: css`background: ${ui.brandTintHover}; border: 1px solid ${ui.brandLine}; color: ${ui.brandDeep};`,
    plan: css`background: ${ui.surface}; border: 1.5px dashed ${ui.brandLine}; color: ${ui.inkSoft};`,
};

const Bar = styled.div<{ $tone: keyof typeof BAR_TONES; $conflict: boolean; $over: boolean; $ghosted: boolean; $grab: boolean; $live: boolean; $linked: boolean }>`
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    padding: 0 9px;
    box-sizing: border-box;
    border-radius: 8px;
    overflow: hidden;
    cursor: ${p => (p.$grab ? 'grab' : 'pointer')};
    pointer-events: ${p => (p.$live ? 'auto' : 'none')};
    ${p => BAR_TONES[p.$tone]}
    ${p => p.$conflict && css`border-color: #f59e0b; box-shadow: inset 0 0 0 1px #f59e0b;`}
    ${p => p.$over && css`box-shadow: inset -4px 0 0 #f59e0b;`}
    /* Inny etap tego samego auta co pasek pod kursorem - trasa auta przez halę. */
    ${p => p.$linked && css`outline: 2px solid ${ui.brand}; outline-offset: 1px;`}
    opacity: ${p => (p.$ghosted ? 0.3 : 1)};
    touch-action: pan-x pan-y;
    container-type: inline-size;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }

    /* Wąski pasek: zostaje sama tablica, opis jest w dymku i w podglądzie. */
    /* Wąski pasek: zostaje sama tablica (ucięta wielokropkiem), numer etapu i opis są
       w dymku i w podglądzie. Nigdy pusty kafelek - po coś w niego się klika. */
    @container (max-width: 90px) {
        padding: 0 6px;
        > [data-stage] { display: none; }
    }
`;

/* Numer etapu auta („2/3") - tylko gdy auto ma w planie więcej niż jeden etap. */
const StageChip = styled.span`
    flex-shrink: 0;
    padding: 0 5px;
    border-radius: 5px;
    background: rgba(15, 23, 42, 0.07);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 16px;
`;

/* Uchwyt krawędzi: szeroki na 10 px, żeby trafić myszą, widoczny po najechaniu. */
const Handle = styled.span<{ $side: 'start' | 'end' }>`
    position: absolute;
    top: 0;
    bottom: 0;
    ${p => (p.$side === 'start' ? 'left: 0;' : 'right: 0;')}
    width: 10px;
    cursor: ew-resize;
    z-index: 1;

    &::after {
        content: '';
        position: absolute;
        top: 30%;
        bottom: 30%;
        ${p => (p.$side === 'start' ? 'left: 3px;' : 'right: 3px;')}
        width: 3px;
        border-radius: 2px;
        background: ${ui.brandLine};
        opacity: 0;
        transition: opacity 120ms ease;
    }
    ${Bar}:hover &::after { opacity: 1; }
`;

/* Niski pasek (kilka aut naraz): jedna linia - tablica i opis obok siebie. */
const BarText = styled.span<{ $compact?: boolean }>`
    display: flex;
    flex-direction: ${p => (p.$compact ? 'row' : 'column')};
    align-items: ${p => (p.$compact ? 'baseline' : 'stretch')};
    gap: ${p => (p.$compact ? '6px' : '1px')};
    min-width: 0;

    > span {
        font-size: 12px;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    > :first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

    @container (max-width: 90px) { > span:last-child:not(:first-child) { display: none; } }
`;

const Ghost = styled.div<{ $warn: boolean }>`
    position: absolute;
    top: 3px;
    bottom: 3px;
    z-index: 5;
    pointer-events: none;
    padding: 4px 9px;
    box-sizing: border-box;
    border-radius: 9px;
    border: 2px solid ${p => (p.$warn ? '#f59e0b' : ui.brand)};
    background: ${p => (p.$warn ? 'rgba(255, 251, 235, 0.94)' : 'rgba(240, 246, 249, 0.94)')};
    color: ${p => (p.$warn ? ui.warnInk : ui.brandDeep)};
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.35;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    white-space: nowrap;

    > * { overflow: hidden; text-overflow: ellipsis; }
    span { font-weight: 500; }
`;

/*
 * Strefa „zdejmij z planu" - pojawia się tylko w trakcie przeciągania planu, przyklejona
 * do dołu okna: wstawiona nad osią przesuwałaby całą siatkę pod kursorem.
 */
const UnplanZone = styled.div<{ $over: boolean }>`
    position: fixed;
    left: 50%;
    bottom: 24px;
    z-index: 1900;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 28px;
    border-radius: ${ui.radiusPanel};
    border: 2px dashed ${p => (p.$over ? ui.dangerInk : ui.dangerLine)};
    background: ${p => (p.$over ? ui.dangerTint : 'rgba(255, 255, 255, 0.96)')};
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
    color: ${ui.dangerInk};
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    transition: background 120ms ease, border-color 120ms ease;

    svg { width: 18px; height: 18px; }
`;

/*
 * Jeden wiersz nad planem: chipsy zwężają się (wielokropek), a nagłówek i „X więcej”
 * zostają w całości. Zawijany pasek przy długich nazwach prac zajmował dwa-trzy wiersze.
 */
const Tray = styled.div`
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
    color: ${ui.textSecondary};

    > strong { flex-shrink: 0; font-weight: 700; color: ${ui.ink}; margin-right: 4px; white-space: nowrap; }
    > button, > div { flex-shrink: 0; }
    > button[data-tray-chip] { flex: 0 1 auto; min-width: 110px; }
`;

const TrayChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    border-radius: ${ui.radiusControl};
    border: 1px dashed ${ui.lineStrong};
    background: ${ui.surface};
    font-family: inherit;
    font-size: 12.5px;
    color: ${ui.inkSoft};
    cursor: grab;
    /* Nazwa pracy bywa całą listą usług - chips ucina ją, pełna jest w podpowiedzi. */
    max-width: 230px;
    min-width: 0;

    svg { width: 14px; height: 14px; color: ${ui.textMuted}; flex-shrink: 0; }
    &:hover { border-color: ${ui.brandLine}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

/*
 * „X więcej": pasek pokazuje kilka aut, resztę lista pod przyciskiem. Przy kilkunastu
 * rezerwacjach tygodnia pasek zajmował cztery wiersze nad planem, a plan to jest to, na co
 * się tu patrzy. Przycisk ma wygląd chipsa bez kreskowanej obwódki - nie da się go przeciągnąć.
 */
const TrayMore = styled.button`
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 12px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${ui.line};
    background: ${ui.surfaceAlt};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;

    &:hover { border-color: ${ui.brandLine}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const TrayMoreWrap = styled.div`
    position: relative;
`;

/* Nazwa pracy w jednej linii z wielokropkiem - chips ma stałą wysokość. */
const TrayJob = styled.span`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/* Lista pozostałych aut. Wiersz chwyta się tak samo jak chips - lista znika, gdy auto ruszy. */
const TrayPanel = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    /* Przycisk stoi na końcu paska - lista otwiera się w lewo, żeby nie wyjść za ekran. */
    right: 0;
    z-index: 30;
    width: min(420px, calc(100vw - 32px));
    max-height: 360px;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: ${ui.surface};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);

    > p { margin: 2px 4px 4px; font-size: 12.5px; color: ${ui.textSecondary}; }
    > button { width: 100%; max-width: none; flex-shrink: 0; justify-content: flex-start; }
`;

/* Rezerwacja (auto jeszcze nie przyjęte) - dopisek, żeby nie mylić z autem na placu. */
const TrayTag = styled.span`
    padding: 0 6px;
    border-radius: 5px;
    background: ${ui.surfaceAlt};
    font-size: 11px;
    font-weight: 600;
    color: ${ui.textSecondary};
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 12.5px;
    color: ${ui.textSecondary};
`;

/* Klawisz w legendzie - wygląda jak klawisz, żeby nie czytać go jako słowa. */
const Kbd = styled.kbd`
    display: inline-block;
    min-width: 22px;
    margin-right: 4px;
    padding: 0 6px;
    border: 1px solid ${ui.line};
    border-bottom-width: 2px;
    border-radius: 5px;
    background: ${ui.surface};
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
    color: ${ui.inkSoft};
`;

const Swatch = styled.span<{ $tone: keyof typeof BAR_TONES }>`
    display: inline-block;
    width: 22px;
    height: 12px;
    margin-right: 7px;
    vertical-align: -2px;
    border-radius: 4px;
    ${p => BAR_TONES[p.$tone]}
`;

type Drag =
    | { kind: 'select'; rowId: string; anchor: number; current: number }
    | { kind: 'move'; carId: string; bookingId: string | null; minutes: number; grabMs: number; rowId: string; startIdx: number; len: number; moved: boolean; startX: number; out?: boolean; barId: string | null; copy?: boolean }
    | { kind: 'resize'; carId: string; bookingId: string | null; rowId: string; edge: 'start' | 'end'; startIdx: number; endIdx: number; minEnd: number; keepStart: Date | null; origEnd: number; origStart: number };

export function WeekPlanner({ snap, now, days, canEdit, onRange, onTapCell, onMove, onUnplan, onOpenBar, onOpenCar }: Props) {
    const { rows } = useMemo(() => buildWeekRows(snap, days, now), [snap, days, now]);
    /** Etapy aut, które mają ich więcej niż jeden: id paska → „numer z liczby". */
    const stageOf = useMemo(() => {
        const out = new Map<string, { n: number; of: number }>();
        const carIds = new Set(rows.flatMap(r => r.bars.map(b => b.carId)));
        for (const carId of carIds) {
            const stages = carStages(snap, carId, now);
            if (stages.length < 2) continue;
            stages.forEach((st, i) => out.set(st.barId, { n: i + 1, of: stages.length }));
        }
        return out;
    }, [rows, snap, now]);
    const [drag, setDrag] = useState<Drag | null>(null);
    const [hover, setHover] = useState<{ rowId: string; idx: number } | null>(null);
    /** Auto pod kursorem - jego pozostałe etapy dostają obwódkę. */
    const [hoverCar, setHoverCar] = useState<string | null>(null);
    const [trayOpen, setTrayOpen] = useState(false);
    const trayMoreRef = useRef<HTMLDivElement>(null);

    // Lista „X więcej" zamyka się kliknięciem obok i Esc, jak każde menu.
    useEffect(() => {
        if (!trayOpen) return;
        const outside = (e: PointerEvent) => {
            if (!trayMoreRef.current?.contains(e.target as Node)) setTrayOpen(false);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setTrayOpen(false); };
        window.addEventListener('pointerdown', outside);
        window.addEventListener('keydown', esc);
        return () => {
            window.removeEventListener('pointerdown', outside);
            window.removeEventListener('keydown', esc);
        };
    }, [trayOpen]);
    const dragRef = useRef<Drag | null>(null);
    dragRef.current = drag;
    const tracks = useRef(new Map<string, HTMLDivElement>());
    const scrollerRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    /** Gdzie w pasku chwycono (px) i jego rozmiar - podgląd stoi pod kursorem tak, jak go złapano. */
    const grabRef = useRef({ dx: 0, dy: 0, w: 160, h: 40 });
    const pointerRef = useRef({ x: 0, y: 0 });
    const suppressClick = useRef(false);
    const todayKey = toDateKey(now);
    const day = longestDay();
    const nowX = weekX(now, days);
    const todayHours = hoursOf(todayKey);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowVisible = days.includes(todayKey) && !!todayHours && nowMin >= todayHours.opens && nowMin <= todayHours.closes;

    const rowById = (id: string) => rows.find(r => r.rowId === id);
    const bayName = (id: string) => snap.bays.find(b => b.id === id)?.name ?? '';
    /** Okienko pod kursorem w danym wierszu. */
    const cellAt = (row: WeekRow, clientX: number): number => {
        const el = tracks.current.get(row.rowId);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return cellIndexAt(row.cells, timeAtWeekX((clientX - r.left) / r.width, days));
    };
    /** Wiersz pod kursorem - pasek planu można przenieść na inne stanowisko. */
    const rowAt = (clientX: number, clientY: number): WeekRow | undefined => {
        const el = document.elementFromPoint(clientX, clientY)?.closest('[data-bay-row]');
        return el ? rowById(el.getAttribute('data-bay-row') ?? '') : undefined;
    };
    /** Pierwsze okienko, które jeszcze się nie skończyło - wcześniej nie da się planować. */
    const firstOpen = (row: WeekRow) => {
        const i = row.cells.findIndex(c => c.end > now);
        return i === -1 ? row.cells.length : i;
    };
    /**
     * Okienko, którego POCZĄTEK leży najbliżej chwili - przyciąganie zaokrągla, a nie
     * ucina w dół: pasek przesunięty o trzy czwarte okienka idzie do następnego.
     */
    const nearestCell = (row: WeekRow, t: Date): number => {
        let best = 0;
        let bestDiff = Infinity;
        row.cells.forEach((c, i) => {
            const diff = Math.abs(c.start.getTime() - t.getTime());
            if (diff < bestDiff) { best = i; bestDiff = diff; }
        });
        return best;
    };
    const range = (row: WeekRow, a: number, b: number) => {
        const lo = Math.max(firstOpen(row), Math.min(a, b));
        const hi = Math.min(row.cells.length - 1, Math.max(a, b, lo));
        return { lo, hi, start: row.cells[lo]?.start, end: row.cells[hi]?.end };
    };
    const moveTarget = (d: Extract<Drag, { kind: 'move' }>) => {
        const row = rowById(d.rowId);
        if (!row) return null;
        const lo = Math.max(firstOpen(row), d.startIdx);
        const hi = Math.min(row.cells.length - 1, lo + d.len - 1);
        if (!row.cells[lo] || !row.cells[hi]) return null;
        return { row, start: row.cells[lo].start, end: row.cells[hi].end };
    };

    // Ruch i koniec gestu łapiemy na oknie: kursor poza siatką też kończy zaznaczenie.
    useEffect(() => {
        if (!drag) return;
        let raf = 0;
        /**
         * Przewijanie osi przy krawędzi - tydzień na tablecie nie mieści się w oknie.
         * Lewa strefa zaczyna się za przyklejoną kolumną nazw stanowisk.
         */
        const autoScroll = () => {
            raf = 0;
            const el = scrollerRef.current;
            if (!el || !dragRef.current || el.scrollWidth <= el.clientWidth) return;
            const r = el.getBoundingClientRect();
            const { x, y } = pointerRef.current;
            const left = r.left + (window.innerWidth < 1024 ? 124 : 168);
            const edge = 56;
            const speed = x > r.left && x < left + edge ? -Math.ceil((left + edge - x) / 8)
                : x > r.right - edge && x < r.right + 80 ? Math.ceil((x - (r.right - edge)) / 8) : 0;
            if (speed === 0) return;
            el.scrollLeft += speed;
            track(x, y);
            raf = requestAnimationFrame(autoScroll);
        };
        const track = (clientX: number, clientY: number) => {
            const d = dragRef.current;
            if (!d) return;
            const e = { clientX, clientY };
            if (d.kind === 'select') {
                const row = rowById(d.rowId);
                if (row) { const i = cellAt(row, e.clientX); if (i !== d.current) setDrag({ ...d, current: i }); }
            } else if (d.kind === 'resize') {
                const row = rowById(d.rowId);
                if (!row) return;
                const i = cellAt(row, e.clientX);
                const next = d.edge === 'end'
                    ? { ...d, endIdx: Math.max(d.startIdx, d.minEnd, i) }
                    : { ...d, startIdx: Math.max(firstOpen(row), Math.min(d.endIdx, i)) };
                if (next.startIdx !== d.startIdx || next.endIdx !== d.endIdx) setDrag(next);
            } else {
                const out = !!d.bookingId && !!document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-unplan]');
                if (out !== !!d.out) setDrag({ ...d, out });
                if (out) {
                    const a = avatarRef.current;
                    if (a) a.style.transform = `translate(${e.clientX - grabRef.current.dx}px, ${e.clientY - grabRef.current.dy}px)`;
                    return;
                }
                const row = rowAt(e.clientX, e.clientY) ?? rowById(d.rowId);
                if (!row) return;
                const el = tracks.current.get(row.rowId);
                if (!el) return;
                const r = el.getBoundingClientRect();
                const t = new Date(timeAtWeekX((e.clientX - r.left) / r.width, days).getTime() - d.grabMs);
                // Inny podział dnia w nowym wierszu: długość w okienkach liczymy od czasu, nie od liczby okienek.
                const len = Math.max(1, Math.round(d.minutes / (day / row.bay.slotsPerDay)));
                const startIdx = nearestCell(row, t);
                const moved = d.moved || Math.abs(e.clientX - d.startX) > 4;
                const a = avatarRef.current;
                if (a) a.style.transform = `translate(${e.clientX - grabRef.current.dx}px, ${e.clientY - grabRef.current.dy}px)`;
                if (out !== !!d.out || moved !== d.moved || row.rowId !== d.rowId || startIdx !== d.startIdx || len !== d.len) {
                    setDrag({ ...d, rowId: row.rowId, startIdx, len, moved, out });
                }
            }
        };
        const moveHandler = (e: PointerEvent) => {
            pointerRef.current = { x: e.clientX, y: e.clientY };
            track(e.clientX, e.clientY);
            if (!raf && dragRef.current?.kind !== 'select') raf = requestAnimationFrame(autoScroll);
        };
        // Gest przerwany przez system (zmiana okna, dotyk przejęty przez przewijanie):
        // nic nie zapisujemy, podgląd znika - zamiast paska „przyklejonego" do kursora.
        const cancel = () => setDrag(null);
        const up = () => {
            const d = dragRef.current;
            setDrag(null);
            if (!d) return;
            if (d.kind === 'select') {
                const row = rowById(d.rowId);
                if (!row) return;
                const r = range(row, d.anchor, d.current);
                if (r.start && r.end) onRange({ bayId: row.rowId, start: r.start, end: r.end, overlaps: overlapsInRange(row, r.start, r.end) });
                return;
            }
            if (d.kind === 'resize') {
                const row = rowById(d.rowId);
                if (!row) return;
                suppressClick.current = true;
                // Chwycona krawędź puszczona w tym samym okienku - nic się nie zmieniło.
                if (d.startIdx === d.origStart && d.endIdx === d.origEnd) return;
                const start = d.keepStart ?? row.cells[d.startIdx].start;
                const end = row.cells[d.endIdx].end;
                // Skrócenie przed początek planu nie ma sensu - zamiast błędu serwera pasek wraca.
                if (end <= start) return;
                onMove({ bookingId: d.bookingId, carId: d.carId, bayId: d.rowId, start, end, overlaps: overlapsInRange(row, start, end, d.carId) });
                return;
            }
            if (!d.moved && !d.barId) {
                // Chips z paska oczekujących puszczony bez ruchu - kliknięcie, podgląd auta.
                const car = snap.cars.find(c => c.id === d.carId);
                if (car) onOpenCar(car);
                return;
            }
            if (!d.moved) {
                // Wciśnięcie i puszczenie bez ruchu to kliknięcie w pasek - otwiera podgląd.
                const hit = rows.flatMap(r => r.bars.map(bar => ({ bar, rowId: r.rowId }))).find(x => x.bar.id === d.barId);
                if (hit) { suppressClick.current = true; onOpenBar(hit.bar, hit.rowId); }
                return;
            }
            suppressClick.current = true;
            if (d.out && d.bookingId) { onUnplan(d.bookingId); return; }
            const target = moveTarget(d);
            if (!target) return;
            onMove({
                bookingId: d.bookingId, carId: d.carId, bayId: target.row.rowId, start: target.start, end: target.end,
                overlaps: overlapsInRange(target.row, target.start, target.end, d.carId),
            });
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrag(null); };
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        window.addEventListener('keydown', esc);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('blur', cancel);
            window.removeEventListener('keydown', esc);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag !== null]);

    const onTrackDown = (e: React.PointerEvent, row: WeekRow) => {
        if (!canEdit || e.button !== 0) return;
        const i = cellAt(row, e.clientX);
        if (i < firstOpen(row)) return;
        if (e.pointerType === 'touch') return; // dotyk przewija; tap obsługuje onClick
        e.preventDefault();
        setDrag({ kind: 'select', rowId: row.rowId, anchor: i, current: i });
    };

    const onTrackClick = (e: React.MouseEvent, row: WeekRow) => {
        if ((e.nativeEvent as PointerEvent).pointerType !== 'touch' || !canEdit) return;
        const c = row.cells[cellAt(row, e.clientX)];
        if (c && c.end > now && cellIsFree(row, c)) onTapCell(row.rowId, c);
    };

    const onBarDown = (e: React.PointerEvent, bar: WeekBar, row: WeekRow) => {
        e.stopPropagation();
        // Nowy gest: blokada kliknięcia z poprzedniego przeciągania już nie obowiązuje
        // (upuszczenie poza paskiem, np. na strefę „zdejmij z planu", nie zjada jej kliknięciem).
        suppressClick.current = false;
        const copy = e.altKey && bar.kind !== 'done' && !!(bar.car.visitId || bar.car.appointmentId);
        if ((bar.kind !== 'plan' && !copy) || !canEdit || e.pointerType === 'touch' || e.button !== 0) return;
        // Bez tego przeglądarka zaczyna zaznaczać tekst albo własne przeciąganie elementu.
        e.preventDefault();
        const el = tracks.current.get(row.rowId);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        grabRef.current = { dx: e.clientX - box.left, dy: e.clientY - box.top, w: box.width, h: box.height };
        pointerRef.current = { x: e.clientX, y: e.clientY };
        const t = timeAtWeekX((e.clientX - r.left) / r.width, days);
        const startIdx = cellIndexAt(row.cells, bar.start);
        const endIdx = cellIndexAt(row.cells, new Date(bar.end.getTime() - 60_000));
        setDrag({
            kind: 'move', carId: bar.carId,
            // Kopia nie ma planu - zapis utworzy nowy dla tego auta.
            bookingId: copy ? null : bar.bookingId,
            // Długość kopii to długość paska (u „trwa" - do końca planu), nie przepracowany czas.
            minutes: copy ? workMinutes(bar.start, bar.end) : bar.minutes,
            grabMs: Math.max(0, t.getTime() - bar.start.getTime()), rowId: row.rowId, startIdx, len: endIdx - startIdx + 1, moved: false, startX: e.clientX,
            barId: bar.id, copy,
        });
    };

    const onHandleDown = (e: React.PointerEvent, bar: WeekBar, row: WeekRow, edge: 'start' | 'end') => {
        e.stopPropagation();
        if (e.button !== 0) return;
        e.preventDefault();
        setDrag({
            kind: 'resize', carId: bar.carId, bookingId: bar.bookingId, rowId: row.rowId, edge,
            startIdx: cellIndexAt(row.cells, bar.start), endIdx: cellIndexAt(row.cells, new Date(bar.end.getTime() - 60_000)),
            origStart: cellIndexAt(row.cells, bar.start), origEnd: cellIndexAt(row.cells, new Date(bar.end.getTime() - 60_000)),
            // Trwająca praca nie skończy się w przeszłości: najkrócej do okienka z „teraz".
            minEnd: bar.kind === 'active' ? cellIndexAt(row.cells, now) : 0,
            // Zmiana trwającej pracy przesuwa tylko koniec. Początek: wcześniejszy z planu i wjazdu -
            // auto bywa wstawione przed planem (plan od środy, wjazd w niedzielę), a skrócenie
            // do wtorku dawało wtedy koniec przed początkiem planu i błąd „Koniec planu musi
            // być późniejszy niż początek".
            keepStart: bar.kind === 'active'
                ? new Date(Math.min(bar.start.getTime(), new Date(snap.bookings.find(b => b.id === bar.bookingId)?.start ?? bar.start).getTime()))
                : null,
        });
    };

    /** Zwraca, czy przeciąganie ruszyło - dotyk i prawy przycisk go nie zaczynają. */
    const onTrayDown = (e: React.PointerEvent, carId: string): boolean => {
        if (!canEdit || e.pointerType === 'touch' || e.button !== 0) return false;
        e.preventDefault();
        grabRef.current = { dx: 16, dy: 18, w: 180, h: 40 };
        // Bez planu nie wiadomo, ile auto postoi - zaczynamy od jednego okienka, potem rozciągnij.
        // `moved: false` - dopiero ruch o kilka pikseli robi z wciśnięcia przeciąganie;
        // puszczenie w miejscu to kliknięcie i otwiera podgląd auta (jak przy pasku planu).
        setDrag({ kind: 'move', carId, bookingId: null, minutes: 1, grabMs: 0, rowId: '', startIdx: -1, len: 1, moved: false, startX: e.clientX, barId: null });
        return true;
    };

    // Auta bez planu: przyjęte (w warsztacie) i rezerwacje z kalendarza z zakresu osi -
    // rezerwację da się położyć na stanowisku, zanim auto przyjedzie. Bez aut z pracą
    // skończoną („Gotowe do wydania"): one już nie czekają na stanowisko.
    const unplanned = snap.cars.filter(c => (c.stage === 'IN_SHOP' || c.stage === 'BOOKED') && !c.workDone
        && !snap.bookings.some(b => b.carId === c.id)
        && !snap.stints.some(s => s.carId === c.id && s.endedAt === null));

    // Chips auta czekającego na stanowisko - ten sam w pasku i na liście „X więcej".
    // Auto bez tablicy nie dostaje zastępczego napisu: wystarczy, co jest przy nim do zrobienia.
    const trayChip = (c: BaysSnapshot['cars'][number]) => (
        <TrayChip
            key={c.id}
            type="button"
            data-tray-chip
            onPointerDown={e => { if (onTrayDown(e, c.id)) setTrayOpen(false); }}
            title={`${c.jobTitle}\nPrzeciągnij na stanowisko`}
        >
            <MoveHorizontal aria-hidden="true" />
            {c.licensePlate && <Plate $size="sm">{c.licensePlate}</Plate>}
            <TrayJob>{c.jobTitle}</TrayJob>
            {c.stage === 'BOOKED' && <TrayTag>rezerwacja</TrayTag>}
        </TrayChip>
    );

    const ghostFor = (row: WeekRow) => {
        const d = drag;
        if (!d || d.rowId !== row.rowId) return null;
        let start: Date | undefined;
        let end: Date | undefined;
        let title = '';
        let hits: WeekBar[] = [];
        if (d.kind === 'select') {
            const r = range(row, d.anchor, d.current);
            start = r.start; end = r.end;
            title = bayName(row.rowId);
            if (start && end) hits = overlapsInRange(row, start, end);
        } else if (d.kind === 'resize') {
            start = d.keepStart ?? row.cells[d.startIdx]?.start; end = row.cells[d.endIdx]?.end;
            title = carLabel(snap.cars.find(c => c.id === d.carId));
            if (start && end) hits = overlapsInRange(row, start, end, d.carId);
        } else if (d.startIdx >= 0 && d.moved && !d.out) {
            const t = moveTarget(d);
            if (t) { start = t.start; end = t.end; }
            title = `${d.copy ? 'Kolejny etap: ' : ''}${carLabel(snap.cars.find(c => c.id === d.carId))} na ${bayName(row.rowId)}`;
            if (start && end) hits = overlapsInRange(row, start, end, d.carId);
        }
        if (!start || !end) return null;
        const x = weekX(start, days);
        const w = weekX(end, days) - x;
        return (
            <Ghost $warn={hits.length > 0} style={{ left: pct(x), width: pct(w) }} aria-live="polite">
                <div>{title}</div>
                <span>{rangeText(start, end, now)}{hits.length ? `, nachodzi na ${hits.map(h => carLabel(h.car)).join(', ')}` : ''}</span>
            </Ghost>
        );
    };

    /** Pozycja paska: pełna wysokość wiersza, dzielona tylko z paskami, które na niego nachodzą. */
    const barBox = (bar: WeekBar, row: WeekRow): React.CSSProperties => {
        const inner = rowHeight(row.lanes) - 8;
        const gap = bar.laneCount > 1 ? 3 : 0;
        const h = inner / bar.laneCount;
        return { left: pct(bar.x), width: pct(bar.w), top: 4 + bar.lane * h, height: h - gap };
    };

    const renderBar = (bar: WeekBar, row: WeekRow) => {
        const people = snap.settings.trackPeople
            ? bar.personIds.map(id => snap.people.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)
            : [];
        const curing = !!bar.curingUntil && new Date(bar.curingUntil) > now;
        const sub = bar.kind === 'plan'
            ? `${bar.car.jobTitle}, ${durationLabel(bar.minutes)}`
            : curing ? `Schnie do ${formatClockTime(bar.curingUntil)}`
                : bar.car.jobTitle;
        const ghosted = !!drag && drag.kind !== 'select' && (drag.kind === 'resize' || (drag.moved && !drag.copy)) && drag.carId === bar.carId && bar.kind !== 'done';
        const editable = bar.kind === 'plan' && canEdit && !!bar.bookingId;
        // Trwająca praca: początek to fakt (wjazd), koniec to plan - ten wolno przeciągnąć.
        const endEditable = editable || (bar.kind === 'active' && canEdit && !!bar.car.visitId);
        return (
            <Bar
                key={bar.id}
                role="button"
                tabIndex={0}
                $tone={bar.kind}
                $conflict={bar.conflict}
                $over={bar.overPlan}
                $ghosted={ghosted}
                $grab={editable}
                $live={!drag}
                $linked={!drag && hoverCar === bar.carId && stageOf.has(bar.id)}
                onPointerEnter={() => setHoverCar(bar.carId)}
                onPointerLeave={() => setHoverCar(c => (c === bar.carId ? null : c))}
                style={barBox(bar, row)}
                onPointerDown={e => onBarDown(e, bar, row)}
                onClick={e => {
                    e.stopPropagation();
                    if (suppressClick.current) { suppressClick.current = false; return; }
                    onOpenBar(bar, row.rowId);
                }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenBar(bar, row.rowId); } }}
                aria-label={`${carLabel(bar.car)}, ${sub}, ${rangeText(bar.start, bar.end, now)}`}
                title={`${carLabel(bar.car)}, ${sub}\n${rangeText(bar.start, bar.end, now)}`}
            >
                {editable && <Handle $side="start" onPointerDown={e => onHandleDown(e, bar, row, 'start')} aria-hidden="true" />}
                {people.length > 0 && <Avatar person={people[0]} size={24} />}
                {curing && <Hourglass aria-hidden="true" size={14} />}
                {stageOf.has(bar.id) && (
                    <StageChip data-stage title={`Etap ${stageOf.get(bar.id)!.n} z ${stageOf.get(bar.id)!.of}`}>
                        {stageOf.get(bar.id)!.n}/{stageOf.get(bar.id)!.of}
                    </StageChip>
                )}
                <BarText $compact={bar.laneCount > 1}>
                    {bar.car.licensePlate && <Plate $size="sm" style={{ color: 'inherit' }}>{bar.car.licensePlate}</Plate>}
                    <span>{sub}</span>
                </BarText>
                {endEditable && <Handle $side="end" onPointerDown={e => onHandleDown(e, bar, row, 'end')} aria-hidden="true" />}
            </Bar>
        );
    };

    const pastX = weekX(now, days);
    const hoverBox = (row: WeekRow) => {
        if (!hover || drag || hover.rowId !== row.rowId) return null;
        const c = row.cells[hover.idx];
        if (!c || c.end <= now || !cellIsFree(row, c)) return null;
        const b = cellBox(c, days);
        const r = tracks.current.get(row.rowId)?.getBoundingClientRect();
        return (
            <>
                <HoverCell style={{ left: pct(b.x), width: pct(b.w) }} />
                {r && createPortal(
                    <HoverTip role="tooltip" style={{ left: r.left + (b.x + b.w / 2) * r.width, top: r.top }}>
                        {dayShort(c.date)} {clockText(c.start)}–{clockText(c.end)}
                    </HoverTip>,
                    document.body,
                )}
            </>
        );
    };

    const dayBackground = (row: WeekRow) => (
        <>
            {days.map((d, i) => {
                const h = hoursOf(d)!;
                const open = (h.closes - h.opens) / day;
                const left = i / days.length;
                return (
                    <span key={d}>
                        {(d === todayKey || i % 2 === 1) && <DayBand $today={d === todayKey} style={{ left: pct(left), width: pct(1 / days.length) }} />}
                        {open < 1 && <Closed style={{ left: pct((i + open) / days.length), width: pct((1 - open) / days.length) }} />}
                        {i > 0 && <DayLine style={{ left: pct(left) }} />}
                    </span>
                );
            })}
            {pastX > 0 && <Past style={{ width: pct(pastX) }} />}
            {row.cells.map((c, ci) => {
                // Pierwsze okienko dnia zaczyna się na granicy dnia - tam kreska już jest.
                if (ci === 0 || row.cells[ci - 1].date !== c.date) return null;
                return <SlotLine key={ci} style={{ left: pct(cellBox(c, days).x) }} />;
            })}
        </>
    );

    return (
        <>
            {canEdit && unplanned.length > 0 && (
                <Tray aria-label="Auta oczekujące na przypisanie do stanowiska">
                    <strong>Oczekuje na przypisanie</strong>
                    {unplanned.slice(0, TRAY_VISIBLE).map(trayChip)}
                    {unplanned.length > TRAY_VISIBLE && (
                        <TrayMoreWrap ref={trayMoreRef}>
                            <TrayMore type="button" aria-expanded={trayOpen} onClick={() => setTrayOpen(o => !o)}>
                                {unplanned.length - TRAY_VISIBLE} więcej
                            </TrayMore>
                            {trayOpen && (
                                <TrayPanel role="dialog" aria-label="Pozostałe auta oczekujące na przypisanie">
                                    <p>Przeciągnij auto na stanowisko.</p>
                                    {unplanned.slice(TRAY_VISIBLE).map(trayChip)}
                                </TrayPanel>
                            )}
                        </TrayMoreWrap>
                    )}
                </Tray>
            )}

            <Scroller ref={scrollerRef}>
                <Grid $days={days.length} style={drag ? { userSelect: 'none', cursor: drag.kind === 'resize' ? 'ew-resize' : drag.kind === 'move' ? (drag.copy ? 'copy' : 'grabbing') : 'cell' } : undefined}>
                    <HeadRow>
                        <Corner />
                        <Axis>
                            {days.map((d, i) => {
                                const today = d === todayKey;
                                const free = rows.reduce((sum, r) => sum + freeCellsOn(r, d, now), 0);
                                return (
                                    <DayHead key={d} $today={today} $alt={i % 2 === 1}>
                                        <strong>{dayShort(d)} {dayMonth(d)}{today ? ', dziś' : ''}</strong>
                                        <span>{d < todayKey ? 'minęło' : free === 0 ? 'brak wolnych okienek' : `${free} ${pluralPl(free, 'wolne okienko', 'wolne okienka', 'wolnych okienek')}`}</span>
                                    </DayHead>
                                );
                            })}
                        </Axis>
                    </HeadRow>

                    {rows.map(row => (
                        <Row key={row.rowId}>
                            <RowLabel>
                                <strong>{row.bay.name}</strong>
                            </RowLabel>
                            <Track
                                data-bay-row={row.rowId}
                                ref={el => { if (el) tracks.current.set(row.rowId, el); else tracks.current.delete(row.rowId); }}
                                $lanes={row.lanes}
                                $selectable={canEdit}
                                $target={drag?.kind === 'move' && drag.moved && drag.rowId === row.rowId}
                                data-target={drag?.kind === 'move' && drag.moved && drag.rowId === row.rowId}
                                onPointerDown={e => onTrackDown(e, row)}
                                onPointerMove={e => {
                                    if (!canEdit || drag || e.pointerType !== 'mouse') return;
                                    const idx = cellAt(row, e.clientX);
                                    if (hover?.rowId !== row.rowId || hover.idx !== idx) setHover({ rowId: row.rowId, idx });
                                }}
                                onPointerLeave={() => setHover(null)}
                                onClick={e => onTrackClick(e, row)}
                            >
                                {dayBackground(row)}
                                {row.bars.map(b => renderBar(b, row))}
                                {hoverBox(row)}
                                {ghostFor(row)}
                                {nowVisible && <NowLine style={{ left: pct(nowX) }} />}
                            </Track>
                        </Row>
                    ))}
                </Grid>
            </Scroller>

            {drag?.kind === 'move' && drag.moved && drag.bookingId && createPortal(
                <UnplanZone data-unplan $over={!!drag.out} aria-hidden="true">
                    <CalendarX2 aria-hidden="true" />Upuść tutaj, żeby zdjąć z planu
                </UnplanZone>,
                document.body,
            )}

            {drag?.kind === 'move' && drag.moved && (() => {
                const car = snap.cars.find(c => c.id === drag.carId);
                const { dx, dy, w, h } = grabRef.current;
                return createPortal(
                    <DragAvatar
                        ref={avatarRef}
                        aria-hidden="true"
                        style={{ width: Math.min(Math.max(w, 120), 280), height: h, transform: `translate(${pointerRef.current.x - dx}px, ${pointerRef.current.y - dy}px)` }}
                    >
                        {car?.licensePlate && <Plate $size="sm">{car.licensePlate}</Plate>}
                        <span>{car?.jobTitle}</span>
                    </DragAvatar>,
                    document.body,
                );
            })()}

            <Legend aria-label="Legenda">
                <span><Swatch $tone="done" />Zrobione</span>
                <span><Swatch $tone="active" />Trwa</span>
                <span><Swatch $tone="plan" />Plan: przeciągnij, żeby przesunąć, chwyć krawędź, żeby zmienić długość</span>
                {canEdit && <span><Kbd>Alt</Kbd> + przeciągnij pasek: kolejny etap tego auta</span>}
            </Legend>

        </>
    );
}
