// src/modules/customers/views/CustomerDetailView.tsx

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { useCustomerVehicles } from '../hooks/useCustomerVehicles';
import { useCustomerVisits } from '../hooks/useCustomerVisits';
import { useUpdateConsent } from '../hooks/useUpdateConsent';
import { CustomerHeader } from '../components/CustomerHeader';
import { VehicleCard } from '../components/VehicleCard';
import { ConsentManager } from '../components/ConsentManager';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { DocumentsManager } from '../components/DocumentsManager';
import { CustomerPagination } from '../components/CustomerPagination';
import { t } from '@/common/i18n';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;


const TabsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const TabsList = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
        height: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${props => props.theme.colors.border};
        border-radius: 2px;
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.sm};
    }
`;

const TabButton = styled.button<{ $isActive: boolean }>`
    flex: 1;
    min-width: fit-content;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive
    ? 'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%)'
    : 'transparent'
};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.$isActive ? 'white' : props.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    box-shadow: ${props => props.$isActive ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none'};

    &:hover {
        background: ${props => props.$isActive
    ? 'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%)'
    : props.theme.colors.surfaceHover
};
        color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const TabContent = styled.div`
    animation: fadeIn 0.3s ease;

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const ContentGrid = styled.div<{ $columns?: number }>`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: ${props => props.$columns === 2 ? 'repeat(2, 1fr)' : '2fr 1fr'};
    }
`;

const VehiclesGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const InfoSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    position: relative;
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;
`;

const SectionEditButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    background: white;
    color: ${props => props.theme.colors.textSecondary};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: #f0f9ff;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const InfoItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const InfoLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const InfoValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    font-weight: 500;
`;

const NotesSection = styled.div`
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const NotesText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #78350f;
    line-height: 1.6;
    white-space: pre-wrap;
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
`;

const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid ${props => props.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const ErrorContainer = styled.div`
    padding: ${props => props.theme.spacing.xxl};
    text-align: center;
`;

const ErrorTitle = styled.h2`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.xl};
    color: ${props => props.theme.colors.error};
`;

const ErrorMessage = styled.p`
    margin: 0 0 ${props => props.theme.spacing.lg};
    color: ${props => props.theme.colors.textSecondary};
`;

const RetryButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }
`;

type TabValue = 'overview' | 'vehicles' | 'activity' | 'documents' | 'settings';

