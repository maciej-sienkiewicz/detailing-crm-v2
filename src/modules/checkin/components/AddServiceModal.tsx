// src/modules/checkin/components/AddServiceModal.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/common/hooks';
import { Modal } from '@/common/components/Modal';
import { Input } from '@/common/components/Form';
import { Button } from '@/common/components/Button';
import { EmptyState } from '@/common/components/EmptyState';
import { formatCurrency } from '@/common/utils';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { Service } from '@/modules/services/types';

const SearchInput = styled(Input)`
    margin-bottom: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
`;

const ServiceList = styled.div`
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const ServiceItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        transform: translateX(4px);
        border-left: 3px solid ${props => props.theme.colors.primary};
        padding-left: calc(${props => props.theme.spacing.lg} - 3px);
    }

    &:last-child {
        border-bottom: none;
    }
`;

const ServiceInfo = styled.div`
    flex: 1;
`;

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const ServicePrice = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    font-feature-settings: 'tnum';
`;

interface AddServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (service: Service) => void;
}

export const AddServiceModal = ({ isOpen, onClose, onSelect }: AddServiceModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);

    const { data: servicesResponse, isLoading } = useQuery({
        queryKey: ['services', debouncedQuery],
        queryFn: () => servicesApi.getServices({
            search: debouncedQuery,
            page: 1,
            limit: 50,
            showInactive: false,
        }),
        enabled: isOpen,
    });

    const handleServiceSelect = (service: Service) => {
        onSelect(service);
        setSearchQuery('');
        onClose();
    };

    const services = servicesResponse?.services || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Dodaj usługę">
            <SearchInput
                type="text"
                placeholder="Wyszukaj usługę..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            {isLoading ? (
                <EmptyState title="Wyszukiwanie..." />
            ) : services.length > 0 ? (
                <ServiceList>
                    {services.map((service) => (
                        <ServiceItem
                            key={service.id}
                            onClick={() => handleServiceSelect(service)}
                        >
                            <ServiceInfo>
                                <ServiceName>{service.name}</ServiceName>
                                <ServicePrice>
                                    Netto: {formatCurrency(service.basePriceNet / 100)} |
                                    Brutto: {formatCurrency((service.basePriceNet * (100 + service.vatRate)) / 10000)}
                                </ServicePrice>
                            </ServiceInfo>
                        </ServiceItem>
                    ))}
                </ServiceList>
            ) : (
                <EmptyState
                    title={searchQuery
                        ? 'Nie znaleziono usług'
                        : 'Wprowadź nazwę usługi'}
                />
            )}
        </Modal>
    );
};
