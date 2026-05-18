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
`;

const StyledInput = styled(Input)`
    width: 100%;
`;

const DropdownContainer = styled.div`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 4px rgba(15, 23, 42, 0.06);
    max-height: 240px;
    overflow-y: auto;
    z-index: 1000;
`;

const SuggestionItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};
    border-bottom: 1px solid #f1f5f9;

    &:hover {
        background-color: #f8fafc;
    }

    &:last-child {
        border-bottom: none;
    }
`;

const ServiceName = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PriceInfo = styled.div`
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: #64748b;
    font-feature-settings: 'tnum';
    flex-shrink: 0;
`;

const PriceLabel = styled.span`
    color: #94a3b8;
`;

const EmptyState = styled.div`
    padding: 12px 14px;
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: 13px;
`;

const AddNewButton = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};
    border-top: 1px solid #f1f5f9;
    background-color: #f8faff;
    color: #2563eb;
    font-size: 13px;
    font-weight: 500;

    &:hover {
        background-color: #eff6ff;
    }

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
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
                                        {service.requireManualPrice ? (
                                            <PriceInfo>
                                                <div style={{ fontWeight: 600, color: '#f59e0b' }}>NIESTANDARDOWA</div>
                                            </PriceInfo>
                                        ) : (
                                            <PriceInfo>
                                                <div>
                                                    <PriceLabel>Netto:</PriceLabel> {formatCurrency(priceNet)}
                                                </div>
                                                <div>
                                                    <PriceLabel>Brutto:</PriceLabel> {formatCurrency(priceGross)}
                                                </div>
                                            </PriceInfo>
                                        )}
                                    </SuggestionItem>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            <EmptyState>Nie znaleziono usług</EmptyState>
                            {onAddNew && searchQuery.trim().length > 0 && (
                                <AddNewButton onClick={() => {
                                    onAddNew(searchQuery);
                                    setSearchQuery('');
                                    setIsOpen(false);
                                    inputRef.current?.blur();
                                }}>
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
