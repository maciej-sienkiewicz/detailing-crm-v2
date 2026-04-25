// src/common/components/CommunicationPreviewModal.tsx
//
// Shared modal for previewing a single communication entry (email / SMS).
// Used by VisitCommunicationHistory and CustomerCommunicationList.

import styled, { keyframes, css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CommunicationEntry } from '@/common/types/communication';

const BRAND      = '#0ea5e9';
const BRAND_DIM  = 'rgba(14, 165, 233, 0.10)';

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

// ─── Overlay / Sheet ─────────────────────────────────────────────────────────

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
    border-radius: 16px;
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${css`${fadeUp}`} 0.2s ease;
`;

// ─── Header ──────────────────────────────────────────────────────────────────

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
                ? BRAND_DIM
                : 'rgba(16,185,129,0.12)'
    };
    color: ${p =>
        p.$failed
            ? st.accentRed
            : p.$channel === 'EMAIL'
                ? BRAND
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

// ─── Meta row ────────────────────────────────────────────────────────────────

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

// ─── Body ────────────────────────────────────────────────────────────────────

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

// ─── Icons ───────────────────────────────────────────────────────────────────

export const EmailIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 7l10 7 10-7" />
    </svg>
);

export const SmsIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

export const CheckIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const AlertIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

// ─── Helper ───────────────────────────────────────────────────────────────────

export const formatCommDate = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    entry: CommunicationEntry;
    onClose: () => void;
}

export const CommunicationPreviewModal = ({ entry, onClose }: Props) => {
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
                            <ModalSubtitle>{channelLabel} · {formatCommDate(entry.sentAt)}</ModalSubtitle>
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
                        <MetaLabel>{entry.status === 'RECEIVED' ? 'Otrzymano:' : 'Wysłano:'}</MetaLabel>
                        <MetaValue>{formatCommDate(entry.sentAt)}</MetaValue>
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
                            <div>
                                <ErrorBannerTitle>Wiadomość nie została dostarczona</ErrorBannerTitle>
                                <ErrorBannerDetail>{entry.errorMessage}</ErrorBannerDetail>
                            </div>
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
