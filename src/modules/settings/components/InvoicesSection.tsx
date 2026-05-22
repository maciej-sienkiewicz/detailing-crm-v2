import React from 'react';
import styled from 'styled-components';
import { KsefCredentialsPanel } from '@/modules/finance/components';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

export function InvoicesSection() {
    return (
        <Wrap>
            <KsefCredentialsPanel />
        </Wrap>
    );
}
