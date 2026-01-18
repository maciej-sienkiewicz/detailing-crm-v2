import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useCustomers } from '@/modules/customers/hooks/useCustomers';
import { t } from '@/common/i18n';
import type { Customer } from '@/modules/customers/types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const SearchInput = styled.input`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const CustomerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.sm};
`;

const CustomerItem = styled.div<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    background: ${props => props.$selected ? 'rgba(14, 165, 233, 0.1)' : props.theme.colors.surface};
    border: 1px solid ${props => props.$selected ? props.theme.colors.primary : props.theme.colors.border};

    &:hover {
        background: ${props => props.$selected ? 'rgba(14, 165, 233, 0.15)' : props.theme.colors.surfaceHover};
    }
`;

const Checkbox = styled.input`
    cursor: pointer;
    width: 18px;
    height: 18px;
`;

const CustomerInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const CustomerName = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
`;

const CustomerContact = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const LoadingMessage = styled.div`
    padding: ${props => props.theme.spacing.lg};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyMessage = styled.div`
    padding: ${props => props.theme.spacing.lg};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
`;

const SelectedCount = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    padding: ${props => props.theme.spacing.sm};
`;

interface OwnerSelectProps {
    selectedOwnerIds: string[];
    onChange: (ownerIds: string[]) => void;
}

export const OwnerSelect = ({ selectedOwnerIds, onChange }: OwnerSelectProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filters = useMemo(() => ({
        search: searchTerm,
        page: 1,
        limit: 50,
    }), [searchTerm]);

    const { customers, isLoading } = useCustomers(filters);

    const handleToggleOwner = useCallback((customerId: string) => {
        const isSelected = selectedOwnerIds.includes(customerId);
        if (isSelected) {
            onChange(selectedOwnerIds.filter(id => id !== customerId));
        } else {
            onChange([...selectedOwnerIds, customerId]);
        }
    }, [selectedOwnerIds, onChange]);

    const renderCustomerItem = (customer: Customer) => {
        const isSelected = selectedOwnerIds.includes(customer.id);
        const displayName = `${customer.firstName} ${customer.lastName}`;
        const displayContact = customer.contact.email || customer.contact.phone || '';

        return (
            <CustomerItem
                key={customer.id}
                $selected={isSelected}
                onClick={() => handleToggleOwner(customer.id)}
            >
                <Checkbox
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleOwner(customer.id)}
                    onClick={(e) => e.stopPropagation()}
                />
                <CustomerInfo>
                    <CustomerName>{displayName}</CustomerName>
                    {displayContact && (
                        <CustomerContact>{displayContact}</CustomerContact>
                    )}
                </CustomerInfo>
            </CustomerItem>
        );
    };

    return (
        <Container>
            <SearchInput
                type="text"
                placeholder={t.vehicles.form.owners.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {selectedOwnerIds.length > 0 && (
                <SelectedCount>
                    {selectedOwnerIds.length} {selectedOwnerIds.length === 1 ? 'właściciel' : 'właścicieli'} wybranych
                </SelectedCount>
            )}

            <CustomerList>
                {isLoading ? (
                    <LoadingMessage>{t.common.loading}</LoadingMessage>
                ) : customers.length === 0 ? (
                    <EmptyMessage>{t.common.noResults}</EmptyMessage>
                ) : (
                    customers.map(renderCustomerItem)
                )}
            </CustomerList>
        </Container>
    );
};
