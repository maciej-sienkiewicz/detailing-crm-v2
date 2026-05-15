import React from 'react';
import styled from 'styled-components';
import { KsefCredentialsPanel } from '@/modules/finance/components';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

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

const KsefPanelMock = () => (
    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>NIP podatnika</div>
            <div style={{ height: '36px', background: '#e2e8f0', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Token API KSeF</div>
            <div style={{ height: '36px', background: '#e2e8f0', borderRadius: '6px' }} />
        </div>
        <div style={{ height: '36px', width: '140px', background: '#cbd5e1', borderRadius: '6px' }} />
    </div>
);

export function InvoicesSection() {
    const financeFeature = useFeature('FINANCE');

    return (
        <Wrap>
            <SectionHead>
                <SectionTitle>Faktury i płatności</SectionTitle>
                <SectionDesc>
                    Połącz CRM z Krajowym Systemem e-Faktur (KSeF), aby automatycznie pobierać faktury kosztowe.
                </SectionDesc>
            </SectionHead>

            {financeFeature.enabled ? (
                <KsefCredentialsPanel />
            ) : (
                <LockedSection locked message="Połączenie z KSeF wymaga modułu Finanse.">
                    <KsefPanelMock />
                </LockedSection>
            )}
        </Wrap>
    );
}
