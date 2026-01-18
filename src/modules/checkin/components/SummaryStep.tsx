// src/modules/checkin/components/SummaryStepV2.tsx

import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Divider } from '@/common/components/Divider';
import { formatPhoneNumber } from '@/common/utils';
import { t } from '@/common/i18n';
import type { CheckInFormData } from '../types';

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const SummarySection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const SectionTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: ${props => props.theme.colors.primary};
    }
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const InfoItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
`;

const InfoLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const InfoValue = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
`;

interface SummaryStepProps {
    formData: CheckInFormData;
    readOnly?: boolean;
}

export const SummaryStep = ({ formData, readOnly = false }: SummaryStepProps) => {
    const depositItems = [];
    if (formData.technicalState.deposit.keys) depositItems.push(t.checkin.technical.depositItems.keys);
    if (formData.technicalState.deposit.registrationDocument) depositItems.push(t.checkin.technical.depositItems.registrationDocument);

    return (
        <StepContainer>
            <Card>
                <CardHeader>
                    <CardTitle>{t.checkin.summary.title}</CardTitle>
                </CardHeader>

                <SummarySection>
                    <SectionTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.checkin.summary.customerInfo}
                    </SectionTitle>
                    <InfoGrid>
                        <InfoItem>
                            <InfoLabel>Imię i nazwisko</InfoLabel>
                            <InfoValue>{formData.customerData.firstName} {formData.customerData.lastName}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>{t.checkin.verification.phone}</InfoLabel>
                            <InfoValue>{formatPhoneNumber(formData.customerData.phone)}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>{t.checkin.verification.email}</InfoLabel>
                            <InfoValue>{formData.customerData.email}</InfoValue>
                        </InfoItem>
                        {formData.homeAddress && (
                            <InfoItem style={{ gridColumn: '1 / -1' }}>
                                <InfoLabel>{t.customers.form.homeAddress.title}</InfoLabel>
                                <InfoValue>
                                    {formData.homeAddress.street}, {formData.homeAddress.postalCode} {formData.homeAddress.city}
                                </InfoValue>
                            </InfoItem>
                        )}
                        {formData.company && (
                            <>
                                <InfoItem style={{ gridColumn: '1 / -1' }}>
                                    <InfoLabel>{t.customers.form.company.title}</InfoLabel>
                                    <InfoValue>{formData.company.name}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>{t.customers.form.company.nip}</InfoLabel>
                                    <InfoValue>{formData.company.nip}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>{t.customers.form.company.regon}</InfoLabel>
                                    <InfoValue>{formData.company.regon}</InfoValue>
                                </InfoItem>
                                <InfoItem style={{ gridColumn: '1 / -1' }}>
                                    <InfoLabel>Adres firmy</InfoLabel>
                                    <InfoValue>
                                        {formData.company.address.street}, {formData.company.address.postalCode} {formData.company.address.city}
                                    </InfoValue>
                                </InfoItem>
                            </>
                        )}
                    </InfoGrid>
                </SummarySection>

                <Divider />

                {formData.vehicleData && (
                    <SummarySection>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            {t.checkin.summary.vehicleInfo}
                        </SectionTitle>
                        <InfoGrid>
                            <InfoItem>
                                <InfoLabel>Marka / Model</InfoLabel>
                                <InfoValue>{formData.vehicleData.brand} {formData.vehicleData.model}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>{t.checkin.verification.licensePlate}</InfoLabel>
                                <InfoValue>{formData.vehicleData.licensePlate}</InfoValue>
                            </InfoItem>
                        </InfoGrid>
                    </SummarySection>
                )}

                <Divider />

                <SummarySection>
                    <SectionTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        {t.checkin.summary.technicalInfo}
                    </SectionTitle>
                    <InfoGrid>
                        <InfoItem>
                            <InfoLabel>{t.checkin.summary.mileageLabel}</InfoLabel>
                            <InfoValue>{formData.technicalState.mileage.toLocaleString('pl-PL')} km</InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>{t.checkin.summary.depositInfo}</InfoLabel>
                            <InfoValue>{depositItems.join(', ') || '—'}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>{t.checkin.summary.photosInfo}</InfoLabel>
                            <InfoValue>{formData.photos.length} zdjęć</InfoValue>
                        </InfoItem>
                    </InfoGrid>

                    {formData.technicalState.inspectionNotes && (
                        <InfoItem>
                            <InfoLabel>{t.checkin.summary.inspectionNotesLabel}</InfoLabel>
                            <InfoValue>{formData.technicalState.inspectionNotes}</InfoValue>
                        </InfoItem>
                    )}
                </SummarySection>
            </Card>
        </StepContainer>
    );
};