// src/modules/checkin/components/ServiceAutocomplete.tsx
import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/common/hooks';
import { Input } from '@/common/components/Form';
import { formatCurrency } from '@/common/utils';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { Service } from '@/modules/services/types';

const AutocompleteContainer = styled.div`
    position: relative;
    width: 100%;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const StyledInput = styled(Input)`
    width: 100%;
    font-size: ${props => props.theme.fontSizes.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
`;

const DropdownContainer = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-top: none;
    border-radius: 0 0 ${props => props.theme.radii.md} ${props => props.theme.radii.md};
    box-shadow: ${props => props.theme.shadows.lg};
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
`;

const SuggestionItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        border-left: 3px solid ${props => props.theme.colors.primary};
        padding-left: calc(${props => props.theme.spacing.lg} - 3px);
    }

    &:last-child {
        border-bottom: none;
    }
`;

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    flex: 1;
`;

const PriceInfo = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    font-feature-settings: 'tnum';
`;

const PriceLabel = styled.span`
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const EmptyState = styled.div`
    padding: ${props => props.theme.spacing.lg};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const AddNewButton = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    border-top: 1px solid ${props => props.theme.colors.border};
    background-color: rgba(59, 130, 246, 0.05);
    color: ${props => props.theme.colors.primary};
    font-weight: ${props => props.theme.fontWeights.medium};

    &:hover {
        background-color: rgba(59, 130, 246, 0.1);
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

interface ServiceAutocompleteProps {
    onSelect: (service: Service) => void;
    onAddNew?: (searchQuery: string) => void;
}

export const ServiceAutocomplete = ({ onSelect, onAddNew }: ServiceAutocompleteProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debouncedQuery = useDebounce(searchQuery, 300);

    const { data: servicesResponse, isLoading } = useQuery({
        queryKey: ['services', debouncedQuery],
        queryFn: () => servicesApi.getServices({
            search: debouncedQuery,
            page: 1,
            limit: 50,
            showInactive: false,
        }),
    });

    const services = servicesResponse?.services || [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (value: string) => {
        setSearchQuery(value);
        setIsOpen(true);
    };

    const handleServiceSelect = (service: Service) => {
        onSelect(service);
        setSearchQuery('');
        setIsOpen(false);
        // Blur input to ensure dropdown closes
        inputRef.current?.blur();
    };

    const showDropdown = isOpen;

    return (
        <AutocompleteContainer ref={containerRef}>
            <StyledInput
                ref={inputRef}
                type="text"
                placeholder="Wpisz nazwę usługi, aby dodać..."
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
            />

            {showDropdown && (
                <DropdownContainer>
                    {isLoading ? (
                        <EmptyState>Wyszukiwanie...</EmptyState>
                    ) : services.length > 0 ? (
                        <>
                            {services.map((service) => {
                                const priceNet = service.basePriceNet / 100;
                                const priceGross = (service.basePriceNet * (100 + service.vatRate)) / 10000;

                                return (
                                    <SuggestionItem
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service)}
                                    >
                                        <ServiceName>{service.name}</ServiceName>
                                        <PriceInfo>
                                            <div>
                                                <PriceLabel>Netto:</PriceLabel> {formatCurrency(priceNet)}
                                            </div>
                                            <div>
                                                <PriceLabel>Brutto:</PriceLabel> {formatCurrency(priceGross)}
                                            </div>
                                        </PriceInfo>
                                    </SuggestionItem>
                                );
                            })}
                            {onAddNew && searchQuery.trim().length > 0 && (
                                <AddNewButton onClick={() => onAddNew(searchQuery)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="8" x2="12" y2="16"/>
                                        <line x1="8" y1="12" x2="16" y2="12"/>
                                    </svg>
                                    <span>Wprowadź nową usługę</span>
                                </AddNewButton>
                            )}
                        </>
                    ) : (
                        <>
                            <EmptyState>Nie znaleziono usług</EmptyState>
                            {onAddNew && searchQuery.trim().length > 0 && (
                                <AddNewButton onClick={() => onAddNew(searchQuery)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="8" x2="12" y2="16"/>
                                        <line x1="8" y1="12" x2="16" y2="12"/>
                                    </svg>
                                    <span>Wprowadź nową usługę</span>
                                </AddNewButton>
                            )}
                        </>
                    )}
                </DropdownContainer>
            )}
        </AutocompleteContainer>
    );
};
