import styled from 'styled-components';
import { useState } from 'react';
import { useDebounce } from '@/common/hooks';
import { useCustomerSearch } from '../hooks/useAppointmentForm';
import type { Customer, SelectedCustomer } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: ${props => props.theme.spacing.lg};
`;

const ModalContainer = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
`;

const ModalHeader = styled.div`
    padding: ${props => props.theme.spacing.xl};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ModalTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: ${props => props.theme.fontSizes.xxl};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    padding: ${props => props.theme.spacing.sm};
    line-height: 1;
    transition: color ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const ModalBody = styled.div`
    padding: ${props => props.theme.spacing.xl};
    overflow-y: auto;
    flex: 1;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    margin-bottom: ${props => props.theme.spacing.lg};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const CustomerTable = styled.div`
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
`;

const CustomerRow = styled.div`
    display: grid;
    grid-template-columns: 2fr 2fr 1fr;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: background-color ${props => props.theme.transitions.fast};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
    }

    &:last-child {
        border-bottom: none;
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr;
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

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    margin-top: ${props => props.theme.spacing.lg};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    border: none;
    flex: 1;

    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover {
            transform: translateY(-2px);
            box-shadow: ${props.theme.shadows.lg};
        }
    ` : `
        background-color: ${props.theme.colors.surface};
        color: ${props.theme.colors.text};
        border: 1px solid ${props.theme.colors.border};

        &:hover {
            background-color: ${props.theme.colors.surfaceHover};
        }
    `}
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

const FormGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
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

const ErrorMessage = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
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
            newErrors.firstName = 'Imię musi mieć minimum 2 znaki';
        }
        if (!formData.lastName || formData.lastName.length < 2) {
            newErrors.lastName = 'Nazwisko musi mieć minimum 2 znaki';
        }
        if (!formData.phone || !/^(\+48)?\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
            newErrors.phone = 'Nieprawidłowy numer telefonu';
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Nieprawidłowy adres email';
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

    if (!isOpen) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>
                        {showNewForm ? 'Dodaj nowego klienta' : 'Wybierz klienta'}
                    </ModalTitle>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </ModalHeader>

                <ModalBody>
                    {!showNewForm ? (
                        <>
                            <SearchInput
                                type="text"
                                placeholder="Szukaj po nazwisku, emailu lub telefonie..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            {isLoading ? (
                                <EmptyState>Wyszukiwanie...</EmptyState>
                            ) : customers && customers.length > 0 ? (
                                <CustomerTable>
                                    <CustomerHeader>
                                        <div>Klient</div>
                                        <div>Kontakt</div>
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
                                <EmptyState>
                                    {searchQuery
                                        ? 'Nie znaleziono klientów'
                                        : 'Wprowadź frazę wyszukiwania'}
                                </EmptyState>
                            )}

                            <ButtonGroup>
                                <Button $variant="primary" onClick={() => setShowNewForm(true)}>
                                    Dodaj nowego klienta
                                </Button>
                            </ButtonGroup>
                        </>
                    ) : (
                        <>
                            <FormGrid>
                                <FieldGroup>
                                    <Label>Imię</Label>
                                    <Input
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                        placeholder="Jan"
                                    />
                                    {errors.firstName && <ErrorMessage>{errors.firstName}</ErrorMessage>}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>Nazwisko</Label>
                                    <Input
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                        placeholder="Kowalski"
                                    />
                                    {errors.lastName && <ErrorMessage>{errors.lastName}</ErrorMessage>}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>Telefon</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                        placeholder="+48 123 456 789"
                                    />
                                    {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>Email</Label>
                                    <Input
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="jan.kowalski@example.com"
                                    />
                                    {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                                </FieldGroup>
                            </FormGrid>

                            <ButtonGroup>
                                <Button $variant="secondary" onClick={() => setShowNewForm(false)}>
                                    Wróć do wyszukiwania
                                </Button>
                                <Button $variant="primary" onClick={handleSubmitNew}>
                                    Zatwierdź
                                </Button>
                            </ButtonGroup>
                        </>
                    )}
                </ModalBody>
            </ModalContainer>
        </Overlay>
    );
};