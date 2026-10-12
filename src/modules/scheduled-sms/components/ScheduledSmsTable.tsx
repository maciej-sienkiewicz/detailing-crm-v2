// src/modules/scheduled-sms/components/ScheduledSmsTable.tsx
//
// Kolejka SMS-ów: jeden SMS to jedna linia - kiedy, do kogo, co to za wiadomość
// i początek treści. To prosta informacja, więc bez pasków koloru, pigułek i kafelek:
// stan i powód czekania nie potrzebują osobnych ozdobników (anulowane mają własny
// chip nad listą, a powód jest w podpowiedzi przy rodzaju wiadomości).
//
// Kliknięcie w wiersz otwiera zmianę treści i terminu (kampania - jej widok);
// pozostałe akcje są w menu „⋮", tak jak na liście wizyt.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PiiValue } from '@/common/pii';
import { usePortalDropdownPos } from '@/common/hooks/usePortalDropdownPos';
import type { ScheduledSmsItem } from '../types';
import { campaignCountLabel, formatTime, formatWhen, sendDayLabel } from '../utils/scheduledSmsFormat';
import { SMS_LIST_CONTAINER, smsCards } from './smsListLayout';

// ─── Layout ───────────────────────────────────────────────────────────────────

const COLS = [
    'minmax(112px, 140px)', // kiedy
    'minmax(140px, 210px)', // odbiorca
    'minmax(150px, 230px)', // rodzaj
    'minmax(0, 1fr)',       // treść
    '32px',                 // menu
].join(' ');

const Outer = styled.div`
    container-type: inline-size;
    container-name: ${SMS_LIST_CONTAINER};
`;

const HeaderRow = styled.div`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 16px;
    padding: 9px 20px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};

    ${smsCards} {
        display: none;
    }
`;

const HeaderCell = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
`;

const Row = styled.div<{ $clickable: boolean; $cancelled: boolean }>`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 16px;
    align-items: center;
    min-height: 44px;
    padding: 6px 20px;
    border-bottom: 1px solid ${st.border};
    font-size: 13px;
    color: ${p => p.$cancelled ? st.textMuted : st.text};
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    transition: background ${st.transition};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${p => p.$clickable ? st.bgCardAlt : 'transparent'};
    }

    /* Wąska lista: dwie krótkie linie zamiast kafelki - kiedy i do kogo, pod spodem rodzaj. */
    ${smsCards} {
        grid-template-columns: auto minmax(0, 1fr) 32px;
        gap: 2px 12px;
        padding: 8px 14px;

        > :nth-child(1) { grid-column: 1; grid-row: 1; }
        > :nth-child(2) { grid-column: 2; grid-row: 1; }
        > :nth-child(3) { grid-column: 1 / 3; grid-row: 2; }
        > :nth-child(4) { display: none; }
        > :nth-child(5) { grid-column: 3; grid-row: 1 / 3; }
    }
`;

const Cell = styled.div`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const When = styled(Cell)<{ $cancelled: boolean }>`
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-decoration: ${p => p.$cancelled ? 'line-through' : 'none'};
`;

const Recipient = styled(Cell)`
    font-weight: 500;
`;

const Kind = styled(Cell)`
    color: ${st.textSecondary};

    ${smsCards} {
        font-size: 12px;
    }
`;

const Content = styled(Cell)`
    color: ${st.textMuted};
`;

const MenuBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.border};
        color: ${st.text};
        background: ${st.bgCard};
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

const DropdownMenu = styled.div`
    position: fixed;
    min-width: 200px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 1000;
    overflow: hidden;
    padding: 4px 0;
`;

const DropdownItem = styled.button`
    display: block;
    width: 100%;
    padding: 9px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: ${st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const Empty = styled.div`
    padding: 48px 24px;
    text-align: center;

    strong {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: ${st.text};
        margin-bottom: 4px;
    }

    span {
        font-size: 13px;
        color: ${st.textMuted};
    }
`;

const Loading = styled.div`
    padding: 48px 24px;
    text-align: center;
    font-size: 13px;
    color: ${st.textMuted};
