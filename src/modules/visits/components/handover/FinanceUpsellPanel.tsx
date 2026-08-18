import styled from 'styled-components';
import { usePermissions } from '@/core/permissions/usePermissions';
import { useCapability } from '@/modules/subscription';
import { useAddOnUnlock } from '@/modules/subscription/hooks/useAddOnUnlock';
import { AddOnActivationDialog } from '@/modules/subscription/components/PlanChangeDialog';
import { formatCents } from '@/modules/subscription/utils/formatters';
import type { AddOnKey } from '@/modules/subscription/types';

/**
 * The high-intent upsell moment: the user is closing a visit, the exact second
 * the finance module would save them work. Shown INSTEAD of the settlement
 * section when the module is missing; the visit can still be closed without a
 * document (core BASIC operation; blocking it would create churn, not revenue).
 */
interface Props {
    /** Gross amount of the visit: makes the benefit concrete, not abstract. */
    grossAmount: number;
    currency: string;
}

export function FinanceUpsellPanel({ grossAmount, currency }: Props) {
    const finance = useCapability('FINANCE_INVOICE_ISSUE');
    const { isOwner } = usePermissions();
    const unlock = useAddOnUnlock();

    const option = finance.upsell[0];

    return (
        <>
            <Panel>
                <LockBadge>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </LockBadge>

                <Title>Rozliczenia i faktury wymagają modułu „Kontrola nad finansami"</Title>

                <BenefitList>
                    <Benefit>
                        Faktura do KSeF jednym kliknięciem, także dla tej wizyty
                        na kwotę <strong>{formatCents(grossAmount)} {currency}</strong>
                    </Benefit>
                    <Benefit>Paragony i dokumenty przychodowe wystawiane automatycznie przy wydaniu pojazdu</Benefit>
                    <Benefit>Kasa, rozliczenia płatności i pełna historia dokumentów w jednym miejscu</Benefit>
                </BenefitList>

                {isOwner && option?.isAvailable ? (
                    <BuyBtn
                        type="button"
                        onClick={() => unlock.openUnlockDialog(option.addOnKey as AddOnKey, option.addOnName)}
                    >
                        Wykup dostęp
                        {option.monthlyPriceGrossCents != null &&
                            ` - ${formatCents(option.monthlyPriceGrossCents)}/mies.`}
                    </BuyBtn>
                ) : (
                    <EmployeeHint>
                        Aktywacja modułu wymaga uprawnień właściciela studia.
                    </EmployeeHint>
                )}

                <ContinueHint>
                    Możesz też wydać pojazd bez wystawiania dokumentu, przyciskiem poniżej.
                </ContinueHint>
            </Panel>

            {unlock.dialogOpen && unlock.pendingKey && (
                <AddOnActivationDialog
                    addOnKey={unlock.pendingKey}
                    addOnName={unlock.pendingName}
                    preview={unlock.preview}
                    isLoadingPreview={unlock.loadingPreview}
                    onClose={unlock.closeDialog}
                />
            )}
        </>
    );
}

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 28px 24px;
    border: 1.5px dashed #bae6fd;
    border-radius: 12px;
    background: #f0f9ff;
    text-align: center;
`;

const LockBadge = styled.div`
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0284c7;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Title = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const BenefitList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Benefit = styled.li`
    font-size: 13.5px;
    color: #475569;
    line-height: 1.5;

    &::before {
        content: '✓ ';
        color: #16a34a;
        font-weight: 700;
    }
`;

const BuyBtn = styled.button`
    margin-top: 4px;
    padding: 10px 18px;
    border: none;
    border-radius: 9px;
    background: #0284c7;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;

    &:hover { background: #0369a1; }
`;

const EmployeeHint = styled.div`
    font-size: 13px;
    color: #64748b;
`;

const ContinueHint = styled.div`
    font-size: 12.5px;
    color: #94a3b8;
`;
