import { useState } from 'react';
import styled from 'styled-components';
import { ProtocolChecklist } from '../components/ProtocolChecklist';

const Container = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    background: rgb(248, 250, 252); // bg-slate-50

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const Header = styled.header`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const Title = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    max-width: 700px;
`;

const TabContainer = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    border-bottom: 2px solid ${props => props.theme.colors.border};
    padding-bottom: ${props => props.theme.spacing.sm};
`;

const Tab = styled.button<{ $isActive: boolean }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border: none;
    background: ${props => props.$isActive ? 'var(--brand-primary)' : 'transparent'};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.textSecondary};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.$isActive ? 'var(--brand-primary)' : 'rgb(243, 244, 246)'};
    }
`;

const ContentArea = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const InfoCard = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.sm};
`;

const InfoTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const InfoText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
`;

const VisitIdInput = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    align-items: center;
    padding: ${props => props.theme.spacing.md};
    background: rgb(255, 251, 235); // yellow-50
    border: 1px solid rgb(254, 243, 199); // yellow-200
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: rgb(120, 53, 15); // yellow-900
`;

const Code = styled.code`
    padding: 2px 6px;
    background: rgb(254, 252, 232); // yellow-100
    border-radius: ${props => props.theme.radii.sm};
    font-family: monospace;
    font-weight: 600;
`;

export const ProtocolDemoView = () => {
    const [activeStage, setActiveStage] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
    const mockVisitId = 'demo-visit-123';

    return (
        <Container>
            <Header>
                <Title>Demo: Protokoły Dokumentacji</Title>
                <Subtitle>
                    Podgląd systemu protokołów dla technicznych. Ta strona prezentuje, jak wygląda lista protokołów
                    wymaganych przy przyjęciu i wydaniu pojazdu dla wizyty.
                </Subtitle>
            </Header>

            <InfoCard>
                <InfoTitle>💡 Informacje o demo</InfoTitle>
                <InfoText>
                    Ta strona demonstruje komponent <Code>ProtocolChecklist</Code>, który jest używany przez
                    techników podczas przyjmowania i wydawania pojazdu. System automatycznie generuje listę
                    wymaganych protokołów na podstawie:
                </InfoText>
                <ul style={{ marginTop: '12px', marginBottom: '0', fontSize: '14px', color: 'rgb(75, 85, 99)' }}>
                    <li>Globalnych reguł (protokoły zawsze wymagane)</li>
                    <li>Usług dodanych do wizyty (protokoły specyficzne dla usług)</li>
                </ul>
            </InfoCard>

            <VisitIdInput>
                <span>🔧 ID wizyty demo:</span>
                <Code>{mockVisitId}</Code>
            </VisitIdInput>

            <TabContainer>
                <Tab
                    $isActive={activeStage === 'CHECK_IN'}
                    onClick={() => setActiveStage('CHECK_IN')}
                >
                    ⬇ Przyjęcie pojazdu
                </Tab>
                <Tab
                    $isActive={activeStage === 'CHECK_OUT'}
                    onClick={() => setActiveStage('CHECK_OUT')}
                >
                    ⬆ Wydanie pojazdu
                </Tab>
            </TabContainer>

            <ContentArea>
                <ProtocolChecklist
                    visitId={mockVisitId}
                    stage={activeStage}
                />
            </ContentArea>
        </Container>
    );
};