`;

const DotsIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const itemKey = (item: ScheduledSmsItem) => `${item.source}:${item.id}`;

/** „Jutro, 14:30" - jedna linia, bo to jedna informacja. */
const whenLabel = (item: ScheduledSmsItem): string =>
    item.scheduledFor ? `${sendDayLabel(item.scheduledFor)}, ${formatTime(item.scheduledFor)}` : 'Wkrótce';

/** Podpowiedź przy rodzaju: dlaczego czeka i ewentualnie, kiedy anulowano. */
const kindHint = (item: ScheduledSmsItem): string => {
    const parts = [item.waitingReason];
    if (item.appointmentStart) parts.push(`Wizyta ${formatWhen(item.appointmentStart)}`);
    if (item.state === 'CANCELLED' && item.cancelledAt) parts.push(`Anulowano ${formatWhen(item.cancelledAt)}`);
    return parts.filter(Boolean).join('. ');
};

/** Wizyta, rezerwacja albo kampania, której dotyczy wiadomość. */
const relatedLink = (item: ScheduledSmsItem): { label: string; to: string } | null => {
    if (item.campaign) return { label: 'Otwórz kampanię', to: `/campaigns/${item.campaign.id}` };
    if (item.visitId) return { label: 'Otwórz wizytę', to: `/visits/${item.visitId}` };
    if (item.appointmentId) return { label: 'Pokaż rezerwację', to: `/calendar/rezerwacja/${item.appointmentId}` };
    return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    items: ScheduledSmsItem[];
    isLoading: boolean;
    emptyTitle: string;
    emptyDescription: string;
    onEdit: (item: ScheduledSmsItem) => void;
    onCancel: (item: ScheduledSmsItem) => void;
    onResume: (item: ScheduledSmsItem) => void;
}

export const ScheduledSmsTable = ({ items, isLoading, emptyTitle, emptyDescription, onEdit, onCancel, onResume }: Props) => {
    const navigate = useNavigate();
    const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
    const { menuRef, pos: menuPos, style: menuStyle, open: openDropdownPos, close: closeDropdownPos } = usePortalDropdownPos();

    useEffect(() => {
        if (!openMenuKey) return;
        const handler = () => { setOpenMenuKey(null); closeDropdownPos(); };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openMenuKey, closeDropdownPos]);

    const toggleMenu = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (openMenuKey === key) {
            setOpenMenuKey(null);
            closeDropdownPos();
        } else {
            openDropdownPos(e);
            setOpenMenuKey(key);
        }
    };

    const runFromMenu = (action: () => void) => {
        setOpenMenuKey(null);
        closeDropdownPos();
        action();
    };

    const handleRowClick = (item: ScheduledSmsItem) => {
        if (item.editable) onEdit(item);
        else if (item.campaign) navigate(`/campaigns/${item.campaign.id}`);
    };

    if (isLoading) return <Loading>Wczytywanie…</Loading>;

    if (items.length === 0) {
        return (
            <Empty>
                <strong>{emptyTitle}</strong>
                <span>{emptyDescription}</span>
            </Empty>
        );
    }

    return (
        <Outer>
            <HeaderRow>
                <HeaderCell>Kiedy</HeaderCell>
                <HeaderCell>Odbiorca</HeaderCell>
                <HeaderCell>Rodzaj</HeaderCell>
                <HeaderCell>Treść</HeaderCell>
                <HeaderCell />
            </HeaderRow>

            {items.map(item => {
                const key = itemKey(item);
                const cancelled = item.state === 'CANCELLED';
                const related = relatedLink(item);
                const clickable = item.editable || !!item.campaign;

                return (
                    <Row
                        key={key}
                        data-testid="scheduled-sms-row"
                        $clickable={clickable}
                        $cancelled={cancelled}
                        onClick={() => clickable && handleRowClick(item)}
                    >
                        <When $cancelled={cancelled} title={item.scheduledFor ? formatWhen(item.scheduledFor) : undefined}>
                            {whenLabel(item)}
                        </When>

                        <Recipient title={item.campaign ? `Kampania ${item.campaign.name}` : undefined}>
                            {item.campaign
                                ? `Kampania ${item.campaign.name}`
                                : item.customerName
                                    ? <PiiValue value={item.customerName} kind="name" />
                                    : item.phoneNumber
                                        ? <PiiValue value={item.phoneNumber} kind="phone" />
                                        : 'Brak danych klienta'}
                        </Recipient>

                        <Kind title={kindHint(item)}>
                            {item.campaign ? campaignCountLabel(item.campaign.pendingCount) : item.kindLabel}
                        </Kind>

                        <Content title={item.messageContent ?? undefined}>{item.messageContent}</Content>

                        <div onClick={e => e.stopPropagation()}>
                            <MenuBtn type="button" onClick={e => toggleMenu(key, e)} title="Akcje" aria-label="Akcje">
                                <DotsIcon />
                            </MenuBtn>

                            {openMenuKey === key && menuPos && createPortal(
                                <DropdownMenu ref={menuRef} style={menuStyle} role="menu">
                                    {item.editable && (
                                        <DropdownItem role="menuitem" onClick={() => runFromMenu(() => onEdit(item))}>
                                            Zmień treść i termin
                                        </DropdownItem>
                                    )}
                                    {item.resumable && (
                                        <DropdownItem role="menuitem" onClick={() => runFromMenu(() => onResume(item))}>
                                            Wznów wysyłkę
                                        </DropdownItem>
                                    )}
                                    {item.cancellable && (
                                        <DropdownItem role="menuitem" onClick={() => runFromMenu(() => onCancel(item))}>
                                            Anuluj wysyłkę
                                        </DropdownItem>
                                    )}
                                    {related && (
                                        <DropdownItem role="menuitem" onClick={() => runFromMenu(() => navigate(related.to))}>
                                            {related.label}
                                        </DropdownItem>
                                    )}
                                    {item.customerId && (
                                        <DropdownItem role="menuitem" onClick={() => runFromMenu(() => navigate(`/customers/${item.customerId}`))}>
                                            Karta klienta
                                        </DropdownItem>
                                    )}
                                </DropdownMenu>,
                                document.body,
                            )}
                        </div>
                    </Row>
                );
            })}
        </Outer>
    );
};
