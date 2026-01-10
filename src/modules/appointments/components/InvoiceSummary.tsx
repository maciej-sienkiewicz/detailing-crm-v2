import styled from 'styled-components';
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/common/hooks';
import { formatMoneyAmount } from '../hooks/usePriceCalculator';
import { useServicePricing } from '../hooks/useServicePricing';
import type { ServiceLineItem, Service, AdjustmentType } from '../types';

const Container = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.lg};
    overflow: hidden;
`;

const Header = styled.div`
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    padding: ${props => props.theme.spacing.xl};
    color: white;
`;

const Title = styled.h2`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    margin: 0;
`;

const Body = styled.div`
    padding-left: ${props => props.theme.spacing.xl};
    padding-right: ${props => props.theme.spacing.xl};
    padding-top: ${props => props.theme.spacing.xl};
`;

const SearchSection = styled.div`
    margin-bottom: ${props => props.theme.spacing.xl};
    padding-bottom: ${props => props.theme.spacing.xl};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const SearchLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const SearchInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
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
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const ServicePrice = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.bold};
    font-feature-settings: 'tnum';
`;

const ItemsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    margin-bottom: ${props => props.theme.spacing.xl};
`;

const ItemRow = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(to right, ${props => props.theme.colors.surfaceAlt} 0%, ${props => props.theme.colors.surface} 100%);
    border-radius: ${props => props.theme.radii.lg};
    border-left: 4px solid ${props => props.theme.colors.primary};
    box-shadow: ${props => props.theme.shadows.sm};
    transition: all ${props => props.theme.transitions.normal};

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
        transform: translateY(-2px);
    }
`;

const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const ItemNameSection = styled.div`
    flex: 1;
`;

const ItemName = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const ItemNote = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
    margin-top: ${props => props.theme.spacing.xs};
    line-height: 1.4;
`;

const MenuSection = styled.div`
    position: relative;
`;

const MenuButton = styled.button`
    padding: ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    box-shadow: ${props => props.theme.shadows.sm};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        border-color: ${props => props.theme.colors.primary};
        transform: translateY(-1px);
        box-shadow: ${props => props.theme.shadows.md};
    }

    &:active {
        transform: translateY(0);
    }
`;

const MenuIcon = styled.span`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    line-height: 1;
`;

const ContextMenu = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: ${props => props.theme.spacing.xs};
    background-color: ${props => props.theme.colors.surface};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    box-shadow: ${props => props.theme.shadows.lg};
    overflow: hidden;
    z-index: 100;
    min-width: 180px;
    animation: slideDown 0.15s ease-out;

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const MenuItem = styled.button<{ $variant?: 'danger' }>`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    background-color: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.$variant === 'danger' ? props.theme.colors.error : props.theme.colors.text};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: ${props =>
                props.$variant === 'danger'
                        ? props.theme.colors.errorLight
                        : props.theme.colors.surfaceHover};
    }

    &:active {
        background-color: ${props =>
                props.$variant === 'danger'
                        ? props.theme.colors.error
                        : props.theme.colors.primary};
        color: white;
    }
`;

const DiscountBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    color: white;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    margin-top: ${props => props.theme.spacing.xs};
`;

const PriceBreakdown = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.md};
    flex-wrap: wrap;
    line-height: 1.6;
`;

const BreakdownItem = styled.span`
    font-feature-settings: 'tnum';
`;

const BreakdownLabel = styled.span`
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const BreakdownValue = styled.span<{ $strikethrough?: boolean; $highlight?: boolean }>`
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-decoration: ${props => props.$strikethrough ? 'line-through' : 'none'};
    color: ${props =>
            props.$strikethrough
                    ? props.theme.colors.textMuted
                    : props.$highlight
                            ? props.theme.colors.primary
                            : 'inherit'};
`;

const ActionButtons = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
    margin-top: ${props => props.theme.spacing.md};
`;

