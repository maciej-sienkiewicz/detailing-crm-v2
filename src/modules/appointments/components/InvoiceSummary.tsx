// src/modules/appointments/components/InvoiceSummary.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useDebounce } from '@/common/hooks';
import { formatMoneyAmount } from '../hooks/usePriceCalculator';
import { useServicePricing } from '../hooks/useServicePricing';
import { useInvoiceManagement } from '../hooks/useInvoiceManagement';
import { EmptyState } from '@/common/components/EmptyState';
import { Input } from '@/common/components/Form';
import { t } from '@/common/i18n';
import { ServiceItem } from './ServiceItem';
import type { ServiceLineItem, Service } from '../types';

const Container = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.lg};
    overflow: hidden;
`;

const Header = styled.div`
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    padding: ${props => props.theme.spacing.lg};
    color: white;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const Title = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const Body = styled.div`
    padding: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding-left: ${props => props.theme.spacing.xl};
        padding-right: ${props => props.theme.spacing.xl};
        padding-top: ${props => props.theme.spacing.xl};
    }
`;

const SearchSection = styled.div`
    margin-bottom: ${props => props.theme.spacing.lg};
    padding-bottom: ${props => props.theme.spacing.lg};
    border-bottom: 2px solid ${props => props.theme.colors.border};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-bottom: ${props => props.theme.spacing.xl};
        padding-bottom: ${props => props.theme.spacing.xl};
    }
`;

const SearchLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const SearchInput = styled(Input)`
    width: 100%;
    border-width: 2px;

    &:focus {
        box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
    }
`;

const SearchResults = styled.div`
    margin-top: ${props => props.theme.spacing.md};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background-color: ${props => props.theme.colors.surface};
`;

const SearchResultItem = styled.div`
    padding: ${props => props.theme.spacing.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
        color: white;
        transform: translateX(4px);
    }
`;

const ServiceName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const ServicePrice = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.bold};
    font-feature-settings: 'tnum';

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const ItemsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-bottom: ${props => props.theme.spacing.xl};
    }
`;

const Totals = styled.div`
    border-top: 3px solid ${props => props.theme.colors.border};
    padding-top: ${props => props.theme.spacing.lg};
    background: linear-gradient(to bottom, transparent 0%, ${props => props.theme.colors.surfaceAlt} 100%);
    margin: 0 -${props => props.theme.spacing.lg};
    padding-left: ${props => props.theme.spacing.lg};
    padding-right: ${props => props.theme.spacing.lg};
    padding-bottom: ${props => props.theme.spacing.lg};
    border-radius: 0 0 ${props => props.theme.radii.lg} ${props => props.theme.radii.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin: 0 -${props => props.theme.spacing.xl};
        padding-left: ${props => props.theme.spacing.xl};
        padding-right: ${props => props.theme.spacing.xl};
        padding-bottom: ${props => props.theme.spacing.xl};
    }
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.sm} 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const TotalLabel = styled.span`
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const TotalValue = styled.span<{ $strikethrough?: boolean }>`
    font-weight: ${props => props.theme.fontWeights.semibold};
    font-feature-settings: 'tnum';
    text-decoration: ${props => props.$strikethrough ? 'line-through' : 'none'};
    color: ${props => props.$strikethrough ? props.theme.colors.textMuted : 'inherit'};
`;

const FinalTotal = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.lg};
    border-top: 3px solid ${props => props.theme.colors.primary};
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.primary};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

interface InvoiceSummaryProps {
    services: ServiceLineItem[];
    availableServices: Service[];
    onChange: (services: ServiceLineItem[]) => void;
}

export const InvoiceSummary = ({ services, availableServices, onChange }: InvoiceSummaryProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const { calculateTotal } = useServicePricing();
    const {
        addService,
        removeService,
        updateService,
        toggleDiscount,
        toggleNote,
        expandedItem,
        noteExpandedItem,
    } = useInvoiceManagement(services, onChange);

    const debouncedQuery = useDebounce(searchQuery, 200);

    const filteredServices = debouncedQuery
        ? availableServices.filter(s =>
            s.name.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
        : [];

    const handleAddService = (service: Service) => {
        addService(service);
        setSearchQuery('');
        setShowResults(false);
    };

    const totals = calculateTotal(services);

    return (
        <Container>
            <Header>
                <Title>{t.appointments.invoiceSummary.title}</Title>
            </Header>

            <Body>
                <SearchSection>
                    <SearchLabel>{t.appointments.invoiceSummary.addService}</SearchLabel>
                    <SearchInput
                        type="text"
                        placeholder={t.appointments.invoiceSummary.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                    />
                    {showResults && filteredServices.length > 0 && (
                        <SearchResults>
                            {filteredServices.map((service) => (
                                <SearchResultItem
                                    key={service.id}
                                    onClick={() => handleAddService(service)}
                                >
                                    <ServiceName>{service.name}</ServiceName>
                                    <ServicePrice>{formatMoneyAmount(service.basePriceNet)} PLN</ServicePrice>
                                </SearchResultItem>
                            ))}
                        </SearchResults>
                    )}
                </SearchSection>

                {services.length === 0 ? (
                    <EmptyState
                        icon="📝"
                        title={t.appointments.invoiceSummary.emptyState}
                    />
                ) : (
                    <>
                        <ItemsList>
                            {services.map((item) => (
                                <ServiceItem
                                    key={item.id}
                                    item={item}
                                    isDiscountExpanded={expandedItem === item.id}
                                    isNoteExpanded={noteExpandedItem === item.id}
                                    onToggleDiscount={() => toggleDiscount(item.id)}
                                    onToggleNote={() => toggleNote(item.id)}
                                    onRemove={() => removeService(item.id)}
                                    onUpdate={(updates) => updateService(item.id, updates)}
                                />
                            ))}
                        </ItemsList>

                        <Totals>
                            {totals.hasTotalDiscount && (
                                <TotalRow>
                                    <TotalLabel>{t.appointments.invoiceSummary.totalBeforeDiscount}:</TotalLabel>
                                    <TotalValue $strikethrough>{formatMoneyAmount(totals.totalOriginalNet)} PLN</TotalValue>
                                </TotalRow>
                            )}
                            <TotalRow>
                                <TotalLabel>{t.appointments.invoiceSummary.totalNet}:</TotalLabel>
                                <TotalValue>{formatMoneyAmount(totals.totalFinalNet)} PLN</TotalValue>
                            </TotalRow>
                            <TotalRow>
                                <TotalLabel>{t.appointments.invoiceSummary.totalVat}:</TotalLabel>
                                <TotalValue>{formatMoneyAmount(totals.totalVat)} PLN</TotalValue>
                            </TotalRow>
                            <FinalTotal>
                                <span>{t.appointments.invoiceSummary.totalToPay}:</span>
                                <span>{formatMoneyAmount(totals.totalFinalGross)} PLN</span>
                            </FinalTotal>
                        </Totals>
                    </>
                )}
            </Body>
        </Container>
    );
};