// src/modules/customers/components/CustomerDetailHeader.tsx
//
// Nagłówek karty klienta - ten sam ciemny blok co nagłówek pojazdu i wizyty:
// od kiedy jest klientem, imię i nazwisko (albo firma), a z prawej akcje.
//
// Nagłówek nie powtarza tego, co stoi w sekcjach pod nim. Wcześniej był tu awatar
// z inicjałami, telefon, e-mail, numer w systemie i adres w jednym rzędzie, a pod
// nagłówkiem cztery kafle statystyk - te same dane stały drugi raz w szynie
// i w karcie wizyt. Kontakt jest teraz w „Danych klienta", kwota w karcie wizyt.
//
// W oknie jest jedno wypełnienie: „Nowa wizyta". Reszta akcji siedzi w ⋯.
// „Wyślij SMS" w tym menu wcześniej tylko zamykało menu - okno SMS istniało,
// ale nic go nie otwierało.

import styled from 'styled-components';
import { Building2, CalendarPlus, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ActionMenu, Button, IconButton, MenuDivider, MenuItem, useActionMenu } from '@/common/components/ui';
import { useContainerWidth } from '@/common/hooks';
import { PiiValue } from '@/common/pii';

/** Poniżej tej szerokości nagłówka układ telefonu: akcja główna na całą szerokość pod spodem. */
const COMPACT_MAX_WIDTH = 640;

const Hero = styled.header`
    container: customer-hero / inline-size;
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

    @container customer-hero (max-width: 640px) { gap: 14px; padding: 16px; }
`;

const Top = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px 24px;
    flex-wrap: wrap;
    min-width: 0;

    @container customer-hero (max-width: 640px) { flex-wrap: nowrap; gap: 10px; }
`;

const Identity = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    flex: 1 1 360px;

    @container customer-hero (max-width: 640px) { flex: 1 1 auto; }
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

    @container customer-hero (max-width: 640px) { font-size: 20px; }
`;

const Meta = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 13px;
    color: #cbd5e1;

    svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.75; }
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

    @container customer-hero (max-width: 640px) { width: 100%; height: 48px; font-size: 15px; }
`;

interface Props {
    fullName: string;
    /** Firma przypięta do klienta - pod nazwiskiem, bo to druga połowa „kto to jest". */
    companyName?: string | null;
    createdAt: string;
    canSms: boolean;
    onNewVisit: () => void;
    onEdit: () => void;
    onSms: () => void;
    onDelete: () => void;
}

export function CustomerDetailHeader({ fullName, companyName, createdAt, canSms, onNewVisit, onEdit, onSms, onDelete }: Props) {
    const [heroRef, heroWidth] = useContainerWidth<HTMLElement>();
    const compact = heroWidth === null
        ? typeof window !== 'undefined' && window.innerWidth <= COMPACT_MAX_WIDTH
        : heroWidth <= COMPACT_MAX_WIDTH;
    const menu = useActionMenu();
    const since = new Date(createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const primary = (
        <PrimaryAction variant="primary" onClick={onNewVisit}>
            <CalendarPlus />Nowa wizyta
        </PrimaryAction>
    );

    return (
        <Hero ref={heroRef}>
            <Inner>
                <Top>
                    <Identity>
                        <IdentText>
                            <Eyebrow>Klient od {since}</Eyebrow>
                            <Title><PiiValue value={fullName} kind="name" /></Title>
                            {companyName && (
                                <Meta><Building2 aria-hidden="true" />{companyName}</Meta>
                            )}
                        </IdentText>
                    </Identity>
                    <Actions>
                        {!compact && (
                            <Button variant="onDark" size="lg" onClick={onEdit}><Pencil />Edytuj dane</Button>
                        )}
                        <IconButton
                            label="Więcej akcji klienta"
                            variant="onDark"
                            size={compact ? 'md' : 'lg'}
                            aria-haspopup="menu"
                            aria-expanded={menu.isOpen()}
                            onClick={e => menu.toggle(e, null)}
                        >
                            <MoreHorizontal />
                        </IconButton>
                        {!compact && primary}
                    </Actions>
                </Top>

                {compact && primary}
            </Inner>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje klienta">
                {compact && <MenuItem icon={<Pencil />} onClick={onEdit}>Edytuj dane</MenuItem>}
                {canSms && <MenuItem icon={<MessageSquare />} onClick={onSms}>Wyślij SMS</MenuItem>}
                <MenuDivider />
                <MenuItem icon={<Trash2 />} danger onClick={onDelete}>Usuń dane klienta</MenuItem>
            </ActionMenu>
        </Hero>
    );
}
