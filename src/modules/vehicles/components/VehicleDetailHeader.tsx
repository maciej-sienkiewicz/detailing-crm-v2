// src/modules/vehicles/components/VehicleDetailHeader.tsx
//
// Nagłówek karty pojazdu - ten sam ciemny blok co nagłówek wizyty: logo marki na
// jasnej płytce, nazwa, tablica, a pod spodem rząd faktów o historii auta.
//
// Wcześniej te fakty stały pod nagłówkiem jako trzy osobne, wyniesione kafle
// („Łączny przychód", „Zakończone wizyty", „Ostatnia wizyta") z etykietami 11px
// wersalikami - trzy kolejne karty obok karty historii wizyt, więc żadna nie była
// tematem okna (CLAUDE.md §2). Teraz są jednym rzędem w nagłówku, a kwota wraca
// jako nagłówek karty wizyt.
//
// W oknie jest jedno wypełnienie: „Nowa wizyta". Reszta akcji siedzi w ⋯.

import styled from 'styled-components';
import { CalendarPlus, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { ActionMenu, Button, IconButton, MenuItem, StatusPill, ui, useActionMenu } from '@/common/components/ui';
import { useContainerWidth } from '@/common/hooks';
import { CarLogoImage } from './CarLogoImage';
import type { Vehicle } from '../types';

/** Poniżej tej szerokości nagłówka układ telefonu: akcja główna na całą szerokość pod spodem. */
const COMPACT_MAX_WIDTH = 640;

const STATUS: Record<string, { label: string; tone: 'ok' | 'neutral' | 'warn' }> = {
    active: { label: 'Aktywny', tone: 'ok' },
    sold: { label: 'Sprzedany', tone: 'warn' },
    archived: { label: 'W archiwum', tone: 'neutral' },
};

const Hero = styled.header`
    container: vehicle-hero / inline-size;
    border-radius: 18px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.18);
    color: #fff;
    margin-bottom: 16px;
`;

const Inner = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 26px 18px;

    @container vehicle-hero (max-width: 640px) { gap: 14px; padding: 16px; }
`;

const Top = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px 24px;
    flex-wrap: wrap;
    min-width: 0;

    @container vehicle-hero (max-width: 640px) { flex-wrap: nowrap; gap: 10px; }
`;

const Identity = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    flex: 1 1 360px;

    @container vehicle-hero (max-width: 640px) { flex: 1 1 auto; }
`;

/* Jasna płytka pod logo: logotypy marek są rysowane na biało i na granacie znikają. */
const LogoTile = styled.div`
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    box-sizing: border-box;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.94);

    @container vehicle-hero (max-width: 640px) { display: none; }
`;

const IdentText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
`;

const Eyebrow = styled.span`
    font-size: 12.5px;
    color: #94a3b8;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.2;
    overflow-wrap: anywhere;

    @container vehicle-hero (max-width: 640px) { font-size: 20px; }
`;

const Meta = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 14px;
    min-width: 0;
    font-size: 13px;
    color: #cbd5e1;
`;

const Plate = styled.span`
    padding: 2px 8px;
    border-radius: 5px;
    background: #e2e8f0;
    color: ${ui.ink};
    font-family: ${ui.mono};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    white-space: nowrap;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
`;

const PrimaryAction = styled(Button)`
    height: 44px;
    padding: 0 20px;
    font-size: 14.5px;

    @container vehicle-hero (max-width: 640px) { width: 100%; height: 48px; font-size: 15px; }
`;

/* Fakty o historii auta: etykieta nad wartością, bez wersalików i bez własnych kart. */
const Facts = styled.dl`
    display: flex;
    flex-wrap: wrap;
    gap: 12px 32px;
    margin: 0;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    @container vehicle-hero (max-width: 640px) {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 16px;
        padding-top: 12px;

        /* Nieparzysty ostatni fakt (zwykle właściciel z długą nazwą) dostaje cały rząd. */
        > div:last-child:nth-child(odd) { grid-column: 1 / -1; }
    }
