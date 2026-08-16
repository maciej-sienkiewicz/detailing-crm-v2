import styled from 'styled-components';
import { KsefCredentialsPanel } from '@/modules/finance/components';
import { RequireCapability } from '@/modules/subscription';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

/**
 * KSeF credentials are technical configuration of the finance module — without
 * the module they are presented as an upsell surface instead of a working form
 * (configuring an unowned module only produces confused users; the backend
 * rejects the API calls with 402 regardless).
 */
export function InvoicesSection() {
    return (
        <Wrap>
            <RequireCapability
                capability="FINANCE_KSEF"
                mode="upsell"
                message="Integracja z KSeF wymaga modułu Kontrola nad finansami."
            >
                <KsefCredentialsPanel />
            </RequireCapability>
        </Wrap>
    );
}