export const CustomerDetailView = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const [activeTab, setActiveTab] = useState<TabValue>('overview');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
    const [visitsPage, setVisitsPage] = useState(1);
    const visitsLimit = 10;

    const {
        customerDetail,
        isLoading: isDetailLoading,
        isError: isDetailError,
        refetch: refetchDetail
    } = useCustomerDetail(customerId!);

    const {
        vehicles,
        isLoading: isVehiclesLoading
    } = useCustomerVehicles(customerId!);

    const {
        visits,
        communications,
        pagination: visitsPagination,
        isLoading: isVisitsLoading
    } = useCustomerVisits(customerId!, visitsPage, visitsLimit);

    const { updateConsent, isUpdating } = useUpdateConsent({
        customerId: customerId!,
    });

    // Reset visits page when customer changes
    useEffect(() => {
        setVisitsPage(1);
    }, [customerId]);

    if (isDetailLoading) {
        return (
            <ViewContainer>
                <LoadingContainer>
                    <Spinner />
                </LoadingContainer>
            </ViewContainer>
        );
    }

    if (isDetailError || !customerDetail) {
        return (
            <ViewContainer>
                <ErrorContainer>
                    <ErrorTitle>{t.common.error}</ErrorTitle>
                    <ErrorMessage>{t.customers.error.detailLoadFailed}</ErrorMessage>
                    <RetryButton onClick={() => refetchDetail()}>
                        {t.common.retry}
                    </RetryButton>
                </ErrorContainer>
            </ViewContainer>
        );
    }

    const { customer, marketingConsents } = customerDetail;

    return (
        <ViewContainer>
            <CustomerHeader data={customerDetail} />

            <TabsContainer>
                <TabsList>
                    <TabButton
                        $isActive={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    >
                        {t.customers.detail.overview}
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'vehicles'}
                        onClick={() => setActiveTab('vehicles')}
                    >
                        {t.customers.detail.vehicles} ({vehicles.length})
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'activity'}
                        onClick={() => setActiveTab('activity')}
                    >
                        {t.customers.detail.activity} ({visits.length + communications.length})
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'documents'}
                        onClick={() => setActiveTab('documents')}
                    >
                        Dokumenty
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                    >
                        {t.customers.detail.settings}
                    </TabButton>
                </TabsList>

                {activeTab === 'overview' && (
                    <TabContent>
                        <ContentGrid>
                            <div>
                                <InfoSection>
                                    <SectionHeader>
                                        <SectionTitle>{t.customers.detail.personalInfo.title}</SectionTitle>
                                        <SectionEditButton onClick={() => setIsEditModalOpen(true)}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                            {t.common.edit}
                                        </SectionEditButton>
                                    </SectionHeader>
                                    <InfoGrid>
                                        <InfoItem>
                                            <InfoLabel>{t.customers.detail.personalInfo.fullName}</InfoLabel>
                                            <InfoValue>
                                                {customer.firstName} {customer.lastName}
                                            </InfoValue>
                                        </InfoItem>
                                        <InfoItem>
                                            <InfoLabel>{t.customers.detail.personalInfo.email}</InfoLabel>
                                            <InfoValue>{customer.contact.email}</InfoValue>
                                        </InfoItem>
                                        <InfoItem>
                                            <InfoLabel>{t.customers.detail.personalInfo.phone}</InfoLabel>
                                            <InfoValue>{customer.contact.phone}</InfoValue>
                                        </InfoItem>
                                        {customer.homeAddress && (
                                            <InfoItem>
                                                <InfoLabel>{t.customers.detail.personalInfo.homeAddress}</InfoLabel>
                                                <InfoValue>
                                                    {customer.homeAddress.street}, {customer.homeAddress.postalCode} {customer.homeAddress.city}
                                                </InfoValue>
                                            </InfoItem>
                                        )}
                                    </InfoGrid>
                                </InfoSection>

                                {customer.company && (
                                    <InfoSection style={{ marginTop: '24px' }}>
                                        <SectionHeader>
                                            <SectionTitle>{t.customers.detail.companyInfo.title}</SectionTitle>
                                            <SectionEditButton onClick={() => setIsEditCompanyModalOpen(true)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                                {t.common.edit}
                                            </SectionEditButton>
                                        </SectionHeader>
                                        <InfoGrid>
                                            <InfoItem>
                                                <InfoLabel>{t.customers.detail.companyInfo.companyName}</InfoLabel>
                                                <InfoValue>{customer.company.name}</InfoValue>
                                            </InfoItem>
                                            <InfoItem>
                                                <InfoLabel>{t.customers.detail.companyInfo.nip}</InfoLabel>
                                                <InfoValue>{customer.company.nip}</InfoValue>
                                            </InfoItem>
                                            <InfoItem>
                                                <InfoLabel>{t.customers.detail.companyInfo.regon}</InfoLabel>
                                                <InfoValue>{customer.company.regon}</InfoValue>
                                            </InfoItem>
                                            <InfoItem>
                                                <InfoLabel>{t.customers.detail.companyInfo.companyAddress}</InfoLabel>
                                                <InfoValue>
                                                    {customer.company.address.street}, {customer.company.address.postalCode} {customer.company.address.city}
                                                </InfoValue>
                                            </InfoItem>
                                        </InfoGrid>
                                    </InfoSection>
                                )}

                                {!customer.company && (
                                    <InfoSection style={{ marginTop: '24px' }}>
                                        <SectionHeader>
                                            <SectionTitle>{t.customers.detail.companyInfo.title}</SectionTitle>
                                            <SectionEditButton onClick={() => setIsEditCompanyModalOpen(true)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                                </svg>
                                                Dodaj
                                            </SectionEditButton>
                                        </SectionHeader>
                                        <InfoValue>
                                            Ten klient nie ma przypisanych danych firmowych.
                                        </InfoValue>
                                    </InfoSection>
                                )}

                                {customer.notes && (
                                    <NotesSection style={{ marginTop: '24px' }}>
                                        <SectionTitle>{t.customers.detail.notes.title}</SectionTitle>
                                        <NotesText>{customer.notes}</NotesText>
                                    </NotesSection>
                                )}
                            </div>

                            <ConsentManager
                                consents={marketingConsents}
                                onConsentToggle={(consentId, granted) => updateConsent({ consentId, granted })}
                                isUpdating={isUpdating}
                            />
                        </ContentGrid>
                    </TabContent>
                )}

                {activeTab === 'vehicles' && (
                    <TabContent>
                        {isVehiclesLoading ? (
                            <LoadingContainer>
                                <Spinner />
                            </LoadingContainer>
                        ) : vehicles.length === 0 ? (
                            <InfoSection>
                                <SectionTitle>{t.customers.detail.vehicleCard.noVehicles}</SectionTitle>
                            </InfoSection>
                        ) : (
                            <VehiclesGrid>
                                {vehicles.map(vehicle => (
                                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                                ))}
                            </VehiclesGrid>
                        )}
                    </TabContent>
                )}

                {activeTab === 'activity' && (
                    <TabContent>
                        {isVisitsLoading ? (
                            <LoadingContainer>
                                <Spinner />
                            </LoadingContainer>
                        ) : (
                            <>
                                <ActivityTimeline visits={visits} communications={communications} />
                                {visitsPagination && visitsPagination.totalPages > 1 && (
                                    <CustomerPagination
                                        pagination={visitsPagination}
                                        onPageChange={setVisitsPage}
                                    />
                                )}
                            </>
                        )}
                    </TabContent>
                )}

                {activeTab === 'documents' && (
                    <TabContent>
                        <DocumentsManager customerId={customerId!} />
                    </TabContent>
                )}

                {activeTab === 'settings' && (
                    <TabContent>
                        <InfoSection>
                            <SectionTitle>{t.customers.detail.settings}</SectionTitle>
                            <InfoValue>
                                {t.customers.detail.settingsPlaceholder}
                            </InfoValue>
                        </InfoSection>
                    </TabContent>
                )}
            </TabsContainer>

            {customerDetail && (
                <>
                    <EditCustomerModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        customer={customerDetail.customer}
                    />
                    <EditCompanyModal
                        isOpen={isEditCompanyModalOpen}
                        onClose={() => setIsEditCompanyModalOpen(false)}
                        customerId={customerId!}
                        company={customerDetail.customer.company}
                    />
                </>
            )}
        </ViewContainer>
    );
};
