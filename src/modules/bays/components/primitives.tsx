// src/modules/bays/components/primitives.tsx
//
// Drobne klocki hali: tablica rejestracyjna, inicjały, karta auta. Kolory i metryka
// z `ui` - stanowiska mają wyglądać jak reszta CRM, a nie jak dołożona aplikacja.
//
// Karta auta nie jest wyniesiona (CLAUDE.md §2): na tablicy stoi kilkanaście aut
// naraz, a kilkanaście kart z cieniem to żadna.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import type { BayPerson } from '../types';

/** Odcień inicjałów z id osoby - ta sama osoba ma ten sam kolor na każdym ekranie. */
const AVATAR_TONES = [
    { bg: '#e0f2fe', ink: '#075985' },
    { bg: '#ede9fe', ink: '#5b21b6' },
    { bg: '#ffedd5', ink: '#9a3412' },
    { bg: '#dcfce7', ink: '#166534' },
    { bg: '#fce7f3', ink: '#9d174d' },
];

const toneOf = (id: string) => AVATAR_TONES[[...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_TONES.length];

const AvatarDot = styled.span<{ $bg: string; $ink: string; $size: number }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    border-radius: 50%;
    background: ${p => p.$bg};
    color: ${p => p.$ink};
    font-size: ${p => Math.round(p.$size * 0.36)}px;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 2px solid ${ui.surface};
`;

export function Avatar({ person, size = 26 }: { person: BayPerson; size?: number }) {
    const t = toneOf(person.id);
    return <AvatarDot $bg={t.bg} $ink={t.ink} $size={size} title={person.name} aria-hidden="true">{person.initials}</AvatarDot>;
}

const PeopleRow = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};

    > span:first-child { display: inline-flex; }
    > span:first-child > span + span { margin-left: -8px; }
`;

const PeopleNames = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/** Inicjały i imiona: „Ola Wróbel i Paweł Nowak" - spójnik zamiast kropki (CLAUDE.md §4). */
export function People({ people }: { people: BayPerson[] }) {
    if (people.length === 0) return null;
    const names = people.length === 1
        ? people[0].name
        : `${people.slice(0, -1).map(p => p.name).join(', ')} i ${people[people.length - 1].name}`;
    return (
        <PeopleRow>
            <span>{people.map(p => <Avatar key={p.id} person={p} />)}</span>
            <PeopleNames>{names}</PeopleNames>
        </PeopleRow>
    );
}

export const Plate = styled.span<{ $size?: 'sm' | 'md' | 'lg' }>`
    font-family: ${ui.mono};
    font-size: ${p => (p.$size === 'lg' ? '20px' : p.$size === 'sm' ? '12.5px' : '14.5px')};
    font-weight: 700;
    letter-spacing: 0.03em;
    color: ${ui.ink};
    white-space: nowrap;
`;

/*
 * Karta auta - trzy linie, bez wyjątku tej samej budowy w każdej kolumnie:
 *   1. tablica i JEDNA liczba po prawej (czas na stanowisku, „od 8:40"),
 *   2. co jest robione - to się czyta najpierw, więc ma wagę,
 *   3. auto szarym pismem i inicjały, gdy firma zapisuje ludzi.
 * Kolumna mówi, GDZIE auto jest, więc karta tego nie powtarza (dawne „W pracy",
 * niebieski i zielony pasek z lewej). Kolor zostaje tylko dla wyjątku, który trzeba
 * zauważyć: bursztyn = auto na coś czeka.
 */
export type CardTone = 'plain' | 'warn';

export const CardBox = styled.article<{ $tone: CardTone; $dragging?: boolean; $draggable?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 10px 12px;
    background: ${ui.surface};
    border: 1px solid ${p => (p.$tone === 'warn' ? ui.warnLine : ui.line)};
    border-radius: ${ui.radiusRow};
    opacity: ${p => (p.$dragging ? 0.45 : 1)};
    cursor: ${p => (p.$draggable ? 'grab' : 'default')};
    transition: border-color 150ms ease, opacity 150ms ease;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const Top = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
`;

const Aside = styled.span`
    flex-shrink: 0;
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    color: ${ui.textMuted};
`;

const Job = styled.div`
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Bottom = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    font-size: 12.5px;
    color: ${ui.textMuted};

    > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const Avatars = styled.span`
    display: inline-flex;
    flex-shrink: 0;
    > span + span { margin-left: -8px; }
`;

export const Meta = styled.div<{ $tone?: 'muted' | 'warn' }>`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => (p.$tone === 'warn' ? ui.warnInk : ui.textSecondary)};

    svg { width: 13px; height: 13px; flex-shrink: 0; margin-top: 2px; }
`;

export const CardActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
`;

interface CarCardProps {
    plate: string;
    vehicle: string;
    job: string;
    /** Jedna liczba albo jeden stan po prawej od tablicy. */
    aside?: ReactNode;
    asideTitle?: string;
    people?: BayPerson[];
    tone?: CardTone;
    children?: ReactNode;
    actions?: ReactNode;
    draggable?: boolean;
    dragging?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
}

export function CarCard({ plate, vehicle, job, aside, asideTitle, people = [], tone = 'plain', children, actions, draggable, dragging, onDragStart, onDragEnd }: CarCardProps) {
    return (
        <CardBox
            $tone={tone}
            $dragging={dragging}
            $draggable={draggable}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            aria-label={`${plate}, ${job}`}
        >
            <Top>
                <Plate>{plate}</Plate>
                {aside && <Aside title={asideTitle}>{aside}</Aside>}
            </Top>
            <Job>{job}</Job>
            <Bottom>
                <span>{vehicle}</span>
                {people.length > 0 && (
                    <Avatars title={people.map(p => p.name).join(', ')}>
                        {people.map(p => <Avatar key={p.id} person={p} size={24} />)}
                    </Avatars>
                )}
            </Bottom>
            {children}
            {actions && <CardActions>{actions}</CardActions>}
        </CardBox>
    );
}
