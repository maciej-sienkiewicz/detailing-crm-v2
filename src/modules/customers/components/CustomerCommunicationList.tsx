// src/modules/customers/components/CustomerCommunicationList.tsx

import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    CommunicationPreviewModal,
    EmailIcon,
    SmsIcon,
    CheckIcon,
    AlertIcon,
    formatCommDate,
} from '@/common/components/CommunicationPreviewModal';
import type { CommunicationEntry } from '@/common/types/communication';

const BRAND     = '#0ea5e9';
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';

// ─── Timeline ────────────────────────────────────────────────────────────────

const TimelineList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const TimelineItem = styled.li<{ $last?: boolean }>`
    display: flex;
    gap: 14px;
    position: relative;
    padding-bottom: ${p => p.$last ? '0' : '16px'};

    &::before {
        content: ${p => p.$last ? 'none' : '""'};
        position: absolute;
        left: 15px;
        top: 32px;
        bottom: 0;
        width: 1px;
        background: ${st.border};
    }
`;

const ChannelDot = styled.div<{ $channel: 'EMAIL' | 'SMS'; $failed?: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
    background: ${p =>
        p.$failed
            ? 'rgba(239,68,68,0.12)'
            : p.$channel === 'EMAIL'
                ? BRAND_DIM
                : 'rgba(16,185,129,0.12)'
    };
    border: 1px solid ${p =>
        p.$failed
            ? 'rgba(239,68,68,0.25)'
            : p.$channel === 'EMAIL'
                ? 'rgba(14,165,233,0.25)'
                : 'rgba(16,185,129,0.2)'
    };
    color: ${p =>
        p.$failed
            ? st.accentRed
            : p.$channel === 'EMAIL'
                ? BRAND
                : st.accentGreen
    };
    position: relative;
    z-index: 1;
`;

const EntryCard = styled.button`
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 10px 14px;
    cursor: pointer;
    text-align: left;
    transition: all ${st.transition};
    box-shadow: ${st.shadowXs};

    &:hover {
        border-color: ${st.borderHover};
        background: ${st.bgCardAlt};
        box-shadow: ${st.shadowSm};
        transform: translateY(-1px);
    }

    &:active { transform: translateY(0); }
`;

const EntryMain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const EntryLabel = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const EntryMeta = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    gap: 5px;
`;

const EntryRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
`;

const StatusBadge = styled.span<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    background: ${p =>
        p.$status === 'FAILED'
            ? 'rgba(239,68,68,0.12)'
            : p.$status === 'RECEIVED'
                ? BRAND_DIM
                : 'rgba(16,185,129,0.12)'
    };
    color: ${p =>
        p.$status === 'FAILED'
            ? st.accentRed
            : p.$status === 'RECEIVED'
                ? '#0284c7'
                : st.accentGreen
    };
    border: 1px solid ${p =>
        p.$status === 'FAILED'
            ? 'rgba(239,68,68,0.25)'
            : p.$status === 'RECEIVED'
                ? 'rgba(14,165,233,0.25)'
                : 'rgba(16,185,129,0.25)'
    };
`;

const PreviewHint = styled.span`
    font-size: 10px;
    color: #0284c7;
    font-weight: 600;
    letter-spacing: 0.02em;
    opacity: 0.8;
`;

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = styled.div`
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const EmptyIconWrap = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    text-align: center;
`;

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    border-top: 1px solid ${st.bgCardAlt};
`;

const PaginationInfo = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
`;

const PaginationBtns = styled.div`
    display: flex;
    gap: 6px;
`;

const PaginationBtn = styled.button<{ $disabled?: boolean }>`
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid ${st.border};
    background: ${p => p.$disabled ? st.bgCardAlt : '#fff'};
    color: ${p => p.$disabled ? st.textMuted : st.text};
    font-size: 12px;
    font-weight: 500;
    cursor: ${p => p.$disabled ? 'default' : 'pointer'};
    font-family: inherit;
    transition: background 140ms ease;
    &:hover:not([disabled]) { background: ${st.bgCardAlt}; }
`;

const PAGE_SIZE = 4;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    entries: CommunicationEntry[];
    isLoading?: boolean;
}

export const CustomerCommunicationList = ({ entries, isLoading }: Props) => {
    const [selected, setSelected] = useState<CommunicationEntry | null>(null);
    const [page, setPage] = useState(0);

    if (isLoading) {
        return (
            <EmptyState>
                <EmptyIconWrap>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.textMuted} strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </EmptyIconWrap>
                <EmptyText>Ładowanie historii komunikacji...</EmptyText>
            </EmptyState>
        );
    }

    if (entries.length === 0) {
        return (
            <EmptyState>
                <EmptyIconWrap>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.textMuted} strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M2 7l10 7 10-7" />
                    </svg>
                </EmptyIconWrap>
                <EmptyText>Brak historii komunikacji z klientem.</EmptyText>
            </EmptyState>
        );
    }

    const sorted = [...entries].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const pageEntries = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <>
            <TimelineList>
                {pageEntries.map((entry, idx) => {
                    const isFailed = entry.status === 'FAILED';
                    const isLast = idx === pageEntries.length - 1;
                    return (
                        <TimelineItem key={entry.id} $last={isLast}>
                            <ChannelDot $channel={entry.channel} $failed={isFailed}>
                                {entry.channel === 'EMAIL'
                                    ? <EmailIcon size={14} />
                                    : <SmsIcon size={14} />
                                }
                            </ChannelDot>
                            <EntryCard
                                onClick={() => setSelected(entry)}
                                aria-label={`Podgląd: ${entry.messageTypeLabel}`}
                            >
                                <EntryMain>
                                    <EntryLabel>{entry.messageTypeLabel}</EntryLabel>
                                    <EntryMeta>
                                        <span>{entry.channel === 'EMAIL' ? 'E-mail' : 'SMS'}</span>
                                        <span>·</span>
                                        <span>{entry.recipientAddress}</span>
                                        <span>·</span>
                                        <span>{formatCommDate(entry.sentAt)}</span>
                                    </EntryMeta>
                                </EntryMain>
                                <EntryRight>
                                    <StatusBadge $status={entry.status}>
                                        {entry.status === 'SENT'
                                            ? <><CheckIcon /> Wysłano</>
                                            : entry.status === 'RECEIVED'
                                                ? <><CheckIcon /> Otrzymano</>
                                                : <><AlertIcon /> Błąd</>
                                        }
                                    </StatusBadge>
                                    <PreviewHint>Podgląd →</PreviewHint>
                                </EntryRight>
                            </EntryCard>
                        </TimelineItem>
                    );
                })}
            </TimelineList>

            {totalPages > 1 && (
                <PaginationBar>
                    <PaginationInfo>
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} z {sorted.length}
                    </PaginationInfo>
                    <PaginationBtns>
                        <PaginationBtn
                            $disabled={page === 0}
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Poprzednie
                        </PaginationBtn>
                        <PaginationBtn
                            $disabled={page >= totalPages - 1}
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Następne →
                        </PaginationBtn>
                    </PaginationBtns>
                </PaginationBar>
            )}

            {selected && (
                <CommunicationPreviewModal
                    entry={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
};
