// src/modules/scheduled-sms/components/ScheduledSmsTable.tsx
//
// Lista zaplanowanych SMS-ów - ta sama budowa co lista wizyt (OperationalDataTable):
// nagłówek kolumn, wiersz z paskiem koloru przy lewej krawędzi, pigułka stanu pod
// tytułem, menu „⋮" w portalu, a na wąskiej liście kafelki zamiast wierszy.
//
// Kliknięcie w wiersz robi to, po co się tu najczęściej przychodzi: otwiera zmianę
// treści i terminu (kampania - jej widok). Reszta akcji jest w menu.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { CustomerCell } from '@/common/components/CustomerCell';
import { usePortalDropdownPos } from '@/common/hooks/usePortalDropdownPos';
import type { ScheduledSmsItem } from '../types';
import {
    campaignCountLabel,
    formatTime,
    formatWhen,
    isAutomation,
    recipientLabel,
    sendDayLabel,
    STATE_COLOR,
} from '../utils/scheduledSmsFormat';
import { SMS_LIST_CONTAINER, smsCards } from './smsListLayout';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
`;

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Kolumny sprężyste jak na liście wizyt: najpierw ustępują boczne, treść wiadomości na końcu. */
const COLS = [
    'minmax(220px, 1fr)',   // wiadomość
    'minmax(150px, 200px)', // odbiorca
    'minmax(112px, 140px)', // wysyłka
    'minmax(160px, 220px)', // dlaczego czeka / czego dotyczy
    '44px',                 // menu
].join(' ');

const Outer = styled.div`
    container-type: inline-size;
    container-name: ${SMS_LIST_CONTAINER};
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const ListWrap = styled.div`
    ${smsCards} {
        background: ${st.bg};
        padding: 2px 0;
    }
`;

const HeaderRow = styled.div`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 10px 20px;
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

const DataRow = styled.div<{ $accentColor: string; $clickable: boolean; $muted: boolean; $menuOpen: boolean }>`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 15px 20px;
    border-bottom: 1px solid ${st.border};
    box-shadow: inset 3px 0 0 ${p => p.$accentColor};
    background: ${p => p.$muted ? st.bg : 'transparent'};
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    transition: background ${st.transition};
    animation: ${fadeIn} 200ms ease both;
    align-items: center;
    position: relative;
    z-index: ${p => p.$menuOpen ? 10 : 0};

    &:hover {
        background: ${p => p.$clickable ? st.bgCardAlt : p.$muted ? st.bg : 'transparent'};
    }

    &:last-child {
        border-bottom: none;
    }

    ${smsCards} {
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        gap: 0 10px;
        margin: 10px 12px;
        padding: 12px 14px 12px 17px;
        align-items: start;
        background: ${st.bgCard};
        border: 1px solid ${st.border};
        border-radius: 12px;
        box-shadow: inset 3px 0 0 ${p => p.$accentColor}, 0 1px 2px rgba(15, 23, 42, 0.05);
        animation: none;

        &:last-child { border-bottom: 1px solid ${st.border}; }

        > :nth-child(1) { grid-column: 1; grid-row: 1; min-width: 0; }
        > :nth-child(2) { grid-column: 1; grid-row: 2; padding-top: 8px; margin-top: 8px; border-top: 1px solid ${st.border}; min-width: 0; }
        > :nth-child(3) { grid-column: 2; grid-row: 2; padding-top: 8px; margin-top: 8px; border-top: 1px solid ${st.border}; text-align: right; }
        > :nth-child(4) { grid-column: 1 / -1; grid-row: 3; padding-top: 6px; }
        > :nth-child(5) { grid-column: 2; grid-row: 1; align-self: start; justify-self: end; }
    }
`;

const MessageCell = styled.div`
    min-width: 0;
`;

const Title = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
    line-height: 1.4;
`;

const RowMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 4px;
    flex-wrap: wrap;
`;

/** Pigułka stanu - ten sam kształt co status rezerwacji na liście wizyt. */
const StateBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: ${p => `${p.$color}1a`};
    color: ${p => p.$color};
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1px;
    white-space: nowrap;
    line-height: 1;
`;

const KindPill = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2px;
    background: ${p => `${p.$color}1a`};
    color: ${p => p.$color};
    flex-shrink: 0;
