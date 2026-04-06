// src/modules/visits/components/VisitCommunicationHistory.tsx

import { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CommunicationEntry } from '../types';

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

// ─── Timeline List ────────────────────────────────────────────────────────────

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

    /* Vertical connector line */
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
                ? st.accentBlueDim
                : 'rgba(16,185,129,0.12)'
    };
    border: 1px solid ${p =>
        p.$failed
            ? 'rgba(239,68,68,0.25)'
            : p.$channel === 'EMAIL'
                ? 'rgba(59,130,246,0.2)'
                : 'rgba(16,185,129,0.2)'
    };
    color: ${p =>
        p.$failed
            ? st.accentRed
            : p.$channel === 'EMAIL'
                ? st.accentBlue
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

    &:active {
        transform: translateY(0);
    }
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

const StatusBadge = styled.span<{ $status: 'SENT' | 'RECEIVED' | 'FAILED' }>`
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
                ? st.accentBlueDim
                : 'rgba(16,185,129,0.12)'
    };
    color: ${p =>
        p.$status === 'FAILED'
            ? st.accentRed
            : p.$status === 'RECEIVED'
                ? st.accentBlue
                : st.accentGreen
    };
    border: 1px solid ${p =>
        p.$status === 'FAILED'
            ? 'rgba(239,68,68,0.25)'
            : p.$status === 'RECEIVED'
                ? 'rgba(59,130,246,0.2)'
                : 'rgba(16,185,129,0.25)'
    };
`;

const PreviewHint = styled.span`
    font-size: 10px;
    color: ${st.accentBlue};
    font-weight: 600;
    letter-spacing: 0.02em;
    opacity: 0.8;
`;

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = styled.div`
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: ${st.textMuted};
`;

const EmptyIcon = styled.div`
    width: 36px;
    height: 36px;
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

// ─── Preview Modal ────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(3px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: ${fadeIn} 0.15s ease;
`;

const ModalSheet = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${css`${fadeUp}`} 0.2s ease;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 24px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const ModalHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const ModalChannelIcon = styled.div<{ $channel: 'EMAIL' | 'SMS'; $failed?: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: ${p =>
        p.$failed
            ? 'rgba(239,68,68,0.12)'
            : p.$channel === 'EMAIL'
                ? st.accentBlueDim
                : 'rgba(16,185,129,0.12)'
    };
    color: ${p =>
        p.$failed
            ? st.accentRed
            : p.$channel === 'EMAIL'
                ? st.accentBlue
                : st.accentGreen
    };
`;

const ModalTitleGroup = styled.div`
    min-width: 0;
`;

const ModalTitle = styled.h2`
    margin: 0 0 3px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ModalSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const CloseButton = styled.button`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: ${st.radiusSm};
    cursor: pointer;
    color: ${st.textMuted};
    transition: all ${st.transition};
    flex-shrink: 0;

    &:hover {
        background: ${st.bgCardAlt};
        color: ${st.text};
    }
`;

const ModalMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    padding: 12px 24px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
`;

const MetaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: ${st.textSecondary};
`;

const MetaLabel = styled.span`
    font-weight: 600;
    color: ${st.textMuted};
`;

const MetaValue = styled.span`
    color: ${st.text};
`;

const ErrorBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: ${st.radiusSm};
    margin: 12px 24px 0;
`;

const ErrorBannerText = styled.div``;

const ErrorBannerTitle = styled.p`
    margin: 0 0 2px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.accentRed};
`;

const ErrorBannerDetail = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${st.textSecondary};
    font-family: monospace;
`;

const ModalBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px 24px;
`;

const SubjectLine = styled.div`
    margin-bottom: 12px;
    padding: 10px 14px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const SubjectLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: block;
    margin-bottom: 3px;
`;

const SubjectValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const BodyLabel = styled.p`
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const BodyContent = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateShort = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const EmailIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 7l10 7 10-7" />
    </svg>
);

const SmsIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const CheckIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const AlertIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

// ─── Preview Modal Component ──────────────────────────────────────────────────

interface PreviewModalProps {
    entry: CommunicationEntry;
    onClose: () => void;
}

