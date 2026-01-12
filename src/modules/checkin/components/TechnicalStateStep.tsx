import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { t } from '@/common/i18n';
import type { CheckInFormData, FuelLevel } from '../types';

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const FuelLevelSelector = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(5, 1fr);
    }
`;

const FuelLevelOption = styled.button<{ $selected: boolean }>`
    padding: ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.md};
    border: 2px solid ${props => props.$selected ? props.theme.colors.primary : props.theme.colors.border};
    background-color: ${props => props.$selected ? 'rgba(14, 165, 233, 0.1)' : props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};

    &:hover {
        border-color: ${props => props.theme.colors.primary};
        transform: translateY(-2px);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const FuelIcon = styled.div<{ $level: FuelLevel }>`
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.sm};
    background: linear-gradient(to top, 
        ${props => props.theme.colors.primary} 0%, 
        ${props => props.theme.colors.primary} ${props => props.$level}%, 
        ${props => props.theme.colors.border} ${props => props.$level}%, 
        ${props => props.theme.colors.border} 100%
    );
    border: 2px solid ${props => props.theme.colors.border};
`;

const FuelLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    text-align: center;
`;

const DepositSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const DepositItem = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
`;

const WarningBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%);
    border-left: 4px solid ${props => props.theme.colors.warning};
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    align-items: start;
    gap: ${props => props.theme.spacing.md};
    margin-top: ${props => props.theme.spacing.md};

    svg {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        color: ${props => props.theme.colors.warning};
    }
`;

const WarningText = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

interface TechnicalStateStepProps {
    formData: CheckInFormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<CheckInFormData>) => void;
}

export const TechnicalStateStep = ({ formData, errors, onChange }: TechnicalStateStepProps) => {
    const fuelLevels: FuelLevel[] = [0, 25, 50, 75, 100];

    const handleFuelLevelChange = (level: FuelLevel) => {
        onChange({
            technicalState: {
                ...formData.technicalState,
                fuelLevel: level,
            },
        });
    };

    const handleDepositChange = (item: keyof CheckInFormData['technicalState']['deposit'], checked: boolean) => {
        onChange({
            technicalState: {
                ...formData.technicalState,
                deposit: {
                    ...formData.technicalState.deposit,
                    [item]: checked,
                },
            },
        });
    };

    return (
        <StepContainer>
            <Card>
                <CardHeader>
                    <CardTitle>{t.checkin.technical.title}</CardTitle>
                </CardHeader>

                <FormGrid $columns={1}>
                    <FieldGroup>
                        <Label>{t.checkin.technical.mileage}</Label>
                        <Input
                            type="number"
                            value={formData.technicalState.mileage || ''}
                            onChange={(e) => onChange({
                                technicalState: {
                                    ...formData.technicalState,
                                    mileage: parseInt(e.target.value) || 0,
                                },
                            })}
                            placeholder={t.checkin.technical.mileagePlaceholder}
                        />
                        {errors.mileage && <ErrorMessage>{errors.mileage}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.technical.fuelLevel}</Label>
                        <FuelLevelSelector>
                            {fuelLevels.map(level => (
                                <FuelLevelOption
                                    key={level}
                                    type="button"
                                    $selected={formData.technicalState.fuelLevel === level}
                                    onClick={() => handleFuelLevelChange(level)}
                                >
                                    <FuelIcon $level={level} />
                                    <FuelLabel>{t.checkin.technical.fuelLevels[level]}</FuelLabel>
                                </FuelLevelOption>
                            ))}
                        </FuelLevelSelector>
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.technical.deposit}</Label>
                        <DepositSection>
                            <DepositItem>
                                <Toggle
                                    checked={formData.technicalState.deposit.keys}
                                    onChange={(checked) => handleDepositChange('keys', checked)}
                                    label={t.checkin.technical.depositItems.keys}
                                />
                            </DepositItem>
                            <DepositItem>
                                <Toggle
                                    checked={formData.technicalState.deposit.registrationDocument}
                                    onChange={(checked) => handleDepositChange('registrationDocument', checked)}
                                    label={t.checkin.technical.depositItems.registrationDocument}
                                />
                            </DepositItem>
                        </DepositSection>
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.checkin.technical.inspectionNotes}</Label>
                        <TextArea
                            value={formData.technicalState.inspectionNotes}
                            onChange={(e) => onChange({
                                technicalState: {
                                    ...formData.technicalState,
                                    inspectionNotes: e.target.value,
                                },
                            })}
                            placeholder={t.checkin.technical.inspectionNotesPlaceholder}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Toggle
                            checked={formData.technicalState.isVeryDirty}
                            onChange={(checked) => onChange({
                                technicalState: {
                                    ...formData.technicalState,
                                    isVeryDirty: checked,
                                },
                            })}
                            label={t.checkin.technical.isVeryDirty}
                        />

                        {formData.technicalState.isVeryDirty && (
                            <WarningBox>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <WarningText>{t.checkin.technical.dirtyWarning}</WarningText>
                            </WarningBox>
                        )}
                    </FieldGroup>
                </FormGrid>
            </Card>
        </StepContainer>
    );
};