// src/modules/scheduled-sms/components/SentSmsTable.tsx
//
// Zakładka „Wysłane": historia SMS-ów od najnowszych, w tym samym wierszu co kolejka
// (queueTable.tsx) i z jedną kolumną więcej - „Wynik". Jedynym kolorem na liście jest
// czerwony „Nie wysłano": to jedyna informacja, przy której trzeba coś zrobić; powód
// porażki jest w podpowiedzi.
//
// Kampania to jeden wiersz z liczbą wysłanych SMS-ów i prowadzi do swojego widoku.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { PiiValue } from '@/common/pii';
import { usePortalDropdownPos } from '@/common/hooks/usePortalDropdownPos';
import { SharedButton } from '@/common/styles';
import { pluralPl } from '@/common/utils/plural';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { SentSmsItem } from '../types';
import { formatTime, formatWhen, sendDayLabel } from '../utils/scheduledSmsFormat';
import {
    Cell, Content, DotsIcon, DropdownItem, DropdownMenu, Empty, HeaderCell, HeaderRow, Kind, Loading, MenuBtn, Outer,
    Recipient, Row, When,
} from './queueTable';
import { smsCards } from './smsListLayout';

/** Wysłano | Odbiorca | Rodzaj | Treść | Wynik | menu */
const COLS = 'minmax(104px, 130px) minmax(140px, 210px) minmax(150px, 230px) minmax(0, 1fr) minmax(84px, 100px) 32px';
/** Średnia lista - bez kolumny treści. */
const MID_COLS = 'minmax(104px, 130px) minmax(0, 1fr) minmax(0, 1fr) 84px 32px';

/*
 * Na wąskiej liście: w pierwszej linii kiedy i do kogo, w drugiej rodzaj i wynik.
 * Wynik w pierwszej linii wypychał odbiorcę - na 320 px zostawało z niego jedno „K…".
 */
const SentRow = styled(Row)`
    ${smsCards} {
        grid-template-columns: auto minmax(0, 1fr) auto 32px;

        > :nth-child(2) { grid-column: 2 / 4; grid-row: 1; }
        > :nth-child(3) { grid-column: 1 / 3; grid-row: 2; }
        > :nth-child(5) { grid-column: 3; grid-row: 2; text-align: right; font-size: 12px; }
        > :nth-child(6) { grid-column: 4; grid-row: 1 / 3; }
    }
`;

const Result = styled(Cell)<{ $failed: boolean }>`
    font-weight: ${p => p.$failed ? 600 : 400};
    color: ${p => p.$failed ? '#dc2626' : st.textMuted};
`;

const MoreBar = styled.div`
    display: flex;
    justify-content: center;
    padding: 12px;
    border-top: 1px solid ${st.border};
`;

const sentCountLabel = (n: number) => `${n} ${pluralPl(n, 'SMS wysłany', 'SMS-y wysłane', 'SMS-ów wysłanych')}`;

const kindOf = (item: SentSmsItem): string => {
    if (!item.campaign) return item.kindLabel;
    const failed = item.campaign.failedCount > 0 ? `, nie wyszło ${item.campaign.failedCount}` : '';
    return `${sentCountLabel(item.campaign.sentCount)}${failed}`;
};

const relatedLink = (item: SentSmsItem): { label: string; to: string } | null => {
    if (item.campaign) return { label: 'Otwórz kampanię', to: `/campaigns/${item.campaign.id}` };
    if (item.visitId) return { label: 'Otwórz wizytę', to: `/visits/${item.visitId}` };
    if (item.appointmentId) return { label: 'Pokaż rezerwację', to: `/calendar/rezerwacja/${item.appointmentId}` };
    return null;
};

interface Props {
    items: SentSmsItem[];
    isLoading: boolean;
    emptyTitle: string;
    emptyDescription: string;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
}

export const SentSmsTable = ({ items, isLoading, emptyTitle, emptyDescription, hasMore, isLoadingMore, onLoadMore }: Props) => {
    const navigate = useNavigate();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const { menuRef, pos: menuPos, style: menuStyle, open: openDropdownPos, close: closeDropdownPos } = usePortalDropdownPos();

    useEffect(() => {
        if (!openMenuId) return;
        const handler = () => { setOpenMenuId(null); closeDropdownPos(); };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openMenuId, closeDropdownPos]);

    const toggleMenu = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (openMenuId === id) {
            setOpenMenuId(null);
            closeDropdownPos();
        } else {
            openDropdownPos(e);
            setOpenMenuId(id);
        }
    };

    const go = (to: string) => {
        setOpenMenuId(null);
        closeDropdownPos();
        navigate(to);
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
                <HeaderCell>Wysłano</HeaderCell>
                <HeaderCell>Odbiorca</HeaderCell>
                <HeaderCell>Rodzaj</HeaderCell>
                <HeaderCell>Treść</HeaderCell>
                <HeaderCell>Wynik</HeaderCell>
                <HeaderCell />
            </HeaderRow>

            {items.map(item => {
                const key = `${item.campaign ? 'campaign' : 'log'}:${item.id}`;
                const failed = item.status === 'FAILED';
                const related = relatedLink(item);

                return (
                    <SentRow
                        key={key}
                        data-testid="sent-sms-row"
                        $cols={COLS}
                        $midCols={MID_COLS}
                        $clickable={!!item.campaign}
                        $cancelled={false}
                        onClick={() => item.campaign && navigate(`/campaigns/${item.campaign.id}`)}
                    >
                        <When $cancelled={false} title={formatWhen(item.sentAt)}>
                            {sendDayLabel(item.sentAt)}, {formatTime(item.sentAt)}
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

                        <Kind title={kindOf(item)}>{kindOf(item)}</Kind>

                        <Content title={item.messageContent ?? undefined}>{item.messageContent}</Content>

                        <Result $failed={failed} title={failed ? item.errorMessage ?? undefined : undefined}>
                            {failed ? 'Nie wysłano' : 'Wysłano'}
                        </Result>

                        <div onClick={e => e.stopPropagation()}>
                            {(related || item.customerId) && (
                                <MenuBtn type="button" onClick={e => toggleMenu(key, e)} title="Akcje" aria-label="Akcje">
                                    <DotsIcon />
                                </MenuBtn>
                            )}
                            {openMenuId === key && menuPos && createPortal(
                                <DropdownMenu ref={menuRef} style={menuStyle} role="menu">
                                    {related && (
                                        <DropdownItem role="menuitem" onClick={() => go(related.to)}>{related.label}</DropdownItem>
                                    )}
                                    {item.customerId && (
                                        <DropdownItem role="menuitem" onClick={() => go(`/customers/${item.customerId}`)}>
                                            Karta klienta
                                        </DropdownItem>
                                    )}
                                </DropdownMenu>,
                                document.body,
                            )}
                        </div>
                    </SentRow>
                );
            })}

            {hasMore && (
                <MoreBar>
                    <SharedButton $variant="secondary" $size="sm" type="button" onClick={onLoadMore} disabled={isLoadingMore}>
                        {isLoadingMore ? 'Wczytywanie…' : 'Pokaż starsze'}
                    </SharedButton>
                </MoreBar>
            )}
        </Outer>
    );
};
