// src/modules/scheduled-sms/components/ScheduledSmsTable.tsx
//
// Kolejka SMS-ów: jeden SMS to jedna linia - kiedy, do kogo, co to za wiadomość
// i początek treści (wygląd wiersza: queueTable.tsx). Stan i powód czekania nie
// potrzebują ozdobników: anulowane mają własną zakładkę, a powód jest w podpowiedzi
// przy rodzaju wiadomości.
//
// Kliknięcie w wiersz otwiera zmianę treści i terminu (kampania - jej widok);
// pozostałe akcje są w menu „⋮", tak jak na liście wizyt.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PiiValue } from '@/common/pii';
import { usePortalDropdownPos } from '@/common/hooks/usePortalDropdownPos';
import type { ScheduledSmsItem } from '../types';
import { campaignCountLabel, formatTime, formatWhen, sendDayLabel } from '../utils/scheduledSmsFormat';
import {
    Content, DotsIcon, DropdownItem, DropdownMenu, Empty, HeaderCell, HeaderRow, Kind, Loading, MenuBtn, Outer,
    Recipient, Row, When,
} from './queueTable';

/** Kiedy | Odbiorca | Rodzaj | Treść | menu */
const COLS = [
    'minmax(112px, 140px)',
    'minmax(140px, 210px)',
    'minmax(150px, 230px)',
    'minmax(0, 1fr)',
    '32px',
].join(' ');

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
            <HeaderRow $cols={COLS}>
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
                        $cols={COLS}
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
