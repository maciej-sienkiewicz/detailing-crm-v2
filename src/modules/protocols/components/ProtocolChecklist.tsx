import { useState } from 'react';
import styled from 'styled-components';
import { useVisitProtocols, useSignVisitProtocol } from '../api/useProtocols';

const Container = styled.div`
    background: white;
    border-radius: ${props => props.theme.radii.lg};
    border: 1px solid ${props => props.theme.colors.border};
    overflow: hidden;
`;

const Header = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: rgb(248, 250, 252); // slate-50
`;

const Title = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.xs} 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const ChecklistContainer = styled.div`
    padding: ${props => props.theme.spacing.lg};
`;

const StepperList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const StepItem = styled.div<{ $isLast: boolean; $isSigned: boolean }>`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.$isLast ? '0' : props.theme.spacing.lg};
    position: relative;

    ${props => !props.$isLast && `
        &::before {
            content: '';
            position: absolute;
            left: 16px;
            top: 36px;
            bottom: 0;
            width: 2px;
            background: ${props.$isSigned ? 'rgb(34, 197, 94)' : props.theme.colors.border};
        }
    `}
`;

const StepIcon = styled.div<{ $isMandatory: boolean; $isSigned: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
    transition: all ${props => props.theme.transitions.fast};

    ${props => {
        if (props.$isSigned) {
            return `
                background: rgb(34, 197, 94); // green-500
                color: white;
                border: 2px solid rgb(34, 197, 94);
            `;
        }
        if (props.$isMandatory) {
            return `
                background: white;
                color: rgb(239, 68, 68); // red-500
                border: 2px solid rgb(239, 68, 68);
            `;
        }
        return `
            background: white;
            color: rgb(156, 163, 175); // gray-400
            border: 2px solid rgb(209, 213, 219); // gray-300
        `;
    }}

    svg {
        width: 16px;
        height: 16px;
    }
`;

const StepContent = styled.div<{ $isSigned: boolean }>`
    flex: 1;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isSigned ? 'rgb(240, 253, 244)' : 'transparent'}; // green-50
    border: 1px solid ${props => props.$isSigned ? 'rgb(187, 247, 208)' : 'transparent'}; // green-200
    transition: all ${props => props.theme.transitions.fast};
`;

const StepTitle = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const StepDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const StepMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.xs};
    margin-top: ${props => props.theme.spacing.sm};
`;

const Badge = styled.span<{ $variant: 'mandatory' | 'optional' | 'signed' | 'global' | 'service' }>`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: 2px ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.radii.full};
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;

    ${props => {
        switch (props.$variant) {
            case 'mandatory':
                return `
                    background: rgb(254, 242, 242); // red-50
                    color: rgb(220, 38, 38); // red-600
                `;
            case 'optional':
                return `
                    background: rgb(243, 244, 246); // gray-50
                    color: rgb(107, 114, 128); // gray-500
                `;
            case 'signed':
                return `
                    background: rgb(220, 252, 231); // green-100
                    color: rgb(22, 101, 52); // green-800
                `;
            case 'global':
                return `
                    background: rgb(239, 246, 255); // blue-50
                    color: rgb(37, 99, 235); // blue-600
                `;
            case 'service':
                return `
                    background: rgb(243, 232, 255); // purple-50
                    color: rgb(147, 51, 234); // purple-600
                `;
        }
    }}
`;

const SignedInfo = styled.div`
    margin-top: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm};
    background: white;
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
`;

const EmptyState = styled.div`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const ActionBar = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border-top: 1px solid ${props => props.theme.colors.border};
    background: rgb(249, 250, 251); // gray-50
    display: flex;
    gap: ${props => props.theme.spacing.md};
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    ${props => props.$variant === 'primary' ? `
        background: var(--brand-primary);
        color: white;
        border: none;

        &:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
    ` : `
        background: white;
        color: ${props.theme.colors.text};
        border: 1px solid ${props.theme.colors.border};

        &:hover {
            background: rgb(249, 250, 251);
        }
    `}

    svg {
        width: 18px;
        height: 18px;
    }
`;

const ProgressText = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    font-weight: 500;
`;

const ProgressBar = styled.div`
    flex: 1;
    min-width: 120px;
    height: 8px;
    background: rgb(229, 231, 235); // gray-200
    border-radius: ${props => props.theme.radii.full};
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
    height: 100%;
    width: ${props => props.$percent}%;
    background: linear-gradient(90deg, rgb(34, 197, 94), rgb(22, 163, 74)); // green gradient
    transition: width ${props => props.theme.transitions.normal};
`;

// Icons
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const CircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

interface ProtocolChecklistProps {
    visitId: string;
    stage: 'CHECK_IN' | 'CHECK_OUT';
}

