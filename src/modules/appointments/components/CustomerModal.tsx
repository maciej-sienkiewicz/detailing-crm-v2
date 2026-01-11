// src/modules/appointments/components/CustomerModal.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useDebounce } from '@/common/hooks';
import { useCustomerSearch } from '../hooks/useAppointmentForm';
import { Modal } from '@/common/components/Modal';
import { FormGrid, FieldGroup, Label, Input, ErrorMessage } from '@/common/components/Form';
import { Button, ButtonGroup } from '@/common/components/Button';
import { EmptyState } from '@/common/components/EmptyState';
import { t } from '@/common/i18n';
import type { Customer, SelectedCustomer } from '../types';

const SearchInput = styled(Input)`
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const CustomerTable = styled.div`
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
`;

const CustomerRow = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: background-color ${props => props.theme.transitions.fast};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 2fr 2fr 1fr;
        gap: ${props => props.theme.spacing.md};
    }

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
    }

    &:last-child {
        border-bottom: none;
    }
`;

const CustomerHeader = styled(CustomerRow)`
    background-color: ${props => props.theme.colors.surfaceAlt};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: default;

    &:hover {
        background-color: ${props => props.theme.colors.surfaceAlt};
    }
`;

const CustomerCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const PrimaryText = styled.span`
    color: ${props => props.theme.colors.text};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const SecondaryText = styled.span`
    color: ${props => props.theme.colors.textSecondary};
    font-size: ${props => props.theme.fontSizes.sm};
`;

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: SelectedCustomer) => void;
}

export const CustomerModal = ({ isOpen, onClose, onSelect }: CustomerModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewForm, setShowNewForm] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const debouncedQuery = useDebounce(searchQuery, 200);
    const { data: customers, isLoading } = useCustomerSearch(debouncedQuery);

    const handleCustomerClick = (customer: Customer) => {
        onSelect({
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email,
            isNew: false,
        });
        onClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName || formData.firstName.length < 2) {
            newErrors.firstName = t.appointments.validation.firstNameMinLength;
        }
        if (!formData.lastName || formData.lastName.length < 2) {
            newErrors.lastName = t.appointments.validation.lastNameMinLength;
        }
        if (!formData.phone || !/^(\+48)?\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
            newErrors.phone = t.appointments.validation.phoneInvalid;
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t.appointments.validation.emailInvalid;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitNew = () => {
        if (!validateForm()) return;

        onSelect({
            ...formData,
            isNew: true,
        });
        onClose();
    };

    const modalTitle = showNewForm
        ? t.appointments.customerModal.titleNew
        : t.appointments.customerModal.titleSelect;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            {!showNewForm ? (
                <>
                    <SearchInput
                        type="text"
                        placeholder={t.appointments.customerModal.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {isLoading ? (
                        <EmptyState title={t.appointments.customerModal.searching} />
                    ) : customers && customers.length > 0 ? (
                        <CustomerTable>
                            <CustomerHeader>
                                <div>{t.customers.table.customer}</div>
                                <div>{t.customers.table.contact}</div>
                                <div></div>
                            </CustomerHeader>
                            {customers.map((customer) => (
                                <CustomerRow
                                    key={customer.id}
                                    onClick={() => handleCustomerClick(customer)}
                                >
                                    <CustomerCell>
                                        <PrimaryText>
                                            {customer.firstName} {customer.lastName}
                                        </PrimaryText>
                                    </CustomerCell>
                                    <CustomerCell>
                                        <SecondaryText>{customer.email}</SecondaryText>
                                        <SecondaryText>{customer.phone}</SecondaryText>
                                    </CustomerCell>
                                    <CustomerCell></CustomerCell>
                                </CustomerRow>
                            ))}
                        </CustomerTable>
                    ) : (
                        <EmptyState
                            title={searchQuery
                                ? t.appointments.customerModal.noResults
                                : t.appointments.customerModal.enterSearch}
                        />
                    )}

                    <ButtonGroup>
                        <Button $variant="primary" onClick={() => setShowNewForm(true)}>
                            {t.appointments.customerModal.addNewButton}
                        </Button>
                    </ButtonGroup>
                </>
            ) : (
                <>
                    <FormGrid>
                        <FieldGroup>
                            <Label>{t.appointments.customerModal.firstName}</Label>
                            <Input
                                value={formData.firstName}
                                onChange={(e) =>
                                    setFormData({ ...formData, firstName: e.target.value })
                                }
                                placeholder={t.appointments.customerModal.firstNamePlaceholder}
                            />
                            {errors.firstName && <ErrorMessage>{errors.firstName}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.appointments.customerModal.lastName}</Label>
                            <Input
                                value={formData.lastName}
                                onChange={(e) =>
                                    setFormData({ ...formData, lastName: e.target.value })
                                }
                                placeholder={t.appointments.customerModal.lastNamePlaceholder}
                            />
                            {errors.lastName && <ErrorMessage>{errors.lastName}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.appointments.customerModal.phone}</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                placeholder={t.appointments.customerModal.phonePlaceholder}
                            />
                            {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.appointments.customerModal.email}</Label>
                            <Input
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                placeholder={t.appointments.customerModal.emailPlaceholder}
                            />
                            {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                        </FieldGroup>
                    </FormGrid>

                    <ButtonGroup>
                        <Button $variant="secondary" onClick={() => setShowNewForm(false)}>
                            {t.appointments.customerModal.backToSearch}
                        </Button>
                        <Button $variant="primary" onClick={handleSubmitNew}>
                            {t.appointments.customerModal.confirmButton}
                        </Button>
                    </ButtonGroup>
                </>
            )}
        </Modal>
    );
};