import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, CloseBtn } from '@/common/components/ModalKit';
import { usePermissions } from '@/core/permissions/usePermissions';
import { useAddOnUnlock } from '../hooks/useAddOnUnlock';
import { AddOnActivationDialog } from './PlanChangeDialog';
import { formatCents } from '../utils/formatters';
import type { AddOnKey, PaywallErrorResponse } from '../types';

/**
 * Global safety net for the HTTP 402 MODULE_REQUIRED contract.
 *
 * Mounted once (App). Whenever any API call is rejected because the studio
 * lacks a module — including actions the UI failed to gate — the interceptor in
 * apiClient dispatches `api:paywall` and this dialog turns the dead end into a
 * purchase path: the owner gets one-click checkout, an employee gets the
 * "ask the owner" explanation. The user must never see a raw 402 error.
 */
export function PaywallListener() {
    const [payload, setPayload] = useState<PaywallErrorResponse | null>(null);
    const { isOwner } = usePermissions();
    const unlock = useAddOnUnlock();

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<PaywallErrorResponse>).detail;
            if (detail?.code === 'MODULE_REQUIRED') setPayload(detail);
        };
        window.addEventListener('api:paywall', handler);
        return () => window.removeEventListener('api:paywall', handler);
    }, []);

    if (!payload) return null;

    const close = () => setPayload(null);

    const handleBuy = (addOnKey: AddOnKey, addOnName: string) => {
        void unlock.openUnlockDialog(addOnKey, addOnName);
    };

    return (
        <>
            <ModalShell isOpen onClose={close} maxWidth="480px">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Ta funkcja wymaga dodatkowego modułu</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={close} />
                </ModalHeader>
                <ModalContent>
                    <Lead>
                        {payload.capabilityDisplayName
                            ? <><strong>{payload.capabilityDisplayName}</strong> nie jest dostępna w Twoim planie.</>
                            : payload.message}
                    </Lead>

                    {payload.upsell.length > 0 && (
                        <OptionList>
                            {payload.upsell.map((option) => (
                                <OptionRow key={option.addOnKey}>
                                    <OptionInfo>
                                        <OptionName>{option.addOnName}</OptionName>
                                        {option.monthlyPriceGrossCents != null && (
                                            <OptionPrice>{formatCents(option.monthlyPriceGrossCents)}/mies.</OptionPrice>
                                        )}
                                    </OptionInfo>
                                    {isOwner && option.isAvailable && (
                                        <BuyBtn type="button" onClick={() => handleBuy(option.addOnKey, option.addOnName)}>
                                            Wykup dostęp
                                        </BuyBtn>
                                    )}
                                </OptionRow>
                            ))}
                        </OptionList>
                    )}

                    {!isOwner && (
                        <EmployeeHint>
                            Aktywacja modułu wymaga uprawnień właściciela studia —
                            poproś właściciela o odblokowanie tej funkcji.
                        </EmployeeHint>
                    )}

                    {isOwner && (
                        <SettingsLink href="/settings?tab=plan">
                            Zobacz wszystkie pakiety i moduły
                        </SettingsLink>
                    )}
                </ModalContent>
            </ModalShell>

            {unlock.dialogOpen && unlock.pendingKey && (
                <AddOnActivationDialog
                    addOnKey={unlock.pendingKey}
                    addOnName={unlock.pendingName}
                    preview={unlock.preview}
                    isLoadingPreview={unlock.loadingPreview}
                    onClose={() => { unlock.closeDialog(); close(); }}
                />
            )}
        </>
    );
}

const Lead = styled.p`
    margin: 0 0 16px;
    font-size: 14px;
    color: #475569;
    line-height: 1.5;
`;

const OptionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
`;

const OptionRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
`;

const OptionInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OptionName = styled.span`
    font-size: 14px;
    font-weight: 600;
`;

const OptionPrice = styled.span`
    font-size: 12.5px;
    color: #64748b;
`;

const BuyBtn = styled.button`
    flex-shrink: 0;
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: #0284c7;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover { background: #0369a1; }
`;

const EmployeeHint = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
`;

const SettingsLink = styled.a`
    display: inline-block;
    font-size: 13px;
    color: #0284c7;
    text-decoration: none;

    &:hover { text-decoration: underline; }
`;
