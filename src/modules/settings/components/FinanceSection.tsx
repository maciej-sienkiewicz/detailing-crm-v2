import styled from 'styled-components';
import { PaymentTrackingPanel } from '@/modules/finance/components';
import { RequireCapability } from '@/modules/subscription';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

/**
 * Jak moduł finansów liczy przychód i koszty. Bez modułu ustawienie niczego nie zmienia,
 * więc jak przy KSeF pokazujemy w jego miejscu ofertę modułu.
 */
export function FinanceSection() {
    return (
        <Wrap>
            <RequireCapability
                capability="FINANCE_ACCESS"
                mode="upsell"
                message="Ustawienia finansów wymagają modułu „Kontrola nad finansami”."
            >
                <PaymentTrackingPanel />
            </RequireCapability>
        </Wrap>
    );
}
