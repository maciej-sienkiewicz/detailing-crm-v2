import React from 'react';
import styled from 'styled-components';
import { KsefCredentialsPanel } from '@/modules/finance/components';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const SectionHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SectionTitle = styled.h2`
    font-size: 18px;
    font-weight: 700;
    color: ${(p) => p.theme.colors.text};
    margin: 0;
`;

const SectionDesc = styled.p`
    font-size: 13px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
`;

export function InvoicesSection() {
    return (
        <Wrap>
            <SectionHead>
                <SectionTitle>Faktury i płatności</SectionTitle>
                <SectionDesc>
                    Połącz CRM z Krajowym Systemem e-Faktur (KSeF), aby automatycznie pobierać faktury kosztowe.
                </SectionDesc>
            </SectionHead>

            <KsefCredentialsPanel />
        </Wrap>
    );
}
