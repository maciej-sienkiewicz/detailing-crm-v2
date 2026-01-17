import { useState } from 'react';
import styled from 'styled-components';
import type { QualityCheckItem } from '../../hooks/useStateTransition.ts';

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

const ChecklistSection = styled.div`
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const ChecklistItems = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const ChecklistItem = styled.label`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: white;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.sm};
    }
`;

const Checkbox = styled.input`
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--brand-primary);
`;

const CheckLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    flex: 1;
`;

const CheckIcon = styled.div<{ $checked: boolean }>`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => props.$checked ? '#10b981' : props.theme.colors.border};
    color: white;
    font-size: 14px;
    transition: all 0.2s ease;
`;

const WarningBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const WarningIcon = styled.div`
    font-size: 20px;
    flex-shrink: 0;
`;

const WarningText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #78350f;
    line-height: 1.5;
`;

const ActionButtons = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.md};
`;

const ActionButton = styled.button<{ $variant: 'warning' | 'success' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};

    ${props => props.$variant === 'warning' && `
        background: white;
        color: #dc2626;
        border: 2px solid #dc2626;

        &:hover {
            background: #dc2626;
            color: white;
        }
    `}

    ${props => props.$variant === 'success' && `
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover {
            box-shadow: ${props.theme.shadows.lg};
            transform: translateY(-1px);
        }
    `}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

interface QualityCheckStepProps {
    onApprove: () => void;
    onReject: () => void;
}

const defaultChecks: QualityCheckItem[] = [
    { id: 'scope', label: 'Zgodność z zakresem zlecenia', checked: false },
    { id: 'quality', label: 'Jakość wykonania usług', checked: false },
    { id: 'condition', label: 'Stan techniczny pojazdu', checked: false },
];

export const QualityCheckStep = ({ onApprove, onReject }: QualityCheckStepProps) => {
    const [checks, setChecks] = useState<QualityCheckItem[]>(defaultChecks);

    const handleToggle = (id: string) => {
        setChecks(prev =>
            prev.map(check =>
                check.id === id ? { ...check, checked: !check.checked } : check
            )
        );
    };

    const allChecked = checks.every(check => check.checked);

    return (
        <Container>
            <Description>
                Przed przekazaniem pojazdu do odbioru przeprowadź weryfikację jakości wykonanych usług.
                Zaznacz wszystkie punkty kontrolne.
            </Description>

            <ChecklistSection>
                <SectionTitle>Lista kontrolna jakości</SectionTitle>
                <ChecklistItems>
                    {checks.map(check => (
                        <ChecklistItem key={check.id}>
                            <Checkbox
                                type="checkbox"
                                checked={check.checked}
                                onChange={() => handleToggle(check.id)}
                            />
                            <CheckLabel>{check.label}</CheckLabel>
                            <CheckIcon $checked={check.checked}>
                                {check.checked && '✓'}
                            </CheckIcon>
                        </ChecklistItem>
                    ))}
                </ChecklistItems>
            </ChecklistSection>

            {!allChecked && (
                <WarningBox>
                    <WarningIcon>⚠️</WarningIcon>
                    <WarningText>
                        Jeśli którykolwiek punkt nie jest spełniony, wybierz opcję "Wymaga poprawek"
                        i wróć do etapu realizacji.
                    </WarningText>
                </WarningBox>
            )}

            <ActionButtons>
                <ActionButton $variant="warning" onClick={onReject}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Wymaga poprawek
                </ActionButton>
                <ActionButton
                    $variant="success"
                    onClick={onApprove}
                    disabled={!allChecked}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Zatwierdzam jakość
                </ActionButton>
            </ActionButtons>
        </Container>
    );
};