const ActionButton = styled.button<{ $variant?: 'default' | 'danger'; $active?: boolean }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background-color: ${props =>
            props.$active
                    ? props.theme.colors.primary
                    : props.$variant === 'danger'
                            ? props.theme.colors.error
                            : props.theme.colors.surface};
    color: ${props =>
            props.$active || props.$variant === 'danger'
                    ? 'white'
                    : props.theme.colors.text};
    border: 1px solid ${props =>
            props.$active
                    ? props.theme.colors.primary
                    : props.$variant === 'danger'
                            ? props.theme.colors.error
                            : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    box-shadow: ${props => props.theme.shadows.sm};

    &:hover {
        transform: translateY(-1px);
        box-shadow: ${props => props.theme.shadows.md};
        ${props => props.$variant === 'danger'
                ? `background-color: #b91c1c;`
                : props.$active
                        ? `background-color: #0284c7;`
                        : `background-color: ${props.theme.colors.surfaceHover};`}
    }

    &:active {
        transform: translateY(0);
    }
`;

const ExpandableSection = styled.div`
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background-color: white;
    border-radius: ${props => props.theme.radii.md};
    border: 2px solid ${props => props.theme.colors.border};
    animation: slideDown 0.2s ease-out;

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const DiscountGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    grid-template-columns: 1fr 1fr;
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const FieldLabel = styled.label`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const Select = styled.select`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background-color: white;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const TextArea = styled.textarea`
    padding: ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const Totals = styled.div`
    border-top: 3px solid ${props => props.theme.colors.border};
    padding-top: ${props => props.theme.spacing.lg};
    background: linear-gradient(to bottom, transparent 0%, ${props => props.theme.colors.surfaceAlt} 100%);
    margin: 0 -${props => props.theme.spacing.xl};
    padding-left: ${props => props.theme.spacing.xl};
    padding-right: ${props => props.theme.spacing.xl};
    padding-bottom: ${props => props.theme.spacing.xl};
    border-radius: 0 0 ${props => props.theme.radii.lg} ${props => props.theme.radii.lg};
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.sm} 0;
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
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
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.primary};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl} ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    border: 2px dashed ${props => props.theme.colors.border};
`;

interface InvoiceSummaryProps {
    services: ServiceLineItem[];
    availableServices: Service[];
    onChange: (services: ServiceLineItem[]) => void;
}

export const InvoiceSummary = ({ services, availableServices, onChange }: InvoiceSummaryProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [noteExpandedItem, setNoteExpandedItem] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);

    const { calculateTotal } = useServicePricing();

    const debouncedQuery = useDebounce(searchQuery, 200);

    const filteredServices = debouncedQuery
        ? availableServices.filter(s =>
            s.name.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
        : [];

    const handleAddService = (service: Service) => {
        const newService: ServiceLineItem = {
            id: `${Date.now()}`,
            serviceId: service.id,
            serviceName: service.name,
            basePriceNet: service.basePriceNet,
            vatRate: service.vatRate,
            adjustment: {
                type: 'FIXED_GROSS',
                value: 0,
            },
            note: '',
        };

        onChange([...services, newService]);
        setSearchQuery('');
        setShowResults(false);
    };

    const handleRemoveService = (id: string) => {
        onChange(services.filter(s => s.id !== id));
        if (expandedItem === id) setExpandedItem(null);
        if (noteExpandedItem === id) setNoteExpandedItem(null);
    };

    const handleUpdateService = (id: string, updates: Partial<ServiceLineItem>) => {
        onChange(services.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const toggleDiscount = (id: string) => {
        setExpandedItem(expandedItem === id ? null : id);
        setNoteExpandedItem(null);
    };

    const toggleNote = (id: string) => {
        setNoteExpandedItem(noteExpandedItem === id ? null : id);
        setExpandedItem(null);
    };

    const totals = calculateTotal(services);

    return (
        <Container>
            <Header>
                <Title>Podsumowanie</Title>
            </Header>

            <Body>
                <SearchSection>
                    <SearchLabel>Dodaj usługę</SearchLabel>
                    <SearchInput
                        type="text"
                        placeholder="Wyszukaj usługę..."
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
                    <EmptyState>Dodaj usługi aby utworzyć rachunek</EmptyState>
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
                                    onRemove={() => handleRemoveService(item.id)}
                                    onUpdate={(updates) => handleUpdateService(item.id, updates)}
                                />
                            ))}
                        </ItemsList>

                        <Totals>
                            {totals.hasTotalDiscount && (
                                <TotalRow>
                                    <TotalLabel>Razem netto (przed rabatem):</TotalLabel>
                                    <TotalValue $strikethrough>{formatMoneyAmount(totals.totalOriginalNet)} PLN</TotalValue>
                                </TotalRow>
                            )}
                            <TotalRow>
                                <TotalLabel>Razem netto:</TotalLabel>
                                <TotalValue>{formatMoneyAmount(totals.totalFinalNet)} PLN</TotalValue>
                            </TotalRow>
                            <TotalRow>
                                <TotalLabel>VAT:</TotalLabel>
                                <TotalValue>{formatMoneyAmount(totals.totalVat)} PLN</TotalValue>
                            </TotalRow>
                            <FinalTotal>
                                <span>Do zapłaty:</span>
                                <span>{formatMoneyAmount(totals.totalFinalGross)} PLN</span>
                            </FinalTotal>
                        </Totals>
                    </>
                )}
            </Body>
        </Container>
    );
};

interface ServiceItemProps {
    item: ServiceLineItem;
    isDiscountExpanded: boolean;
    isNoteExpanded: boolean;
    onToggleDiscount: () => void;
    onToggleNote: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<ServiceLineItem>) => void;
}

const ServiceItem = ({
                         item,
                         isDiscountExpanded,
                         isNoteExpanded,
                         onToggleDiscount,
                         onToggleNote,
                         onRemove,
                         onUpdate,
                     }: ServiceItemProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { calculateServicePrice } = useServicePricing();
    const pricing = calculateServicePrice(item);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuItemClick = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    return (
        <ItemRow>
            <ItemHeader>
                <ItemNameSection>
                    <ItemName>{item.serviceName}</ItemName>
                    {item.note && (
                        <ItemNote>{item.note}</ItemNote>
                    )}
                    {pricing.hasDiscount && (
                        <DiscountBadge>
                            {pricing.discountLabel}
                        </DiscountBadge>
                    )}
                </ItemNameSection>
                <MenuSection ref={menuRef}>
                    <MenuButton onClick={handleMenuToggle}>
                        <MenuIcon>⋮</MenuIcon>
                    </MenuButton>
                    {isMenuOpen && (
                        <ContextMenu>
                            <MenuItem onClick={() => handleMenuItemClick(onToggleDiscount)}>
                                {isDiscountExpanded ? 'Ukryj rabat' : 'Rabatuj'}
                            </MenuItem>
                            <MenuItem onClick={() => handleMenuItemClick(onToggleNote)}>
                                {isNoteExpanded ? 'Ukryj notatkę' : 'Dodaj notatkę'}
                            </MenuItem>
                            <MenuItem $variant="danger" onClick={() => handleMenuItemClick(onRemove)}>
                                Usuń
                            </MenuItem>
                        </ContextMenu>
                    )}
                </MenuSection>
            </ItemHeader>

            <PriceBreakdown>
                {pricing.hasDiscount && (
                    <>
                        <BreakdownItem>
                            <BreakdownLabel>Netto przed: </BreakdownLabel>
                            <BreakdownValue $strikethrough>
                                {formatMoneyAmount(pricing.originalPriceNet)} PLN
                            </BreakdownValue>
                        </BreakdownItem>
                        <BreakdownItem>•</BreakdownItem>
                    </>
                )}
                <BreakdownItem>
                    <BreakdownLabel>Netto: </BreakdownLabel>
                    <BreakdownValue>
                        {formatMoneyAmount(pricing.finalPriceNet)} PLN
                    </BreakdownValue>
                </BreakdownItem>
                <BreakdownItem>•</BreakdownItem>
                <BreakdownItem>
                    <BreakdownLabel>VAT ({item.vatRate}%): </BreakdownLabel>
                    <BreakdownValue>
                        {formatMoneyAmount(pricing.vatAmount)} PLN
                    </BreakdownValue>
                </BreakdownItem>
                <br />
                {pricing.hasDiscount && (
                    <>
                        <BreakdownItem>
                            <BreakdownLabel>Brutto przed: </BreakdownLabel>
                            <BreakdownValue $strikethrough>
                                {formatMoneyAmount(pricing.originalPriceGross)} PLN
                            </BreakdownValue>
                        </BreakdownItem>
                        <BreakdownItem>•</BreakdownItem>
                    </>
                )}
                <BreakdownItem>
                    <BreakdownLabel>Brutto: </BreakdownLabel>
                    <BreakdownValue $highlight={pricing.hasDiscount}>
                        {formatMoneyAmount(pricing.finalPriceGross)} PLN
                    </BreakdownValue>
                </BreakdownItem>
            </PriceBreakdown>

            {isDiscountExpanded && (
                <ExpandableSection>
                    <DiscountGrid>
                        <FieldGroup>
                            <FieldLabel>Typ rabatu</FieldLabel>
                            <Select
                                value={item.adjustment.type}
                                onChange={(e) =>
                                    onUpdate({
                                        adjustment: {
                                            ...item.adjustment,
                                            type: e.target.value as AdjustmentType,
                                        },
                                    })
                                }
                            >
                                <option value="PERCENT">Procent (%)</option>
                                <option value="FIXED_NET">Rabat kwotowy netto</option>
                                <option value="FIXED_GROSS">Rabat kwotowy brutto</option>
                                <option value="SET_NET">Ustaw cenę netto</option>
                                <option value="SET_GROSS">Ustaw cenę brutto</option>
                            </Select>
                        </FieldGroup>

                        <FieldGroup>
                            <FieldLabel>Wartość</FieldLabel>
                            <Input
                                type="number"
                                step="0.01"
                                value={
                                    item.adjustment.type === 'PERCENT'
                                        ? item.adjustment.value
                                        : formatMoneyAmount(Math.abs(item.adjustment.value))
                                }
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const isMoneyType = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'].includes(item.adjustment.type);
                                    onUpdate({
                                        adjustment: {
                                            ...item.adjustment,
                                            value: isMoneyType ? Math.round(Math.abs(value) * 100) : value,
                                        },
                                    });
                                }}
                                placeholder="0.00"
                            />
                        </FieldGroup>
                    </DiscountGrid>
                    <ActionButtons>
                        <ActionButton onClick={onToggleDiscount} $active>
                            Zatwierdź
                        </ActionButton>
                    </ActionButtons>
                </ExpandableSection>
            )}

            {isNoteExpanded && (
                <ExpandableSection>
                    <FieldGroup>
                        <FieldLabel>Notatka</FieldLabel>
                        <TextArea
                            value={item.note || ''}
                            onChange={(e) => onUpdate({ note: e.target.value })}
                            placeholder="Dodaj notatkę do usługi..."
                        />
                    </FieldGroup>
                    <ActionButtons>
                        <ActionButton onClick={onToggleNote} $active>
                            Zatwierdź
                        </ActionButton>
                    </ActionButtons>
                </ExpandableSection>
            )}
        </ItemRow>
    );
};