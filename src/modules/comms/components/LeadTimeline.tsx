// src/modules/comms/components/LeadTimeline.tsx
//
// Przebieg sprawy w oknie leada: statusy, korespondencja i odnotowane telefony
// na jednej nitce czasu.
//
// Wcześniej stała tu sama wędrówka po statusach, więc lead po wymianie trzech maili
// opisany był dwiema linijkami — „Nowy", „W kontakcie" — i milczał o tym, co w nim
// najważniejsze: o co klient pytał, kiedy odpisaliśmy i co odpowiedział. Fakty
// istniały, tylko w wątku poczty, czyli wszędzie, byle nie tam, gdzie się ich szuka.

import { useState } from 'react';
import styled, { type DefaultTheme } from 'styled-components';
import { Eye, Mail, PhoneCall, Reply } from 'lucide-react';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type LeadTimelineEntry } from '../types';
import { formatDateTime } from './shared';

/**
 * Kolor kropki. Statusy zachowują kolor swojego etapu — ten sam, którym etap
 * oznaczony jest w tabeli i w wybieraku, więc oś czasu czyta się bez legendy.
 * Zdarzenia kontaktu dostają kolory kierunku: klient i my.
 */
const colorOf = (entry: LeadTimelineEntry, theme: DefaultTheme): string => {
    switch (entry.kind) {
        case 'INBOUND_MESSAGE': return theme.colors.warning;
        case 'OUTBOUND_MESSAGE':
        case 'CALLBACK': return theme.colors.success;
        case 'STATUS':
        default:
            return entry.toStatus ? LEAD_STATUS_COLORS[entry.toStatus].fg : theme.colors.textMuted;
    }
};

/**
 * Oś czasu, nie lista linijek. Zdarzenia są ciągiem („klient napisał, odpisaliśmy,
 * klient się targował"), a płaskie zdania z datą na początku każą ten ciąg złożyć
 * w głowie, bo wszystkie ważą tyle samo. Pionowa nitka z kropkami pokazuje go wprost.
 */
const Timeline = styled.ol`
    position: relative;
    list-style: none;
    margin: 0;
    padding: 2px 0 0 16px;

    &::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: ${p => p.theme.colors.border};
    }
`;

/**
 * Wiersz zdarzenia: SIATKA, nie ciąg tekstu.
 *
 * Wcześniej przycisk podglądu był elementem liniowym doklejonym za datą i autorem,
 * więc jego miejsce zależało od tego, jak długie było nazwisko obok: raz lądował
 * w linii daty, raz spadał niżej, a poziomo stawał w innym punkcie w każdym wierszu.
 * Wyglądało to na przypadek, bo nim było.
 *
 * Stała kolumna po prawej ustawia akcję zawsze w tym samym miejscu, niezależnie od
 * długości tekstu — a druga linia siatki daje rozwiniętej treści pełną szerokość,
 * bez wciskania jej pod ikonę.
 */
const Item = styled.li<{ $entry: LeadTimelineEntry }>`
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 28px;
    align-items: start;
    column-gap: 8px;
    padding-bottom: 12px;
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;

    &:last-child { padding-bottom: 0; }

    &::before {
        content: '';
        position: absolute;
        left: -16px;
        top: 5px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${p => colorOf(p.$entry, p.theme)};
        /* Obwódka w kolorze tła panelu wycina nitkę pod kropką. */
        box-shadow: 0 0 0 2px ${p => p.theme.colors.surfaceAlt};
    }
`;

/** Treść zdarzenia. Osobny element, bo w siatce zajmuje pierwszą kolumnę. */
const Content = styled.div`
    min-width: 0;
    /* Wysokość pola akcji - wiersz z podglądem i bez niego mają ten sam rytm. */
    min-height: 28px;
`;

/**
 * Data i autor jako JEDEN blok, nie luźne węzły tekstowe.
 *
 * To one wcześniej niosły przycisk w linii i decydowały o tym, gdzie wyląduje.
 */
const Meta = styled.div`
    margin-top: 1px;
    overflow-wrap: anywhere;
`;

const Headline = styled.strong`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};

    svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        color: ${p => p.theme.colors.textMuted};
    }
`;

/**
 * Podgląd wiadomości: sama ikona, wywoływana najechaniem na wiersz.
 *
 * Pastylka z obwódką i etykietą, która stała tu wcześniej, ważyła w wierszu więcej
 * niż nazwa samego zdarzenia — a przy trzech wiadomościach pod rząd to ona
 * przyciągała wzrok zamiast przebiegu sprawy. Oś czasu ma się czytać, nie klikać;
 * podgląd jest czynnością drugiego planu i tak ma wyglądać.
 *
 * Miejsce zajmuje ZAWSZE, także niewidoczna: gdyby pojawiała się dopiero na hover,
 * tekst obok przeskakiwałby pod kursorem przy każdym wejściu na wiersz.
 *
 * Oko, nie koperta: kopertą oznaczona jest już wiadomość przychodząca w tym samym
 * wierszu, a dwa razy ten sam znak o dwóch różnych znaczeniach czyta się gorzej niż
 * znak neutralny. Oko mówi „zobacz" niezależnie od rodzaju zdarzenia.
 */
