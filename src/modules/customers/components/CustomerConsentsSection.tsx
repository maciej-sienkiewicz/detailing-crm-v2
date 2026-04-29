// src/modules/customers/components/CustomerConsentsSection.tsx

import { useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { formatDateTime } from '@/common/utils';
import {
    useCustomerConsentsStatus,
    useSignCustomerConsent,
    useRevokeCustomerConsent,
    useUploadConsentAttachment,
} from '../hooks/useCustomerConsents';
import type { CustomerConsentStatusItem } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.header`
    padding: 13px 18px 10px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const CardTitleWrap = styled.div``;

const CardTitle = styled.h4`
    margin: 0 0 2px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 8px;

    svg { width: 15px; height: 15px; color: ${st.accentBlue}; }
`;

const CardSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const ConsentList = styled.div`
    display: flex;
    flex-direction: column;
`;

const ConsentRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition};
    animation: ${fadeIn} 200ms ease;

    &:last-child { border-bottom: none; }

    &:hover { background: ${st.bgCardAlt}; }
`;

const ToggleButton = styled.button<{ $active: boolean; $disabled: boolean }>`
    position: relative;
    width: 40px;
    height: 22px;
    background: ${p => p.$active ? st.accentBlue : st.border};
    border: none;
    border-radius: ${st.radiusFull};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    flex-shrink: 0;
    transition: background ${st.transition};
    opacity: ${p => p.$disabled ? 0.55 : 1};
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.08);
    outline: none;

    &:focus-visible {
        box-shadow: 0 0 0 3px ${st.accentBlueDim};
    }

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${p => p.$active ? '20px' : '2px'};
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        transition: left 180ms cubic-bezier(0.32, 0.72, 0, 1);
    }
`;

const ConsentInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const ConsentName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ConsentMeta = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const StatusBadge = styled.span<{ $status: 'VALID' | 'OUTDATED' | 'REQUIRED' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: ${st.radiusFull};
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
    flex-shrink: 0;

    ${p => p.$status === 'VALID' && `
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
    `}
    ${p => p.$status === 'OUTDATED' && `
        background: ${st.accentAmberDim};
        color: ${st.accentAmber};
    `}
    ${p => p.$status === 'REQUIRED' && `
        background: ${st.accentRedDim};
        color: ${st.accentRed};
    `}
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const IconBtn = styled.button<{ $variant?: 'default' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 500;
    border: 1px solid ${p => p.$variant === 'danger' ? 'rgba(239,68,68,0.25)' : st.border};
    background: ${p => p.$variant === 'danger' ? st.accentRedDim : st.bgCard};
    color: ${p => p.$variant === 'danger' ? st.accentRed : st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    outline: none;

    svg { width: 12px; height: 12px; flex-shrink: 0; }

    &:hover:not(:disabled) {
        background: ${p => p.$variant === 'danger' ? 'rgba(239,68,68,0.12)' : st.bgCardAlt};
        border-color: ${p => p.$variant === 'danger' ? st.accentRed : st.borderHover};
        color: ${p => p.$variant === 'danger' ? st.accentRed : st.text};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const Spinner = styled.span`
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: ${spin} 600ms linear infinite;
    flex-shrink: 0;
`;

const EmptyState = styled.div`
    padding: 28px 18px;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const ErrorState = styled.div`
    padding: 16px 18px;
    color: ${st.accentRed};
    font-size: ${st.fontXs};
    display: flex;
    align-items: center;
    gap: 8px;

    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const LoadingRow = styled.div`
    padding: 20px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${st.textMuted};
    font-size: ${st.fontXs};
`;

const ConfirmPopover = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${st.bgOverlay};
    animation: ${fadeIn} 150ms ease;
`;

const ConfirmBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 20px 22px;
    max-width: 360px;
    width: calc(100% - 32px);
    box-shadow: ${st.shadowLg};
`;

const ConfirmTitle = styled.p`
    margin: 0 0 6px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const ConfirmDesc = styled.p`
    margin: 0 0 16px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

const ConfirmActions = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
`;

const CancelBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 500;
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.bgCardAlt}; border-color: ${st.borderHover}; }
`;

const DangerBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    border: none;
    background: ${st.accentRed};
    color: white;
    cursor: pointer;
    transition: all ${st.transition};
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover { background: #dc2626; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const NoScanWarning = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 3px;
    font-size: 10px;
    font-weight: 500;
    color: ${st.accentAmber};

    svg { width: 11px; height: 11px; flex-shrink: 0; }
`;

// ─── Sub-component: single consent row ────────────────────────────────────────

interface ConsentItemProps {
    item: CustomerConsentStatusItem;
    onToggle: (item: CustomerConsentStatusItem) => void;
    onAttach: (item: CustomerConsentStatusItem, file: File) => void;
    onRevoke: (item: CustomerConsentStatusItem) => void;
    isBusy: boolean;
}

function ConsentItem({ item, onToggle, onAttach, onRevoke, isBusy }: ConsentItemProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isActive = item.status === 'VALID' || item.status === 'OUTDATED';
    const hasAttachment = !!item.attachmentUrl;
    const signedManuallyNoScan = isActive && !hasAttachment;

    const statusLabel = {
        VALID:     'Aktualna',
        OUTDATED:  'Nieaktualna',
        REQUIRED:  'Brak zgody',
    }[item.status];

    const metaText = isActive && item.signedAt
        ? `Podpisano ${formatDateTime(item.signedAt)}${item.signedVersion ? ` · wersja ${item.signedVersion}` : ''}`
        : 'Zgoda nie została udzielona';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onAttach(item, file);
            e.target.value = '';
        }
    };

    return (
        <ConsentRow>
            <ToggleButton
                $active={isActive}
                $disabled={isBusy}
                disabled={isBusy}
                onClick={() => onToggle(item)}
                title={isActive ? 'Kliknij aby wycofać zgodę' : 'Kliknij aby udzielić zgody'}
                aria-label={`${item.definitionName}: ${isActive ? 'wycofaj zgodę' : 'udziel zgody'}`}
            />
            <ConsentInfo>
                <ConsentName>
                    {item.definitionName}
                    <StatusBadge $status={item.status}>{statusLabel}</StatusBadge>
                </ConsentName>
                <ConsentMeta>{metaText}</ConsentMeta>
                {signedManuallyNoScan && (
                    <NoScanWarning>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Nie dołączyłeś skanu zgody
                    </NoScanWarning>
                )}
            </ConsentInfo>
            <Actions>
                {/* Show signed attachment if available, otherwise template for unsigned consents */}
                {hasAttachment ? (
                    <IconBtn
                        as="a"
                        href={item.attachmentUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Podgląd podpisanego dokumentu zgody"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Podpisany dok.
                    </IconBtn>
                ) : !isActive && item.downloadUrl ? (
                    <IconBtn
                        as="a"
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Podgląd szablonu zgody (PDF)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Szablon
                    </IconBtn>
                ) : null}
                <IconBtn
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                    title={hasAttachment ? 'Zastąp skan nowszym dokumentem' : 'Dołącz zeskanowany dokument zgody'}
                >
                    {isBusy ? <Spinner /> : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                    )}
                    {hasAttachment ? 'Zastąp skan' : 'Dołącz plik'}
                </IconBtn>
                <HiddenFileInput
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileChange}
                />
                {isActive && (
                    <IconBtn
                        $variant="danger"
                        onClick={() => onRevoke(item)}
                        disabled={isBusy}
                        title="Wycofaj zgodę"
                    >
                        {isBusy ? <Spinner /> : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                            </svg>
                        )}
                        Wycofaj
                    </IconBtn>
                )}
            </Actions>
        </ConsentRow>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface CustomerConsentsSectionProps {
    customerId: string;
}

export const CustomerConsentsSection = ({ customerId }: CustomerConsentsSectionProps) => {
    const [confirmRevoke, setConfirmRevoke] = useState<CustomerConsentStatusItem | null>(null);
    const [busyDefinitionId, setBusyDefinitionId] = useState<string | null>(null);

    const { data, isLoading, isError } = useCustomerConsentsStatus(customerId);
    const { mutateAsync: signConsent } = useSignCustomerConsent(customerId);
    const { mutateAsync: revokeConsent, isPending: isRevoking } = useRevokeCustomerConsent(customerId);
    const { mutateAsync: uploadAttachment } = useUploadConsentAttachment();

    const handleToggle = async (item: CustomerConsentStatusItem) => {
        const isActive = item.status === 'VALID' || item.status === 'OUTDATED';
        if (isActive) {
            setConfirmRevoke(item);
        } else {
            setBusyDefinitionId(item.definitionId);
            try {
                await signConsent({ templateId: item.currentTemplateId });
            } finally {
                setBusyDefinitionId(null);
            }
        }
    };

    const handleAttach = async (item: CustomerConsentStatusItem, file: File) => {
        setBusyDefinitionId(item.definitionId);
        try {
            const result = await signConsent({
                templateId: item.currentTemplateId,
                payload: { requestAttachmentUpload: true },
            });
            if (result.attachmentUploadUrl) {
                await uploadAttachment({ uploadUrl: result.attachmentUploadUrl, file });
            }
        } finally {
            setBusyDefinitionId(null);
        }
    };

    const handleConfirmRevoke = async () => {
        if (!confirmRevoke) return;
        const consentId = confirmRevoke.consentId ?? confirmRevoke.definitionId;
        try {
            await revokeConsent(consentId);
        } finally {
            setConfirmRevoke(null);
        }
    };

    const consents = data?.consents ?? [];

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitleWrap>
                        <CardTitle>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                            </svg>
                            Zgody klienta
                        </CardTitle>
                        <CardSubtitle>Zarządzaj zgodami RODO i marketingowymi</CardSubtitle>
                    </CardTitleWrap>
                </CardHeader>

                <ConsentList>
                    {isLoading && (
                        <LoadingRow>
                            <Spinner />
                            Ładowanie zgód…
                        </LoadingRow>
                    )}

                    {isError && (
                        <ErrorState>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Nie udało się załadować zgód. Odśwież stronę.
                        </ErrorState>
                    )}

                    {!isLoading && !isError && consents.length === 0 && (
                        <EmptyState>Brak zdefiniowanych zgód w systemie.</EmptyState>
                    )}

                    {consents.map(item => (
                        <ConsentItem
                            key={item.definitionId}
                            item={item}
                            onToggle={handleToggle}
                            onAttach={handleAttach}
                            onRevoke={setConfirmRevoke}
                            isBusy={busyDefinitionId === item.definitionId}
                        />
                    ))}
                </ConsentList>
            </Card>

            {confirmRevoke && (
                <ConfirmPopover onClick={() => setConfirmRevoke(null)}>
                    <ConfirmBox onClick={e => e.stopPropagation()}>
                        <ConfirmTitle>Wycofanie zgody</ConfirmTitle>
                        <ConfirmDesc>
                            Czy na pewno chcesz wycofać zgodę{' '}
                            <strong>„{confirmRevoke.definitionName}"</strong>?
                            Tej operacji nie można cofnąć.
                        </ConfirmDesc>
                        <ConfirmActions>
                            <CancelBtn onClick={() => setConfirmRevoke(null)}>
                                Anuluj
                            </CancelBtn>
                            <DangerBtn
                                onClick={handleConfirmRevoke}
                                disabled={isRevoking}
                            >
                                {isRevoking && <Spinner />}
                                Wycofaj zgodę
                            </DangerBtn>
                        </ConfirmActions>
                    </ConfirmBox>
                </ConfirmPopover>
            )}
        </>
    );
};
