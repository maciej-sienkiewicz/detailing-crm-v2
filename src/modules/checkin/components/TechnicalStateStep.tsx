import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { FormGrid, FieldGroup, Label, TextArea } from '@/common/components/Form';
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
    flex-direction: row;
    gap: 12px;
`;

const DepositItem = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
    padding: 10px 12px;
    background: #F8FAFC;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: #FFFFFF;
        border-color: ${props => props.theme.colors.primary};
    }
`;

const DepositLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    user-select: none;
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
                    <CardTitle>Depozyt</CardTitle>
                </CardHeader>

                <FormGrid $columns={1}>
                    <FieldGroup>
                        <DepositSection>
                            <DepositItem>
                                <DepositLabel>{t.checkin.technical.depositItems.keys}</DepositLabel>
                                <Toggle
                                    checked={formData.technicalState.deposit.keys}
                                    onChange={(checked) => handleDepositChange('keys', checked)}
                                />
                            </DepositItem>
                            <DepositItem>
                                <DepositLabel>{t.checkin.technical.depositItems.registrationDocument}</DepositLabel>
                                <Toggle
                                    checked={formData.technicalState.deposit.registrationDocument}
                                    onChange={(checked) => handleDepositChange('registrationDocument', checked)}
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