const Toggle = styled.button<{ $open: boolean }>`
    grid-column: 2;
    grid-row: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    /* Tło także w spoczynku: ikona bez niego jest samym konturem i na hover czyta się
       jak ozdobnik, a nie jak przycisk. Kontrast tekstu drugorzędnego, nie wygaszonego —
       to jedyny sygnał, że wiersz da się otworzyć, więc musi być widoczny od razu. */
    background: ${({ $open, theme }) => ($open ? 'rgba(14, 165, 233, 0.1)' : theme.colors.surface)};
    color: ${({ $open, theme }) => ($open ? theme.colors.primary : theme.colors.textSecondary)};
    box-shadow: ${({ $open }) => ($open ? 'none' : '0 0 0 1px rgba(15, 23, 42, 0.06)')};
    cursor: pointer;
    opacity: ${p => (p.$open ? 1 : 0)};
    transition: opacity 120ms ease, background 120ms ease, color 120ms ease;

    li:hover &,
    &:focus-visible {
        opacity: 1;
    }

    &:hover {
        background: rgba(14, 165, 233, 0.1);
        color: ${p => p.theme.colors.primary};
    }

    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: -2px;
    }

    /* Bez kursora nie ma najechania: na dotyku ikona musi być widoczna od razu,
       inaczej podgląd wiadomości przestaje istnieć dla połowy użytkowników. */
    @media (hover: none) {
        opacity: 1;
    }

    svg { width: 15px; height: 15px; }
`;

/**
 * Treść wiadomości rozwinięta w miejscu, a nie w kolejnym oknie. Podgląd leada sam
 * jest oknem, więc modal nad modalem kazałby zamknąć dwie rzeczy, żeby wrócić do
 * listy — a chodzi o zerknięcie na trzy zdania.
 */
const Body = styled.blockquote`
    grid-column: 1 / -1;
    margin: 6px 0 0;
    padding: 8px 10px;
    max-height: 200px;
    overflow-y: auto;
    border-left: 2px solid ${p => p.theme.colors.border};
    border-radius: 0 6px 6px 0;
    background: ${p => p.theme.colors.surface};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.55;
    font-size: 12.5px;
    color: ${p => p.theme.colors.text};
`;

const Note = styled.div`
    margin-top: 3px;
    font-size: 12px;
    font-style: italic;
    color: ${p => p.theme.colors.textSecondary};
    overflow-wrap: anywhere;
`;

const Empty = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Nagłówek zdarzenia. Pierwsza wiadomość klienta dostaje własną nazwę, bo to ona
 * jest początkiem sprawy — „Klient odpisał" na samej górze osi brzmiałoby jak
 * odpowiedź na coś, czego nie było.
 */
const headlineOf = (entry: LeadTimelineEntry, isFirstInbound: boolean): string => {
    switch (entry.kind) {
        case 'INBOUND_MESSAGE':
            return isFirstInbound ? 'Pierwszy kontakt klienta' : 'Klient odpisał';
        case 'OUTBOUND_MESSAGE':
            return 'Odpisaliśmy';
        case 'CALLBACK':
            return 'Oddzwoniliśmy';
        case 'STATUS':
        default:
            return entry.toStatus ? LEAD_STATUS_LABELS[entry.toStatus] : 'Zmiana statusu';
    }
};

const iconOf = (kind: LeadTimelineEntry['kind']) => {
    switch (kind) {
        case 'INBOUND_MESSAGE': return <Mail />;
        case 'OUTBOUND_MESSAGE': return <Reply />;
        case 'CALLBACK': return <PhoneCall />;
        default: return null;
    }
};

interface LeadTimelineProps {
    entries: LeadTimelineEntry[];
}

export function LeadTimeline({ entries }: LeadTimelineProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggle = (id: string) =>
        setExpanded((open) => {
            const next = new Set(open);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    if (entries.length === 0) {
        return <Empty>Nic się jeszcze nie wydarzyło.</Empty>;
    }

    const firstInboundId = entries.find((entry) => entry.kind === 'INBOUND_MESSAGE')?.id;

    return (
        <Timeline>
            {entries.map((entry) => {
                const open = expanded.has(entry.id);
                const hasBody = Boolean(entry.body);
                return (
                    <Item key={entry.id} $entry={entry}>
                        <Content>
                            <Headline>
                                {iconOf(entry.kind)}
                                {headlineOf(entry, entry.id === firstInboundId)}
                                {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                            </Headline>
                            <Meta>
                                {formatDateTime(entry.at)}
                                {entry.actorName && <>, {entry.actorName}</>}
                            </Meta>
                            {entry.note && <Note>{entry.note}</Note>}
                        </Content>
                        {hasBody && (
                            <Toggle
                                type="button"
                                $open={open}
                                onClick={() => toggle(entry.id)}
                                aria-expanded={open}
                                aria-label={open ? 'Ukryj wiadomość' : 'Pokaż wiadomość'}
                                title={open ? 'Ukryj wiadomość' : 'Pokaż wiadomość'}
                            >
                                <Eye />
                            </Toggle>
                        )}
                        {hasBody && open && <Body>{entry.body}</Body>}
                    </Item>
                );
            })}
        </Timeline>
    );
}
