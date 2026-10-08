// src/modules/comms/components/RichTextEditor.tsx
// Uproszczony edytor treści wiadomości: pogrubienie, kursywa, podkreślenie,
// listy, odnośniki, wyrównanie akapitu oraz rozmiar i krój pisma i kolory - tekstu
// i tła. Układ karty (pasek u góry, treść, rząd „Aa" z akcjami) jest z makiety
// skrzynki „Zapytania".
//
// Wygląd jest tu podawany ZESTAWAMI, nie suwakami: pięć rozmiarów i dwie krótkie
// palety zamiast pola z dowolnym kolorem i dowolną liczbą pikseli. Powód jest
// praktyczny: mail ma wyjść czytelnie w cudzym programie pocztowym, którego motywu
// nie znamy, a jasnoszary tekst 7 px wybrany suwakiem wygląda dobrze wyłącznie
// w tym oknie. Krojów pisma jest pięć i tylko takich, które ma każdy program
// pocztowy (MAIL_FONTS) - dowolny krój u odbiorcy podmienia się na inny. Reszty
// formatowania (tabele) nadal nie ma - zamienia mail w ulotkę i psuje się w co
// drugim kliencie.
//
// Pasek formatowania może być schowany (`collapsibleToolbar`): w skrzynce
// „Zapytania" większość odpowiedzi to dwa zdania bez formatowania, więc pasek
// wysuwa się dopiero przyciskiem „Aa" pod treścią i nie zabiera miejsca na wątek.
//
// Pod spodem jest zwykły contentEditable i document.execCommand. Ta para jest
// „przestarzała" od lat, ale każda przeglądarka ją wspiera, a alternatywą byłby
// edytor z dziesiątkami kilobajtów zależności - dla sześciu przycisków. Wyjściowy
// HTML i tak przechodzi przez normalizeComposerHtml, więc różnice między
// przeglądarkami (span ze stylem vs <b>) nie mają znaczenia dla tego, co wychodzi.
//
// Komponent jest niekontrolowany z zewnętrznym „resetem": rodzic dostaje surowy
// innerHTML po każdej zmianie i trzyma go jako wartość; gdy ustawi inną (korekta,
// cofnięcie, wyczyszczenie po wysyłce), podmieniamy zawartość. Dopóki wartość
// odpowiada temu, co jest w DOM, nie dotykamy go - inaczej kursor skakałby na
// początek przy każdym naciśnięciu klawisza.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
    TextAlignCenter as AlignCenter,
    TextAlignJustify as AlignJustify,
    TextAlignStart as AlignLeft,
    TextAlignEnd as AlignRight,
    Bold,
    Highlighter,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    RemoveFormatting,
    Underline,
} from 'lucide-react';
import { useFloatingPanel } from '@/common/hooks/useFloatingPanel';
import { MAIL_FONTS, normalizeComposerHtml, textToComposerHtml } from '../utils/composerHtml';

/* Karta edytora z makiety „Poczta": obwódka 16 px promienia, w środku pasek
   formatowania (gdy wysunięty), treść i dolny rząd z „Aa" i akcjami. */
const Frame = styled.div<{ $focused: boolean }>`
    display: flex;
    flex-direction: column;
    border: 1px solid ${({ $focused }) => ($focused ? '#cbd5e1' : '#e2e8f0')};
    border-radius: 16px;
    background: #ffffff;
    transition: border-color ${p => p.theme.transitions.fast};
`;

/**
 * Pasek narzędzi NAD treścią, nie pod nią: to, co formatuje, ma być tam, gdzie
 * oko już jest, gdy zaznacza się słowo. Na telefonie przyciski mają 32 px -
 * dolny próg dla palca - i zawijają się zamiast się ściskać.
 */
const Toolbar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: 8px 10px;
    border-bottom: 1px solid #eef2f7;
    border-radius: 16px 16px 0 0;
    background: #f8fafc;
