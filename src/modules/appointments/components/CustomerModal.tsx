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
import { PhoneInput } from '@/common/components/PhoneInput';

const SearchInput = styled(Input)`
    margin-bottom: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    width: 100%;
`;

const CustomerTable = styled.div`
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const CustomerRow = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 2fr 2fr 1fr;
        gap: ${props => props.theme.spacing.md};
    }

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

type CustomerMode = 'search' | 'new';

export const CustomerModal = ({ isOpen, onClose, onSelect }: CustomerModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState<CustomerMode>('search');
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

        // Walidacja: wymagaj co najmniej jednego sposobu kontaktu (telefon LUB email)
        const hasPhone = formData.phone && formData.phone.trim().length > 0;
        const hasEmail = formData.email && formData.email.trim().length > 0;

        if (!hasPhone && !hasEmail) {
            newErrors.phone = 'Podaj co najmniej numer telefonu lub adres email';
            newErrors.email = 'Podaj co najmniej numer telefonu lub adres email';
        } else {
            // Waliduj format tylko jeśli pole jest wypełnione
            if (hasPhone && !/^(\+48)?\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
                newErrors.phone = t.appointments.validation.phoneInvalid;
            }
            if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = t.appointments.validation.emailInvalid;
            }
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

    const modalTitle =
        mode === 'new' ? t.appointments.customerModal.titleNew :
        t.appointments.customerModal.titleSelect;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            {mode === 'search' ? (
                <>
                    <SearchInput
                        type="text"
                        placeholder={t.appointments.customerModal.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {!searchQuery || searchQuery.trim() === '' ? (
                        <EmptyState title="Zacznij wpisywać, żeby zobaczyć listę klientów" />
                    ) : isLoading ? (
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
                        <EmptyState title={t.appointments.customerModal.noResults} />
                    )}

                    <ButtonGroup>
                        <Button $variant="primary" onClick={() => setMode('new')}>
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
                            <PhoneInput
                                value={formData.phone}
                                onChange={(value) =>
                                    setFormData({ ...formData, phone: value })
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
                        <Button $variant="secondary" onClick={() => setMode('search')}>
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