export const ProtocolChecklist = ({ visitId, stage }: ProtocolChecklistProps) => {
    const [signingProtocol, setSigningProtocol] = useState<string | null>(null);
    const { data: protocols = [], isLoading, refetch } = useVisitProtocols(visitId);
    const signMutation = useSignVisitProtocol();

    // Filter protocols by stage
    const stageProtocols = protocols.filter(p => p.stage === stage);

    // Calculate progress
    const totalProtocols = stageProtocols.length;
    const signedProtocols = stageProtocols.filter(p => p.isSigned).length;
    const mandatoryProtocols = stageProtocols.filter(p => p.isMandatory);
    const signedMandatory = mandatoryProtocols.filter(p => p.isSigned).length;
    const progressPercent = totalProtocols > 0 ? (signedProtocols / totalProtocols) * 100 : 0;
    const canProceed = mandatoryProtocols.length === signedMandatory;

    const handleSignProtocol = async (protocolId: string) => {
        setSigningProtocol(protocolId);
        try {
            // Simulate signature capture - in real app, this would open a signature pad
            await new Promise(resolve => setTimeout(resolve, 1000));

            await signMutation.mutateAsync({
                visitId,
                protocolId,
                data: {
                    signatureUrl: '/signatures/mock-signature.png',
                    signedBy: 'Jan Kowalski',
                },
            });

            refetch();
        } catch (error) {
            console.error('Failed to sign protocol:', error);
        } finally {
            setSigningProtocol(null);
        }
    };

    const handleSignAll = () => {
        // Open signature flow for all unsigned protocols
        console.log('Opening signature flow for all protocols...');
    };

    if (isLoading) {
        return (
            <Container>
                <EmptyState>Ładowanie protokołów...</EmptyState>
            </Container>
        );
    }

    if (stageProtocols.length === 0) {
        return (
            <Container>
                <Header>
                    <Title>Protokoły dokumentacji</Title>
                    <Subtitle>
                        {stage === 'CHECK_IN' ? 'Przyjęcie pojazdu' : 'Wydanie pojazdu'}
                    </Subtitle>
                </Header>
                <EmptyState>
                    Brak wymaganych protokołów dla tego etapu wizyty.
                </EmptyState>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <Title>Protokoły dokumentacji</Title>
                <Subtitle>
                    {stage === 'CHECK_IN' ? 'Przyjęcie pojazdu' : 'Wydanie pojazdu'} - {signedProtocols} z {totalProtocols} podpisanych
                </Subtitle>
            </Header>

            <ChecklistContainer>
                <StepperList>
                    {stageProtocols
                        .sort((a, b) => {
                            // Mandatory first, then by creation date
                            if (a.isMandatory && !b.isMandatory) return -1;
                            if (!a.isMandatory && b.isMandatory) return 1;
                            return 0;
                        })
                        .map((protocol, index) => (
                            <StepItem
                                key={protocol.id}
                                $isLast={index === stageProtocols.length - 1}
                                $isSigned={protocol.isSigned}
                            >
                                <StepIcon $isMandatory={protocol.isMandatory} $isSigned={protocol.isSigned}>
                                    {protocol.isSigned ? (
                                        <CheckIcon />
                                    ) : protocol.isMandatory ? (
                                        <AlertIcon />
                                    ) : (
                                        <CircleIcon />
                                    )}
                                </StepIcon>

                                <StepContent $isSigned={protocol.isSigned}>
                                    <StepTitle>
                                        {protocol.protocolTemplate?.name || 'Nieznany protokół'}
                                        {protocol.isMandatory && !protocol.isSigned && (
                                            <span style={{ color: 'rgb(239, 68, 68)' }}>*</span>
                                        )}
                                    </StepTitle>

                                    {protocol.protocolTemplate?.description && (
                                        <StepDescription>
                                            {protocol.protocolTemplate.description}
                                        </StepDescription>
                                    )}

                                    <StepMeta>
                                        {protocol.isSigned ? (
                                            <Badge $variant="signed">✓ Podpisano</Badge>
                                        ) : (
                                            <>
                                                {protocol.isMandatory ? (
                                                    <Badge $variant="mandatory">Obowiązkowy</Badge>
                                                ) : (
                                                    <Badge $variant="optional">Opcjonalny</Badge>
                                                )}
                                            </>
                                        )}
                                    </StepMeta>

                                    {protocol.isSigned && protocol.signedAt && (
                                        <SignedInfo>
                                            Podpisano: {new Date(protocol.signedAt).toLocaleString('pl-PL')}
                                            {protocol.signedBy && ` przez ${protocol.signedBy}`}
                                        </SignedInfo>
                                    )}

                                    {!protocol.isSigned && (
                                        <div style={{ marginTop: '8px' }}>
                                            <ActionButton
                                                $variant="secondary"
                                                onClick={() => handleSignProtocol(protocol.id)}
                                                disabled={signingProtocol === protocol.id}
                                            >
                                                <PenIcon />
                                                {signingProtocol === protocol.id ? 'Podpisywanie...' : 'Podpisz teraz'}
                                            </ActionButton>
                                        </div>
                                    )}
                                </StepContent>
                            </StepItem>
                        ))}
                </StepperList>
            </ChecklistContainer>

            <ActionBar>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <ProgressBar>
                        <ProgressFill $percent={progressPercent} />
                    </ProgressBar>
                    <ProgressText>
                        {signedProtocols}/{totalProtocols}
                    </ProgressText>
                </div>

                {!canProceed && (
                    <ActionButton
                        $variant="primary"
                        onClick={handleSignAll}
                        disabled={signedProtocols === totalProtocols}
                    >
                        <PenIcon />
                        Otwórz arkusz podpisu dla wszystkich
                    </ActionButton>
                )}
            </ActionBar>
        </Container>
    );
};