const PreviewModal = ({ entry, onClose }: PreviewModalProps) => {
    const isFailed = entry.status === 'FAILED';
    const channelLabel = entry.channel === 'EMAIL' ? 'E-mail' : 'SMS';

    return (
        <Overlay onClick={onClose}>
            <ModalSheet onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalHeaderLeft>
                        <ModalChannelIcon $channel={entry.channel} $failed={isFailed}>
                            {entry.channel === 'EMAIL'
                                ? <EmailIcon size={18} />
                                : <SmsIcon size={18} />
                            }
                        </ModalChannelIcon>
                        <ModalTitleGroup>
                            <ModalTitle>{entry.messageTypeLabel}</ModalTitle>
                            <ModalSubtitle>
                                {channelLabel} · {formatDate(entry.sentAt)}
                            </ModalSubtitle>
                        </ModalTitleGroup>
                    </ModalHeaderLeft>
                    <CloseButton onClick={onClose} aria-label="Zamknij podgląd">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseButton>
                </ModalHeader>

                <ModalMeta>
                    <MetaItem>
                        <MetaLabel>{entry.status === 'RECEIVED' ? 'Od:' : 'Do:'}</MetaLabel>
                        <MetaValue>{entry.recipientAddress}</MetaValue>
                    </MetaItem>
                    <MetaItem>
                        <MetaLabel>Wysłano:</MetaLabel>
                        <MetaValue>{formatDateShort(entry.sentAt)}</MetaValue>
                    </MetaItem>
                    <MetaItem>
                        <StatusBadge $status={entry.status}>
                            {entry.status === 'SENT'
                                ? <><CheckIcon /> Wysłano</>
                                : entry.status === 'RECEIVED'
                                    ? <><CheckIcon /> Otrzymano</>
                                    : <><AlertIcon /> Błąd wysyłki</>
                            }
                        </StatusBadge>
                    </MetaItem>
                </ModalMeta>

                <ModalBody>
                    {isFailed && entry.errorMessage && (
                        <ErrorBanner>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.accentRed} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <ErrorBannerText>
                                <ErrorBannerTitle>Wiadomość nie została dostarczona</ErrorBannerTitle>
                                <ErrorBannerDetail>{entry.errorMessage}</ErrorBannerDetail>
                            </ErrorBannerText>
                        </ErrorBanner>
                    )}

                    {entry.subject && (
                        <SubjectLine style={{ marginTop: isFailed ? 12 : 0 }}>
                            <SubjectLabel>Temat</SubjectLabel>
                            <SubjectValue>{entry.subject}</SubjectValue>
                        </SubjectLine>
                    )}

                    <BodyLabel style={{ marginTop: entry.subject || isFailed ? 12 : 0 }}>
                        Treść wiadomości
                    </BodyLabel>
                    <BodyContent>{entry.bodyContent}</BodyContent>
                </ModalBody>
            </ModalSheet>
        </Overlay>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface VisitCommunicationHistoryProps {
    entries: CommunicationEntry[];
    isLoading?: boolean;
}

export const VisitCommunicationHistory = ({
    entries,
    isLoading,
}: VisitCommunicationHistoryProps) => {
    const [selectedEntry, setSelectedEntry] = useState<CommunicationEntry | null>(null);

    if (isLoading) {
        return (
            <EmptyState>
                <EmptyIcon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.textMuted} strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </EmptyIcon>
                <EmptyText>Ładowanie historii komunikacji...</EmptyText>
            </EmptyState>
        );
    }

    if (entries.length === 0) {
        return (
            <EmptyState>
                <EmptyIcon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.textMuted} strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M2 7l10 7 10-7" />
                    </svg>
                </EmptyIcon>
                <EmptyText>Brak wysłanej komunikacji dla tej wizyty</EmptyText>
            </EmptyState>
        );
    }

    return (
        <>
            <TimelineList>
                {entries.map((entry, idx) => {
                    const isFailed = entry.status === 'FAILED';
                    const isLast = idx === entries.length - 1;
                    return (
                        <TimelineItem key={entry.id} $last={isLast}>
                            <ChannelDot $channel={entry.channel} $failed={isFailed}>
                                {entry.channel === 'EMAIL'
                                    ? <EmailIcon size={14} />
                                    : <SmsIcon size={14} />
                                }
                            </ChannelDot>
                            <EntryCard
                                onClick={() => setSelectedEntry(entry)}
                                aria-label={`Podgląd: ${entry.messageTypeLabel}`}
                            >
                                <EntryMain>
                                    <EntryLabel>{entry.messageTypeLabel}</EntryLabel>
                                    <EntryMeta>
                                        <span>{entry.channel === 'EMAIL' ? 'E-mail' : 'SMS'}</span>
                                        <span>·</span>
                                        <span>{entry.recipientAddress}</span>
                                        <span>·</span>
                                        <span>{formatDateShort(entry.sentAt)}</span>
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

            {selectedEntry && (
                <PreviewModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                />
            )}
        </>
    );
};
