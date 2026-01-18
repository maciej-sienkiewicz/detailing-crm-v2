import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { t } from '@/common/i18n';
import type { CheckInFormData } from '../types';

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
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


interface TechnicalStateStepProps {
    formData: CheckInFormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<CheckInFormData>) => void;
}

export const TechnicalStateStep = ({ formData, errors, onChange }: TechnicalStateStepProps) => {
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
                </FormGrid>
            </Card>
        </StepContainer>
    );
};