`;

const Fact = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    dt { font-size: 12.5px; color: #94a3b8; }
    dd { margin: 0; font-size: 15px; font-weight: 600; color: #fff; font-variant-numeric: tabular-nums; }
    dd span { font-size: 12.5px; font-weight: 500; color: #94a3b8; }
`;

export interface VehicleFact {
    label: string;
    value: string;
    hint?: string;
}

interface Props {
    vehicle: Vehicle;
    isArchived: boolean;
    facts: VehicleFact[];
    onNewVisit: () => void;
    onEdit: () => void;
    onOwners: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}

export function VehicleDetailHeader({ vehicle, isArchived, facts, onNewVisit, onEdit, onOwners, onDelete, isDeleting }: Props) {
    const [heroRef, heroWidth] = useContainerWidth<HTMLElement>();
    const compact = heroWidth === null
        ? typeof window !== 'undefined' && window.innerWidth <= COMPACT_MAX_WIDTH
        : heroWidth <= COMPACT_MAX_WIDTH;
    const menu = useActionMenu();

    const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Pojazd';
    const status = STATUS[vehicle.status] ?? { label: vehicle.status, tone: 'neutral' as const };
    const since = new Date(vehicle.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const details = [
        vehicle.yearOfProduction ? String(vehicle.yearOfProduction) : null,
        vehicle.color || null,
    ].filter(Boolean).join(', ');

    const primary = (
        <PrimaryAction variant="primary" onClick={onNewVisit} disabled={isArchived}>
            <CalendarPlus />Nowa wizyta
        </PrimaryAction>
    );

    return (
        <Hero ref={heroRef}>
            <Inner>
                <Top>
                    <Identity>
                        <LogoTile title={vehicle.brand || undefined}>
                            <CarLogoImage brand={vehicle.brand} size="md" />
                        </LogoTile>
                        <IdentText>
                            <Eyebrow>Pojazd w systemie od {since}</Eyebrow>
                            <Title>{name}</Title>
                            <Meta>
                                {vehicle.licensePlate && <Plate>{vehicle.licensePlate}</Plate>}
                                {details && <span>{details}</span>}
                                {/* Aktywny to stan zwykły - plakietkę pokazujemy, gdy jest o czym mówić. */}
                                {vehicle.status !== 'active' && <StatusPill $tone={status.tone}>{status.label}</StatusPill>}
                            </Meta>
                        </IdentText>
                    </Identity>
                    <Actions>
                        {!compact && !isArchived && (
                            <Button variant="onDark" size="lg" onClick={onEdit}><Pencil />Edytuj dane</Button>
                        )}
                        {!isArchived && (
                            <IconButton
                                label="Więcej akcji pojazdu"
                                variant="onDark"
                                size={compact ? 'md' : 'lg'}
                                aria-haspopup="menu"
                                aria-expanded={menu.isOpen()}
                                onClick={e => menu.toggle(e, null)}
                            >
                                <MoreHorizontal />
                            </IconButton>
                        )}
                        {!compact && primary}
                    </Actions>
                </Top>

                {facts.length > 0 && (
                    <Facts>
                        {facts.map(f => (
                            <Fact key={f.label}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}{f.hint && <span> {f.hint}</span>}</dd>
                            </Fact>
                        ))}
                    </Facts>
                )}

                {compact && primary}
            </Inner>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje pojazdu">
                {compact && <MenuItem icon={<Pencil />} onClick={onEdit}>Edytuj dane</MenuItem>}
                <MenuItem icon={<Users />} onClick={onOwners}>Właściciele</MenuItem>
                <MenuItem icon={<Trash2 />} danger disabled={isDeleting} onClick={onDelete}>Usuń pojazd</MenuItem>
            </ActionMenu>
        </Hero>
    );
}
