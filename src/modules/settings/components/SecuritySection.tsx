import styled from 'styled-components';
import { PinSetupSection } from '@/modules/pin-switcher';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const SectionHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
`;

const SectionDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
`;

export const SecuritySection = () => (
    <Wrap>
        <SectionHeader>
            <SectionTitle>Bezpieczeństwo</SectionTitle>
            <SectionDesc>Zarządzaj ustawieniami bezpieczeństwa konta.</SectionDesc>
        </SectionHeader>
        <PinSetupSection />
    </Wrap>
);