`;

const Preview = styled.div`
    margin-top: 6px;
    font-size: 12.5px;
    color: ${st.textSecondary};
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    ${smsCards} {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
`;

const CampaignName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    overflow-wrap: anywhere;
`;

const SubText = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    margin-top: 2px;
`;

const DateCellWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DateMain = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
`;

const DateSub = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    white-space: nowrap;
`;

const ReasonCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    line-height: 1.45;
    color: ${st.textSecondary};
`;

const ReasonStrong = styled.span`
    font-weight: 600;
    color: ${st.text};
`;

const ActionsCellWrap = styled.div`
    display: flex;
    justify-content: flex-end;
    position: relative;
`;

const MenuBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.border};
        color: ${st.text};
        background: ${st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

const DropdownMenu = styled.div`
    position: fixed;
    min-width: 208px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 1000;
    overflow: hidden;
    animation: ${fadeIn} 120ms ease both;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: ${p => p.$danger ? '#DC2626' : st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover {
        background: ${p => p.$danger ? 'rgba(220, 38, 38, 0.07)' : st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        opacity: 0.75;
    }
`;

const DropdownDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

const EmptyWrap = styled.div`
    padding: 60px 24px;
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: ${st.bgCardAlt};
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 26px;
        height: 26px;
        color: ${st.textMuted};
    }
`;

const EmptyTitle = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: ${st.text};
    margin-bottom: 6px;
`;

const EmptyDesc = styled.div`
    font-size: 13px;
    color: ${st.textMuted};
`;

const SkeletonBox = styled.div<{ $w?: string; $h?: string }>`
    width: ${p => p.$w ?? '100%'};
    height: ${p => p.$h ?? '14px'};
    border-radius: 6px;
    background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
    background-size: 400px 100%;
    animation: ${shimmer} 1.4s infinite linear;
`;

const SkeletonRow = () => (
    <DataRow $accentColor="#E2E8F0" $clickable={false} $muted={false} $menuOpen={false}>
        <MessageCell>
            <SkeletonBox $w="180px" $h="16px" />
            <SkeletonBox $w="90px" $h="20px" style={{ marginTop: '6px', borderRadius: '20px' }} />
            <SkeletonBox $w="70%" $h="12px" style={{ marginTop: '8px' }} />
        </MessageCell>
        <DateCellWrap>
            <SkeletonBox $w="120px" $h="14px" />
            <SkeletonBox $w="96px" $h="12px" />
        </DateCellWrap>
        <DateCellWrap>
            <SkeletonBox $w="80px" $h="14px" />
            <SkeletonBox $w="40px" $h="12px" />
        </DateCellWrap>
        <SkeletonBox $w="140px" $h="12px" />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SkeletonBox $w="32px" $h="32px" style={{ borderRadius: '8px' }} />
        </div>
    </DataRow>
);

// ─── Icons ────────────────────────────────────────────────────────────────────

const DotsIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

const EditIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const ResumeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);

const OpenIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const itemKey = (item: ScheduledSmsItem) => `${item.source}:${item.id}`;

/** Skąd wiadomość się wzięła - mała pigułka obok stanu. */
const originLabel = (item: ScheduledSmsItem): string | null => {
    if (isAutomation(item.source)) return 'Automat';
    if (item.source === 'VISIT_REMINDER' || item.source === 'THANK_YOU') return 'Ustawione ręcznie';
    return null;
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

    return (
        <Outer>
            <ListWrap>
                <HeaderRow>
                    <HeaderCell>Wiadomość</HeaderCell>
                    <HeaderCell>Odbiorca</HeaderCell>
                    <HeaderCell>Wysyłka</HeaderCell>
                    <HeaderCell>Dlaczego czeka</HeaderCell>
                    <HeaderCell />
                </HeaderRow>

                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : items.length === 0 ? (
                    <EmptyWrap>
                        <EmptyIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                <line x1="8" y1="9" x2="16" y2="9" />
                                <line x1="8" y1="13" x2="13" y2="13" />
                            </svg>
                        </EmptyIcon>
                        <EmptyTitle>{emptyTitle}</EmptyTitle>
                        <EmptyDesc>{emptyDescription}</EmptyDesc>
                    </EmptyWrap>
                ) : (
                    items.map(item => {
                        const key = itemKey(item);
                        const cancelled = item.state === 'CANCELLED';
                        const accent = cancelled ? '#94A3B8' : STATE_COLOR.PENDING;
                        const origin = originLabel(item);
                        const related = relatedLink(item);
                        const clickable = item.editable || !!item.campaign;

                        return (
                            <DataRow
                                key={key}
                                data-testid="scheduled-sms-row"
                                $accentColor={accent}
                                $clickable={clickable}
                                $muted={cancelled}
                                $menuOpen={openMenuKey === key}
                                onClick={() => clickable && handleRowClick(item)}
                            >
                                {/* Wiadomość */}
                                <MessageCell>
                                    <Title>{item.campaign ? `Kampania ${item.campaign.name}` : item.kindLabel}</Title>
                                    <RowMeta>
                                        <StateBadge $color={cancelled ? STATE_COLOR.CANCELLED : STATE_COLOR.PENDING}>
                                            {cancelled ? 'Anulowany' : 'Zaplanowany'}
                                        </StateBadge>
                                        {origin && <KindPill $color="#0284C7">{origin}</KindPill>}
                                    </RowMeta>
                                    {item.messageContent && <Preview title={item.messageContent}>{item.messageContent}</Preview>}
                                </MessageCell>

                                {/* Odbiorca */}
                                <div>
                                    {item.campaign ? (
                                        <>
                                            <CampaignName>{campaignCountLabel(item.campaign.pendingCount)}</CampaignName>
                                            <SubText>do klientów z kampanii</SubText>
                                        </>
                                    ) : (
                                        <CustomerCell
                                            customerId={item.customerId}
                                            name={recipientLabel(item)}
                                            sub={item.customerName ? item.phoneNumber : null}
                                        />
                                    )}
                                </div>

                                {/* Wysyłka */}
                                <DateCellWrap>
                                    {item.scheduledFor ? (
                                        <>
                                            <DateMain>{sendDayLabel(item.scheduledFor)}</DateMain>
                                            <DateSub>{formatTime(item.scheduledFor)}</DateSub>
                                        </>
                                    ) : (
                                        <>
                                            <DateMain>Wkrótce</DateMain>
                                            <DateSub>przy najbliższej wysyłce</DateSub>
                                        </>
                                    )}
                                </DateCellWrap>

                                {/* Dlaczego czeka */}
                                <ReasonCell>
                                    {cancelled && item.cancelledAt ? (
                                        <ReasonStrong>Anulowano {formatWhen(item.cancelledAt)}</ReasonStrong>
                                    ) : (
                                        <span>{item.waitingReason}</span>
                                    )}
                                    {item.appointmentStart && <span>Wizyta {formatWhen(item.appointmentStart)}</span>}
                                </ReasonCell>

                                {/* Akcje */}
                                <ActionsCellWrap onClick={e => e.stopPropagation()}>
                                    <MenuBtn type="button" onClick={e => toggleMenu(key, e)} title="Akcje" aria-label="Akcje">
                                        <DotsIcon />
                                    </MenuBtn>

                                    {openMenuKey === key && menuPos && createPortal(
                                        <DropdownMenu ref={menuRef} style={menuStyle} role="menu">
                                            {item.editable && (
                                                <DropdownItem role="menuitem" onClick={() => runFromMenu(() => onEdit(item))}>
                                                    <EditIcon />
                                                    Zmień treść i termin
                                                </DropdownItem>
                                            )}
                                            {item.resumable && (
                                                <DropdownItem role="menuitem" onClick={() => runFromMenu(() => onResume(item))}>
                                                    <ResumeIcon />
                                                    Wznów wysyłkę
                                                </DropdownItem>
                                            )}
                                            {related && (
                                                <DropdownItem role="menuitem" onClick={() => runFromMenu(() => navigate(related.to))}>
                                                    <OpenIcon />
                                                    {related.label}
                                                </DropdownItem>
                                            )}
                                            {item.customerId && (
                                                <DropdownItem role="menuitem" onClick={() => runFromMenu(() => navigate(`/customers/${item.customerId}`))}>
                                                    <UserIcon />
                                                    Karta klienta
                                                </DropdownItem>
                                            )}
                                            {item.cancellable && (
                                                <>
                                                    <DropdownDivider />
                                                    <DropdownItem role="menuitem" $danger onClick={() => runFromMenu(() => onCancel(item))}>
                                                        <XIcon />
                                                        Anuluj wysyłkę
                                                    </DropdownItem>
                                                </>
                                            )}
                                        </DropdownMenu>,
                                        document.body,
                                    )}
                                </ActionsCellWrap>
                            </DataRow>
                        );
                    })
                )}
            </ListWrap>
        </Outer>
    );
};
