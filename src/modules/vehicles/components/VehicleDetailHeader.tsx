// src/modules/vehicles/components/VehicleDetailHeader.tsx
//
// Nagłówek karty pojazdu - ten sam ciemny blok co nagłówek wizyty: logo marki na
// jasnej płytce, nazwa, tablica, rocznik i kolor.
//
// Nagłówek nie powtarza faktów z sekcji pod nim. Był tu rząd „Ostatnia wizyta /
// Przebieg / Właściciel", ale przebieg i właściciele stoją już w szynie obok,
// a dla samej daty ostatniej wizyty nie warto rozciągać ciemnego bloku - trafiła
// do „Danych pojazdu". Kwota wydana na auto jest nagłówkiem karty wizyt.
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

interface Props {
    vehicle: Vehicle;
    isArchived: boolean;
    onNewVisit: () => void;
    onEdit: () => void;
    onOwners: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}

export function VehicleDetailHeader({ vehicle, isArchived, onNewVisit, onEdit, onOwners, onDelete, isDeleting }: Props) {
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
