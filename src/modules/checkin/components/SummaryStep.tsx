// src/modules/checkin/components/SummaryStepV2.tsx

import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Divider } from '@/common/components/Divider';
import { formatPhoneNumber, formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';
import type { CheckInFormData, ServiceLineItem } from '../types';

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

const ServicesTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: ${props => props.theme.spacing.md};
`;

const TableHeader = styled.thead`
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
`;

const TableHeaderCell = styled.th`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }
`;

const TableCell = styled.td`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    vertical-align: top;
`;

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const ServiceNote = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
    margin-top: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.sm};
`;

const PriceCell = styled(TableCell)`
    text-align: right;
    font-weight: ${props => props.theme.fontWeights.semibold};
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

const TotalRow = styled.tr`
    background: linear-gradient(to right,
        ${props => props.theme.colors.surfaceAlt} 0%,
        ${props => props.theme.colors.surface} 100%);
    border-top: 3px solid ${props => props.theme.colors.primary};
    font-weight: ${props => props.theme.fontWeights.bold};
`;

const TotalLabel = styled(TableCell)`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const TotalValue = styled(PriceCell)`
    font-size: ${props => props.theme.fontSizes.lg};
    color: ${props => props.theme.colors.primary};
`;

interface SummaryStepProps {
    formData: CheckInFormData;
    readOnly?: boolean;
}

export const SummaryStep = ({ formData }: SummaryStepProps) => {
    const depositItems = [];
    if (formData.technicalState.deposit.keys) depositItems.push(t.checkin.technical.depositItems.keys);
    if (formData.technicalState.deposit.registrationDocument) depositItems.push(t.checkin.technical.depositItems.registrationDocument);

    // Calculate service prices
    const calculateServicePrice = (service: ServiceLineItem) => {
        const { basePriceNet, vatRate, adjustment } = service;
        let finalPriceNet = basePriceNet;

        switch (adjustment.type) {
            case 'PERCENT': {
                const percentageAmount = Math.round((basePriceNet * Math.abs(adjustment.value)) / 100);
                finalPriceNet = adjustment.value > 0
                    ? basePriceNet + percentageAmount
                    : basePriceNet - percentageAmount;
                break;
            }
            case 'FIXED_NET': {
                finalPriceNet = basePriceNet - Math.abs(adjustment.value);
                break;
            }
            case 'FIXED_GROSS': {
                const targetGross = (basePriceNet * (100 + vatRate)) / 100 - Math.abs(adjustment.value);
                finalPriceNet = Math.round((targetGross * 100) / (100 + vatRate));
                break;
            }
            case 'SET_NET': {
                finalPriceNet = adjustment.value;
                break;
            }
            case 'SET_GROSS': {
                finalPriceNet = Math.round((adjustment.value * 100) / (100 + vatRate));
                break;
            }
        }

        if (finalPriceNet < 0) finalPriceNet = 0;

        const vatAmount = Math.round((finalPriceNet * vatRate) / 100);
        const finalPriceGross = finalPriceNet + vatAmount;

        return {
            finalPriceNet,
            finalPriceGross,
            vatAmount,
        };
    };

    // Calculate totals
    const calculateTotals = () => {
        let totalNet = 0;
        let totalVat = 0;
        let totalGross = 0;

        formData.services.forEach((service) => {
            const prices = calculateServicePrice(service);
            totalNet += prices.finalPriceNet;
            totalVat += prices.vatAmount;
            totalGross += prices.finalPriceGross;
        });

        return { totalNet, totalVat, totalGross };
    };

    const totals = calculateTotals();

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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Usługi
                    </SectionTitle>
                    {formData.services.length > 0 ? (
                        <ServicesTable>
                            <TableHeader>
                                <tr>
                                    <TableHeaderCell>Nazwa usługi</TableHeaderCell>
                                    <TableHeaderCell style={{ textAlign: 'right' }}>Cena netto</TableHeaderCell>
                                    <TableHeaderCell style={{ textAlign: 'right' }}>VAT</TableHeaderCell>
                                    <TableHeaderCell style={{ textAlign: 'right' }}>Cena brutto</TableHeaderCell>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {formData.services.map((service) => {
                                    const prices = calculateServicePrice(service);
                                    return (
                                        <TableRow key={service.id}>
                                            <TableCell>
                                                <ServiceName>{service.serviceName}</ServiceName>
                                                {service.note && (
                                                    <ServiceNote>{service.note}</ServiceNote>
                                                )}
                                            </TableCell>
                                            <PriceCell>{formatCurrency(prices.finalPriceNet / 100)}</PriceCell>
                                            <PriceCell>{formatCurrency(prices.vatAmount / 100)}</PriceCell>
                                            <PriceCell>{formatCurrency(prices.finalPriceGross / 100)}</PriceCell>
                                        </TableRow>
                                    );
                                })}
                                <TotalRow>
                                    <TotalLabel>Suma</TotalLabel>
                                    <TotalValue>{formatCurrency(totals.totalNet / 100)}</TotalValue>
                                    <TotalValue>{formatCurrency(totals.totalVat / 100)}</TotalValue>
                                    <TotalValue>{formatCurrency(totals.totalGross / 100)}</TotalValue>
                                </TotalRow>
                            </TableBody>
                        </ServicesTable>
                    ) : (
                        <InfoItem>
                            <InfoValue style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                Brak usług
                            </InfoValue>
                        </InfoItem>
                    )}
                </SummarySection>

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