`;

/* Krój i rozmiar jako zwykłe listy wyboru - nazwa kroju i liczba pikseli czytają
   się od razu, bez otwierania menu. */
const Select = styled.select`
    height: 34px;
    padding: 0 26px 0 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: #ffffff;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: default; }
    &:focus-visible { outline: 2px solid #0ea5e9; outline-offset: 2px; }
`;

/* „A" z paskiem w ostatnio użytym kolorze - jak w edytorach biurowych. */
const ColorGlyph = styled.span`
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;

    .a { font-size: 14px; font-weight: 700; line-height: 14px; color: #0f172a; }
    .bar { width: 16px; height: 3px; border-radius: 2px; }
`;

const ToolButton = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex: none;
    border: none;
    border-radius: 8px;
    background: ${({ $active }) => ($active ? '#e2e8f0' : 'transparent')};
    color: ${({ $active }) => ($active ? '#0f172a' : '#475569')};
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    &:hover { background: ${({ $active }) => ($active ? '#e2e8f0' : '#f1f5f9')}; color: #0f172a; }
    &:disabled { opacity: 0.4; cursor: default; }
    &:focus-visible { outline: 2px solid #0ea5e9; outline-offset: 2px; }

    svg { width: 16px; height: 16px; }
`;

/**
 * Kontrolka z rozwijaną listą. Osobne opakowanie, bo pasek narzędzi zawija się na
 * telefonie - menu ma spadać spod SWOJEGO przycisku, a nie spod krawędzi paska.
 * Opakowanie jest punktem zaczepienia dla useFloatingPanel.
 */
const MenuWrap = styled.span`
    display: inline-flex;
`;

/*
 * Menu w portalu do <body>, w `position: fixed`: stojąc `absolute` z `left: 0`
 * pod przyciskiem koloru wyjeżdżało w kompozytorze odpowiedzi za prawą krawędź
 * telefonu, a w oknie z `overflow: hidden` bywało ucinane. Pozycję i limity
 * ustawia useFloatingPanel; do pierwszego pomiaru menu jest niewidoczne.
 */
const Menu = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9000;
    visibility: hidden;
    box-sizing: border-box;
    overscroll-behavior: contain;
    min-width: 168px;
    padding: 4px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    box-shadow: ${p => p.theme.shadows.lg};
`;

const MenuTitle = styled.div`
    padding: 4px 8px 6px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

const Swatches = styled.div`
    display: grid;
    grid-template-columns: repeat(6, 22px);
    gap: 4px;
    padding: 2px 4px 4px;
`;

const Swatch = styled.button<{ $color: string }>`
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid rgba(15, 23, 42, 0.15);
    border-radius: ${p => p.theme.radii.sm};
    background: ${p => p.$color};
    cursor: pointer;

    &:hover { transform: scale(1.12); }
`;

const ClearOption = styled.button`
    display: block;
    width: 100%;
    margin-top: 2px;
    padding: 6px 8px;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    background: none;
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
`;

const Separator = styled.span`
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background: #e2e8f0;
`;

/* Treść i podgląd stopki razem trzymają wysokość z makiety: 92 px przy schowanym
   pasku formatowania, 108 px przy wysuniętym - pole nie skacze przy pierwszej literze. */
const ContentArea = styled.div<{ $tall?: boolean; $roomy?: boolean }>`
    display: flex;
    flex-direction: column;
    min-height: ${({ $tall, $roomy }) => ($tall ? '38vh' : $roomy ? '108px' : '92px')};
    padding-bottom: 6px;
    box-sizing: border-box;
`;

const Editable = styled.div<{ $tall?: boolean }>`
    min-height: 23px;
    max-height: ${({ $tall }) => ($tall ? 'none' : '40vh')};
    overflow-y: auto;
    padding: 14px 18px 0;
    font-size: 15px;
    font-family: inherit;
    line-height: 23px;
    color: ${p => p.theme.colors.text};
    outline: none;
    overflow-wrap: anywhere;
    cursor: text;

    &:empty::before {
        content: attr(data-placeholder);
        color: ${p => p.theme.colors.textMuted};
        pointer-events: none;
    }

    ul, ol { margin: 0.3em 0; padding-left: 1.5em; }
    li { margin: 0.1em 0; }
    a { color: ${p => p.theme.colors.primary}; text-decoration: underline; }
    blockquote {
        margin: 0.4em 0;
        padding-left: 10px;
        border-left: 2px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textSecondary};
    }
`;

/** Wpisanie adresu odnośnika - na miejscu, zamiast systemowego okienka prompt(). */
const LinkPopover = styled.form`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1 1 100%;
    padding: 4px 2px 2px;

    input {
        flex: 1;
        min-width: 0;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.sm};
        padding: 6px 8px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        &:focus { border-color: #9ca3af; }
    }
    button {
        border: 1px solid ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surface};
        color: ${p => p.theme.colors.textSecondary};
        border-radius: ${p => p.theme.radii.sm};
        padding: 5px 10px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
    }
    button[type="submit"] {
        background: ${p => p.theme.colors.text};
        border-color: transparent;
        color: #ffffff;
    }
`;

/**
 * Pasek pod treścią w trybie schowanego formatowania: przełącznik „Aa" i dodatki
 * rodzica (zdjęcie z galerii, spinacz). Przyciski 36 px - na telefonie trafia się
 * w nie kciukiem.
 */
const BottomBar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: 6px 8px 8px;

    > button { min-width: 36px; height: 36px; }
    svg { width: 18px; height: 18px; }
    .spacer { flex: 1; }
    .actions { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
`;

const FormatToggle = styled(ToolButton)`
    width: auto;
    padding: 0 8px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
`;

type Command = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList';

const COMMANDS: { command: Command; label: string; shortcut?: string; Icon: typeof Bold }[] = [
    { command: 'bold', label: 'Pogrubienie', shortcut: 'Ctrl+B', Icon: Bold },
    { command: 'italic', label: 'Kursywa', shortcut: 'Ctrl+I', Icon: Italic },
    { command: 'underline', label: 'Podkreślenie', shortcut: 'Ctrl+U', Icon: Underline },
];

type AlignCommand = 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull';

/**
 * Wyrównanie akapitu. Wykonywane z `styleWithCSS`, żeby przeglądarka zapisała
 * `text-align` w stylu akapitu, który przechodzi przez normalizację treści.
 */
const ALIGN_COMMANDS: { command: AlignCommand; label: string; Icon: typeof Bold }[] = [
    { command: 'justifyLeft', label: 'Wyrównaj do lewej', Icon: AlignLeft },
    { command: 'justifyCenter', label: 'Wyśrodkuj', Icon: AlignCenter },
    { command: 'justifyRight', label: 'Wyrównaj do prawej', Icon: AlignRight },
    { command: 'justifyFull', label: 'Wyjustuj', Icon: AlignJustify },
];

const LIST_COMMANDS: { command: Command; label: string; Icon: typeof Bold }[] = [
    { command: 'insertUnorderedList', label: 'Lista punktowana', Icon: List },
    { command: 'insertOrderedList', label: 'Lista numerowana', Icon: ListOrdered },
];

/**
 * Rozmiary pisma. Cztery pozycje, nie suwak: mail ma wyjść czytelnie w cudzym
 * programie pocztowym, a każdy rozmiar spoza tej listy to albo tekst nie do
 * przeczytania na telefonie, albo nagłówek udający akapit. 14 px odpowiada temu,
 * czym pisze się domyślnie, więc wybranie go zdejmuje wcześniejszy rozmiar.
 */
const FONT_SIZES: { px: number }[] = [{ px: 12 }, { px: 14 }, { px: 16 }, { px: 18 }, { px: 24 }];

/**
 * Kolory tekstu. Ciemne i nasycone, bo tło skrzynki odbiorcy bywa białe i bywa
 * ciemne, a te wartości czyta się na obu. Pastele i szarości świadomie pominięte -
 * wyglądają dobrze w tym oknie i znikają u odbiorcy.
 */
const TEXT_COLORS = [
    '#111827', '#dc2626', '#ea580c', '#16a34a', '#0284c7', '#7c3aed',
];

/**
 * Kolory tła. Wyłącznie jasne: ciemne tło pod domyślnie czarnym tekstem daje
 * plamę nie do odczytania, a kolor tekstu jest tu osobnym, niezależnym wyborem.
 */
const HIGHLIGHT_COLORS = [
    '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e2e8f0',
];

const withProtocol = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
    return `https://${trimmed}`;
};

interface RichTextEditorProps {
    /** HTML treści; edytor podmienia zawartość tylko wtedy, gdy różni się od DOM. */
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    /** Ctrl/Cmd+Enter. */
    onSubmit?: () => void;
    disabled?: boolean;
    /** Elementy doklejane do paska narzędzi po prawej (np. spinacz załączników). */
    toolbarExtra?: ReactNode;
    /** Pliki upuszczone na obszar edytora - obsługuje rodzic (kompozytor). */
    onDropFiles?: (files: File[]) => void;
    /** Kompozytor na cały ekran telefonu: pole pisze się na dużej wysokości i rośnie z treścią. */
    tall?: boolean;
    /**
     * Pasek formatowania schowany pod przyciskiem „Aa" w pasku pod treścią; tam też
     * trafiają dodatki z [toolbarExtra]. Bez tej flagi pasek stoi stale nad treścią.
     */
    collapsibleToolbar?: boolean;
    /** Pod treścią, w karcie edytora - np. podgląd stopki („Twoja stopka"). */
    afterContent?: ReactNode;
    /** Prawa strona dolnego rzędu: „Napisz z AI" i „Wyślij". */
    actions?: ReactNode;
    /** Na końcu wysuniętego paska formatowania (np. „Popraw błędy"). */
    toolbarAppend?: ReactNode;
    /** Fokus w treści od razu po zamontowaniu - kompozytor rozwinięty kliknięciem. */
    autoFocus?: boolean;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder,
    onSubmit,
    disabled,
    toolbarExtra,
    onDropFiles,
    tall = false,
    collapsibleToolbar = false,
    afterContent,
    actions,
    toolbarAppend,
    autoFocus = false,
}: RichTextEditorProps) {
    const formatToolbarId = useId();
    const [toolbarOpen, setToolbarOpen] = useState(!collapsibleToolbar);
    const toolbarShown = !collapsibleToolbar || toolbarOpen;
    const [activeAlign, setActiveAlign] = useState<AlignCommand | null>(null);
    // Krój i rozmiar pod kursorem - listy wyboru pokazują to, czym się właśnie pisze.
    const [currentFont, setCurrentFont] = useState<string>(MAIL_FONTS[0].label);
    const [currentSize, setCurrentSize] = useState<number>(14);
    // Pasek pod „A" - ostatnio użyty kolor tekstu.
    const [lastColor, setLastColor] = useState<string>(TEXT_COLORS[1]);
    const editableRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);
    const [activeCommands, setActiveCommands] = useState<Set<Command>>(new Set());
    const [linkDraft, setLinkDraft] = useState<string | null>(null);
    // Które z trzech menu wyglądu jest otwarte. Jedno naraz - dwie palety obok
    // siebie zasłaniałyby tekst, na którym właśnie się pracuje.
    const [openMenu, setOpenMenu] = useState<'color' | 'highlight' | null>(null);
    // Zaznaczenie znika, gdy fokus przechodzi do pola adresu - zapamiętujemy je,
    // żeby odnośnik trafił tam, gdzie użytkownik zaznaczył, a nie na koniec.
    const savedRange = useRef<Range | null>(null);
    // Menu wyglądu stoi w portalu, więc przycisk i menu to dwa osobne drzewa DOM:
    // opakowanie przycisku jest punktem zaczepienia, menu - tym, co ustawiamy.
    const colorWrapRef = useRef<HTMLSpanElement>(null);
    const highlightWrapRef = useRef<HTMLSpanElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuAnchorRef = openMenu === 'color' ? colorWrapRef : highlightWrapRef;
    useFloatingPanel(openMenu !== null, menuAnchorRef, menuRef, { align: 'left', offset: 4 }, openMenu);

    // useLayoutEffect: zawartość ma być na miejscu przed pierwszym malowaniem,
    // inaczej placeholder mignąłby nad przywróconą treścią.
    useLayoutEffect(() => {
        const element = editableRef.current;
        if (element && element.innerHTML !== value) element.innerHTML = value;
    }, [value]);

    const refreshActive = useCallback(() => {
        if (typeof document === 'undefined' || !document.queryCommandState) return;
        const next = new Set<Command>();
        [...COMMANDS, ...LIST_COMMANDS].forEach(({ command }) => {
            try {
                if (document.queryCommandState(command)) next.add(command);
            } catch {
                /* przeglądarka bez wsparcia - przycisk po prostu nie podświetla się */
            }
        });
        setActiveCommands(next);
        let align: AlignCommand | null = null;
        for (const { command } of ALIGN_COMMANDS) {
            try {
                if (document.queryCommandState(command)) { align = command; break; }
            } catch {
                /* jw. */
            }
        }
        setActiveAlign(align);
        const selection = window.getSelection();
        const node = selection?.anchorNode;
        const element = node ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null;
        if (element && editableRef.current?.contains(element)) {
            const style = window.getComputedStyle(element);
            const px = Math.round(Number.parseFloat(style.fontSize));
            if (Number.isFinite(px)) setCurrentSize(px);
            const family = style.fontFamily.split(',')[0]?.replace(/["']/g, '').trim().toLowerCase();
            const known = MAIL_FONTS.find((font) => font.label.toLowerCase() === family);
            setCurrentFont(known ? known.label : MAIL_FONTS[0].label);
        }
    }, []);

    useLayoutEffect(() => {
        if (autoFocus) editableRef.current?.focus();
        // Tylko przy zamontowaniu - kompozytor rozwinięty kliknięciem w pole „Odpowiedz…".
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Lista wyboru zabiera fokus z treści, a z nim zaznaczenie. Zapamiętujemy je
     * przy naciśnięciu listy i przywracamy przed zmianą kroju albo rozmiaru.
     */
    const rememberSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && editableRef.current?.contains(selection.anchorNode)) {
            savedRange.current = selection.getRangeAt(0).cloneRange();
        }
    };
    const restoreSelection = () => {
        const range = savedRange.current;
        editableRef.current?.focus();
        if (!range) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    };

    useEffect(() => {
        if (!focused) return;
        document.addEventListener('selectionchange', refreshActive);
        return () => document.removeEventListener('selectionchange', refreshActive);
    }, [focused, refreshActive]);

    /**
     * Menu wyglądu zamyka się kliknięciem obok i Escapem. Bez tego zostawałoby
     * otwarte nad treścią, którą właśnie się pisze - a użytkownik, który rozmyślił
     * się co do koloru, nie ma innego sposobu, żeby je schować, niż wybrać kolor.
     *
     * Nasłuch tylko przy otwartym menu: pusty nasłuch na każdym kliknięciu w oknie
     * to koszt płacony przez cały czas pisania wiadomości.
     */
    useEffect(() => {
        if (openMenu === null) return;
        // Menu nie jest już potomkiem paska (portal), więc kliknięcie w próbkę
        // sprawdzamy wprost - bez tego mousedown zamknąłby menu przed onClick.
        const close = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || menuAnchorRef.current?.contains(target)) return;
            setOpenMenu(null);
        };
        const onKey = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenu(null);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [openMenu, menuAnchorRef]);

    const emit = useCallback(() => {
        const element = editableRef.current;
        if (element) onChange(element.innerHTML);
    }, [onChange]);

    const exec = useCallback(
        (command: string, argument?: string) => {
            editableRef.current?.focus();
            document.execCommand(command, false, argument);
            emit();
            refreshActive();
        },
        [emit, refreshActive]
    );

    /**
     * Rozmiar pisma na zaznaczeniu.
     *
     * `execCommand('fontSize')` zna wyłącznie skalę 1-7 z HTML 3.2, więc używamy jej
     * jako ZNACZNIKA, nie jako wyniku: rozmiar 7 nie występuje w treści z żadnego
     * innego powodu, a przeglądarka sama poprawnie rozkłada go na zaznaczeniu, które
     * przecina akapity i zagnieżdżone znaczniki. Powstałe `<font size="7">` zamieniamy
     * na `<span>` z pikselami - bo tylko piksele przechodzą przez normalizację treści
     * i tylko one znaczą to samo w każdym programie pocztowym.
     *
     * Ręczne opakowanie zaznaczenia własnym kodem wyglądałoby prościej i psuło się
     * dokładnie tam, gdzie ta sztuczka działa: przy zaznaczeniu w poprzek listy,
     * cytatu i pogrubienia naraz.
     */
    const applyFontSize = useCallback(
        (px: number) => {
            const element = editableRef.current;
            if (!element) return;
            element.focus();
            document.execCommand('styleWithCSS', false, 'false');
            document.execCommand('fontSize', false, '7');
            element.querySelectorAll('font[size="7"]').forEach((marker) => {
                const span = document.createElement('span');
                span.style.fontSize = `${px}px`;
                while (marker.firstChild) span.appendChild(marker.firstChild);
                marker.replaceWith(span);
            });
            emit();
        },
        [emit]
    );

    /**
     * Kolor tekstu albo tła. `styleWithCSS` włączamy na czas polecenia, żeby
     * przeglądarka wystawiła `<span style="color: …">` zamiast `<font color>`;
     * zaraz potem wyłączamy, bo przy włączonym pogrubienie wychodzi jako span
     * ze stylem i traci swoje znaczenie w treści wiadomości.
     */
    const applyColor = useCallback(
        (command: 'foreColor' | 'hiliteColor', color: string) => {
            const element = editableRef.current;
            if (!element) return;
            element.focus();
            document.execCommand('styleWithCSS', false, 'true');
            // `hiliteColor` to nazwa z Chrome i Firefoksa; starsze Safari zna wyłącznie
            // `backColor`, które w pozostałych przeglądarkach maluje CAŁY blok.
            const applied = document.execCommand(command, false, color);
            if (!applied && command === 'hiliteColor') {
                document.execCommand('backColor', false, color);
            }
            document.execCommand('styleWithCSS', false, 'false');
            emit();
        },
        [emit]
    );

    /**
     * Krój pisma na zaznaczeniu. `fontName` ze `styleWithCSS` daje `<span style=
     * "font-family: …">`, a normalizacja zamienia nazwę na pełny, bezpieczny zapis.
     */
    const applyFont = useCallback(
        (stack: string) => {
            const element = editableRef.current;
            if (!element) return;
            element.focus();
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('fontName', false, stack);
            document.execCommand('styleWithCSS', false, 'false');
            emit();
        },
        [emit]
    );

    const applyAlign = useCallback(
        (command: AlignCommand) => {
            const element = editableRef.current;
            if (!element) return;
            element.focus();
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand(command, false);
            document.execCommand('styleWithCSS', false, 'false');
            emit();
            refreshActive();
        },
        [emit, refreshActive]
    );

    const openLink = () => {
        const selection = window.getSelection();
        savedRange.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        const anchor = savedRange.current?.startContainer.parentElement?.closest('a');
        setLinkDraft(anchor?.getAttribute('href') ?? '');
    };

    const applyLink = () => {
        const href = withProtocol(linkDraft ?? '');
        const range = savedRange.current;
        editableRef.current?.focus();
        if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        if (!href) {
            document.execCommand('unlink');
        } else if (range && range.collapsed) {
            // Bez zaznaczenia wstawiamy sam adres jako tekst odnośnika.
            const anchor = `<a href="${href.replace(/"/g, '&quot;')}">${href.replace(/</g, '&lt;')}</a>`;
            document.execCommand('insertHTML', false, anchor);
        } else {
            document.execCommand('createLink', false, href);
        }
        setLinkDraft(null);
        emit();
    };

    /**
     * Mousedown w menu wyglądu i na jego przycisku nie może zabrać fokusu edytorowi -
     * kolor trafiłby w pustkę. Menu jest w portalu, więc dostaje ten sam handler
     * wprost, zamiast polegać na tym, że zdarzenie Reacta przejdzie do opakowania.
     */
    const keepSelection = (event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const meta = event.metaKey || event.ctrlKey;
        if (!meta) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit?.();
            return;
        }
        const key = event.key.toLowerCase();
        if (key === 'k') {
            event.preventDefault();
            openLink();
        }
        // b/i/u obsługuje sama przeglądarka; dbamy tylko o podświetlenie przycisku.
        if (key === 'b' || key === 'i' || key === 'u') setTimeout(() => { emit(); refreshActive(); }, 0);
    };

    /**
     * Wklejanie: HTML z innej wiadomości czy dokumentu przechodzi przez tę samą
     * normalizację co wysyłka - zostają pogrubienia i listy, odpadają czcionki,
     * kolory i tabele. Czysty tekst dostaje po <div> na wiersz.
     */
    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
        // Zrzut ekranu ze schowka to załącznik, nie treść - obsługuje go kompozytor.
        if (event.clipboardData.files.length > 0) return;
        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');
        if (!html && !text) return;
        event.preventDefault();
        const fragment = html ? normalizeComposerHtml(html, { keepFonts: false }) : textToComposerHtml(text);
        document.execCommand('insertHTML', false, fragment || textToComposerHtml(text));
        emit();
    };

    const tool = (key: string, label: string, active: boolean, onClick: () => void, icon: ReactNode, title?: string) => (
        <ToolButton
            key={key}
            type="button"
            $active={active}
            aria-pressed={active}
            aria-label={label}
            title={title ?? label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
        >
            {icon}
        </ToolButton>
    );

    return (
        <Frame $focused={focused}>
            {toolbarShown && (
            <Toolbar role="toolbar" aria-label="Formatowanie tekstu" id={collapsibleToolbar ? formatToolbarId : undefined}>
                {/* Kolejność z makiety: krój i rozmiar, styl znaku i kolor, wyrównanie,
                    listy i odnośnik. Krój i rozmiar są listami wyboru - nazwa kroju
                    i liczba pikseli czytają się bez otwierania menu. */}
                <Select
                    aria-label="Czcionka"
                    value={currentFont}
                    disabled={disabled}
                    onMouseDown={rememberSelection}
                    onChange={(event) => {
                        const font = MAIL_FONTS.find((item) => item.label === event.target.value);
                        if (!font) return;
                        setCurrentFont(font.label);
                        restoreSelection();
                        applyFont(font.stack);
                    }}
                >
                    {MAIL_FONTS.map((font) => <option key={font.label} value={font.label}>{font.label}</option>)}
                </Select>
                <Select
                    aria-label="Rozmiar"
                    style={{ marginLeft: 4 }}
                    value={String(FONT_SIZES.some((size) => size.px === currentSize) ? currentSize : 14)}
                    disabled={disabled}
                    onMouseDown={rememberSelection}
                    onChange={(event) => {
                        const px = Number(event.target.value);
                        setCurrentSize(px);
                        restoreSelection();
                        applyFontSize(px);
                    }}
                >
                    {FONT_SIZES.map((size) => <option key={size.px} value={size.px}>{size.px}</option>)}
                </Select>
                <Separator aria-hidden="true" />
                {COMMANDS.map(({ command, label, shortcut, Icon }) =>
                    tool(command, label, activeCommands.has(command), () => exec(command), <Icon />, shortcut ? `${label} (${shortcut})` : label)
                )}
                <MenuWrap ref={colorWrapRef} onMouseDown={keepSelection}>
                    <ToolButton
                        type="button"
                        $active={openMenu === 'color'}
                        aria-label="Kolor tekstu"
                        aria-expanded={openMenu === 'color'}
                        title="Kolor tekstu"
                        disabled={disabled}
                        onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
                    >
                        <ColorGlyph aria-hidden="true">
                            <span className="a">A</span>
                            <span className="bar" style={{ background: lastColor }} />
                        </ColorGlyph>
                    </ToolButton>
                    {openMenu === 'color' && createPortal(
                        <Menu ref={menuRef} role="menu" onMouseDown={keepSelection}>
                            <MenuTitle>Kolor tekstu</MenuTitle>
                            <Swatches>
                                {TEXT_COLORS.map((color) => (
                                    <Swatch
                                        key={color}
                                        type="button"
                                        role="menuitem"
                                        $color={color}
                                        aria-label={`Kolor tekstu ${color}`}
                                        title={color}
                                        onClick={() => { applyColor('foreColor', color); setLastColor(color); setOpenMenu(null); }}
                                    />
                                ))}
                            </Swatches>
                        </Menu>,
                        document.body,
                    )}
                </MenuWrap>
                <MenuWrap ref={highlightWrapRef} onMouseDown={keepSelection}>
                    <ToolButton
                        type="button"
                        $active={openMenu === 'highlight'}
                        aria-label="Kolor tła"
                        aria-expanded={openMenu === 'highlight'}
                        title="Kolor tła (wyróżnienie)"
                        disabled={disabled}
                        onClick={() => setOpenMenu(openMenu === 'highlight' ? null : 'highlight')}
                    >
                        <Highlighter />
                    </ToolButton>
                    {openMenu === 'highlight' && createPortal(
                        <Menu ref={menuRef} role="menu" onMouseDown={keepSelection}>
                            <MenuTitle>Kolor tła</MenuTitle>
                            <Swatches>
                                {HIGHLIGHT_COLORS.map((color) => (
                                    <Swatch
                                        key={color}
                                        type="button"
                                        role="menuitem"
                                        $color={color}
                                        aria-label={`Kolor tła ${color}`}
                                        title={color}
                                        onClick={() => { applyColor('hiliteColor', color); setOpenMenu(null); }}
                                    />
                                ))}
                            </Swatches>
                            {/* Zdjęcie tła musi być osobną pozycją: nie da się go
                                „odkliknąć" tą samą próbką, a malowanie bielą zostawia
                                plamę na ciemnym motywie klienta pocztowego. */}
                            <ClearOption
                                type="button"
                                role="menuitem"
                                onClick={() => { applyColor('hiliteColor', 'transparent'); setOpenMenu(null); }}
                            >
                                Bez tła
                            </ClearOption>
                        </Menu>,
                        document.body,
                    )}
                </MenuWrap>
                <Separator aria-hidden="true" />
                {ALIGN_COMMANDS.map(({ command, label, Icon }) =>
                    tool(command, label, activeAlign === command, () => applyAlign(command), <Icon />)
                )}
                <Separator aria-hidden="true" />
                {LIST_COMMANDS.map(({ command, label, Icon }) =>
                    tool(command, label, activeCommands.has(command), () => exec(command), <Icon />)
                )}
                {tool('link', 'Wstaw link', linkDraft !== null, () => (linkDraft === null ? openLink() : setLinkDraft(null)), <LinkIcon />, 'Wstaw link (Ctrl+K)')}
                {tool('clear', 'Usuń formatowanie', false, () => { exec('removeFormat'); exec('unlink'); }, <RemoveFormatting />, 'Usuń formatowanie z zaznaczenia')}
                {toolbarAppend}
                {toolbarExtra && !collapsibleToolbar && (
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 2 }}>{toolbarExtra}</span>
                )}

                {linkDraft !== null && (
                    <LinkPopover
                        onSubmit={(event) => { event.preventDefault(); applyLink(); }}
                    >
                        <input
                            autoFocus
                            value={linkDraft}
                            onChange={(event) => setLinkDraft(event.target.value)}
                            placeholder="https://adres.pl"
                            aria-label="Adres odnośnika"
                            onKeyDown={(event) => { if (event.key === 'Escape') setLinkDraft(null); }}
                        />
                        <button type="submit">{linkDraft.trim() ? 'Wstaw' : 'Usuń'}</button>
                        <button type="button" onClick={() => setLinkDraft(null)}>Anuluj</button>
                    </LinkPopover>
                )}
            </Toolbar>
            )}
            <ContentArea $tall={tall} $roomy={toolbarShown}>
            <Editable
                $tall={tall}
                ref={editableRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder}
                data-placeholder={placeholder}
                onInput={emit}
                onKeyDown={handleKeyDown}
                onKeyUp={refreshActive}
                onMouseUp={refreshActive}
                onPaste={handlePaste}
                onFocus={() => { setFocused(true); refreshActive(); }}
                onBlur={() => setFocused(false)}
                onDragOver={(event) => { if (onDropFiles && event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
                onDrop={(event) => {
                    if (!onDropFiles || event.dataTransfer.files.length === 0) return;
                    event.preventDefault();
                    // Rodzic z własną strefą zrzutu nie ma dostać tych samych plików drugi raz.
                    event.stopPropagation();
                    onDropFiles(Array.from(event.dataTransfer.files));
                }}
            />
            {afterContent}
            </ContentArea>
            {(collapsibleToolbar || actions) && (
                <BottomBar>
                    {collapsibleToolbar && (
                        <FormatToggle
                            type="button"
                            $active={toolbarOpen}
                            aria-expanded={toolbarOpen}
                            aria-controls={formatToolbarId}
                            aria-label={toolbarOpen ? 'Ukryj formatowanie tekstu' : 'Pokaż formatowanie tekstu'}
                            title={toolbarOpen ? 'Ukryj formatowanie tekstu' : 'Formatowanie tekstu'}
                            disabled={disabled}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => { setToolbarOpen((open) => !open); setOpenMenu(null); }}
                        >
                            Aa
                        </FormatToggle>
                    )}
                    {collapsibleToolbar && toolbarExtra}
                    <span className="spacer" />
                    {actions && <span className="actions">{actions}</span>}
                </BottomBar>
            )}
        </Frame>
    );
}
