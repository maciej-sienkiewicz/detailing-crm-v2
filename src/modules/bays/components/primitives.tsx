// src/modules/bays/components/primitives.tsx
//
// Drobne klocki stanowisk: tablica rejestracyjna i inicjały. Kolory i metryka z `ui` -
// stanowiska mają wyglądać jak reszta CRM, a nie jak dołożona aplikacja.

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

/* Pismo aplikacji, nie ui.mono: tablica jest tu tytułem karty, a krój mono nie jest
   ładowany - przeglądarka podstawiała Couriera i tablica wyglądała jak z innego programu. */
export const Plate = styled.span<{ $size?: 'sm' | 'md' | 'lg' }>`
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    font-size: ${p => (p.$size === 'lg' ? '20px' : p.$size === 'sm' ? '12.5px' : '14.5px')};
    font-weight: 700;
    letter-spacing: 0.02em;
    color: ${ui.ink};
    white-space: nowrap;
`;
