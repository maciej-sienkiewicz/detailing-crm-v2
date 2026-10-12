// src/modules/scheduled-communication/components/ScheduledQueueTable.tsx
//
// Kolejka SMS-ów albo e-maili: jedna wiadomość to jedna linia - kiedy, do kogo, co to
// za wiadomość i początek treści (przy e-mailu temat; wygląd wiersza: queueTable.tsx). Stan i powód czekania nie
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
import type { MessageChannel, ScheduledItem } from '../types';
import { campaignCountLabel, contactOf, formatTime, formatWhen, sendDayLabel } from '../utils/scheduledFormat';
import {
    Content, DotsIcon, DropdownItem, DropdownMenu, Empty, HeaderCell, HeaderRow, Kind, Loading, MenuBtn, Outer,
    Recipient, Row, When,
} from './queueTable';

/** Kiedy | Odbiorca | Rodzaj | Treść | menu */
const COLS = 'minmax(104px, 130px) minmax(140px, 210px) minmax(150px, 230px) minmax(0, 1fr) 32px';
/** Średnia lista - bez kolumny treści. */
const MID_COLS = 'minmax(104px, 130px) minmax(0, 1fr) minmax(0, 1fr) 32px';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const itemKey = (item: ScheduledItem) => `${item.source}:${item.id}`;

/** „Jutro, 14:30" - jedna linia, bo to jedna informacja. */
const whenLabel = (item: ScheduledItem): string =>
    item.scheduledFor ? `${sendDayLabel(item.scheduledFor)}, ${formatTime(item.scheduledFor)}` : 'Wkrótce';

/** Podpowiedź przy rodzaju: dlaczego czeka i ewentualnie, kiedy anulowano. */
const kindHint = (item: ScheduledItem): string => {
    const parts = [item.waitingReason];
    if ('appointmentStart' in item && item.appointmentStart) parts.push(`Wizyta ${formatWhen(item.appointmentStart)}`);
    if (item.state === 'CANCELLED' && item.cancelledAt) parts.push(`Anulowano ${formatWhen(item.cancelledAt)}`);
    return parts.filter(Boolean).join('. ');
};

/** Wizyta, rezerwacja albo kampania, której dotyczy wiadomość. */
const relatedLink = (item: ScheduledItem): { label: string; to: string } | null => {
    if (item.campaign) return { label: 'Otwórz kampanię', to: `/campaigns/${item.campaign.id}` };
    if (item.visitId) return { label: 'Otwórz wizytę', to: `/visits/${item.visitId}` };
    if (item.appointmentId) return { label: 'Pokaż rezerwację', to: `/calendar/rezerwacja/${item.appointmentId}` };
    return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

/** Przy e-mailu w kolumnie „Treść" stoi temat - po nim się maila rozpoznaje; całość w podpowiedzi. */
const preview = (item: ScheduledItem): string | null =>
    ('subject' in item && item.subject) || item.messageContent;

const previewHint = (item: ScheduledItem): string | undefined => {
    if (!('subject' in item)) return item.messageContent ?? undefined;
    const files = item.attachmentNames.length > 0 ? `\n\nZałączniki: ${item.attachmentNames.join(', ')}` : '';
    return [item.subject, item.messageContent].filter(Boolean).join('\n\n') + files || undefined;
};

interface Props {
    channel: MessageChannel;
    items: ScheduledItem[];
    isLoading: boolean;
    emptyTitle: string;
    emptyDescription: string;
    onEdit: (item: ScheduledItem) => void;
    onCancel: (item: ScheduledItem) => void;
    onResume: (item: ScheduledItem) => void;
}

export const ScheduledQueueTable = ({ channel, items, isLoading, emptyTitle, emptyDescription, onEdit, onCancel, onResume }: Props) => {
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

    const handleRowClick = (item: ScheduledItem) => {
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
            <HeaderRow $cols={COLS} $midCols={MID_COLS}>
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
                        $midCols={MID_COLS}
                        data-testid="scheduled-row"
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
                                    : contactOf(item)
                                        ? <PiiValue value={contactOf(item)} kind={channel === 'EMAIL' ? 'email' : 'phone'} />
                                        : 'Brak danych klienta'}
                        </Recipient>

                        <Kind title={kindHint(item)}>
                            {item.campaign ? campaignCountLabel(item.campaign.pendingCount, channel) : item.kindLabel}
                        </Kind>

                        <Content title={previewHint(item)}>{preview(item)}</Content>

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
