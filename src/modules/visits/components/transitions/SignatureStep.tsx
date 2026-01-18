import styled from 'styled-components';
import { Button } from '@/common/components/Button';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const Description = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
`;

const SignatureArea = styled.div`
    background: linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%);
    border: 2px dashed ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xxl};
    text-align: center;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.md};
`;

const SignatureIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 36px;
    box-shadow: ${props => props.theme.shadows.lg};
`;

const SignatureTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const SignatureSubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    max-width: 400px;
`;

const PlaceholderBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: #78350f;
    margin-top: ${props => props.theme.spacing.sm};
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #10b981;
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const InfoIcon = styled.div`
    font-size: 20px;
    flex-shrink: 0;
`;

const InfoText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #065f46;
    line-height: 1.5;

    strong {
        font-weight: 600;
    }
`;

const ChecklistSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const ChecklistTitle = styled.h4`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const ChecklistItems = styled.ul`
    margin: 0;
    padding-left: ${props => props.theme.spacing.lg};
    list-style: none;
`;

const ChecklistItem = styled.li`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.sm};
    position: relative;

    &:before {
        content: '✓';
        position: absolute;
        left: -20px;
        color: #10b981;
        font-weight: bold;
    }

    &:last-child {
        margin-bottom: 0;
    }
`;

export const SignatureStep = ({ onConfirm }: { onConfirm: () => void }) => {
    return (
        <Container>
            <Description>
                Poproś klienta o podpisanie protokołu wydania pojazdu. Upewnij się, że klient
                potwierdza odbiór pojazdu w stanie zgodnym z oczekiwaniami.
            </Description>

            <SignatureArea>
                <SignatureIcon>✍️</SignatureIcon>
                <SignatureTitle>Podpis klienta</SignatureTitle>
                <SignatureSubtitle>
                    Poproś klienta o podpisanie protokołu wydania pojazdu na urządzeniu mobilnym
                    lub tradycyjnym formularzu papierowym.
                </SignatureSubtitle>
                <Button $variant="primary" onClick={onConfirm}>
                    Podpisano
                </Button>
                <PlaceholderBadge>
                    🚧 Funkcjonalność dostępna wkrótce
                </PlaceholderBadge>
            </SignatureArea>

            <ChecklistSection>
                <ChecklistTitle>Przed potwierdzeniem upewnij się, że:</ChecklistTitle>
                <ChecklistItems>
                    <ChecklistItem>
                        Klient zapoznał się z listą wykonanych usług
                    </ChecklistItem>
                    <ChecklistItem>
                        Stan pojazdu został zweryfikowany przy kliencie
                    </ChecklistItem>
                    <ChecklistItem>
                        Wszystkie dokumenty zostały przekazane klientowi
                    </ChecklistItem>
                    <ChecklistItem>
                        Kluczyki i pilot zostały zwrócone klientowi
                    </ChecklistItem>
                </ChecklistItems>
            </ChecklistSection>

            <InfoBox>
                <InfoIcon>💡</InfoIcon>
                <InfoText>
                    <strong>Tymczasowo:</strong> Po kliknięciu przycisku "Podpisano" system przejdzie
                    do ostatniego kroku finalizacji płatności. W przyszłości tutaj będzie możliwość
                    zbierania podpisu elektronicznego bezpośrednio w aplikacji.
                </InfoText>
            </InfoBox>
        </Container>
    );
};
