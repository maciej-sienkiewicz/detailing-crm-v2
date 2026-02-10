// src/modules/calendar/components/QuickCustomerModal.tsx

import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { useCreateCustomer } from '@/modules/customers';
import type { Customer, CreateCustomerPayload } from '@/modules/customers';
import { PhoneInput } from '@/common/components/PhoneInput';
import styled from 'styled-components';
import {
    Overlay,
    ModalContainer,
    Form,
    Header,
    DragHandle,
    DragHandleBar,
    CloseButton,
    Title,
    Content,
    FieldGroup,
    Label,
    Input,
    ErrorMessage,
    SubmitError,
    Footer,
    Button,
} from './QuickServiceModalStyles';

const PhoneInputWrapper = styled.div`
    select, input[type="tel"] {
        padding: 10px ${props => props.theme.spacing.md};
        background: ${props => props.theme.colors.surfaceAlt};
        border: 1px solid transparent;
        border-radius: ${props => props.theme.radii.lg};
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.theme.colors.text};
        outline: none;
        transition: all ${props => props.theme.transitions.fast};
        box-shadow: none;

        &:hover {
            border-color: transparent;
        }

        &::placeholder {
            color: ${props => props.theme.colors.textMuted};
        }

        &:focus {
            background: ${props => props.theme.colors.surface};
            border-color: ${props => props.theme.colors.primary};
            box-shadow: none;
        }
    }

    /* Error state */
    &.has-error select,
    &.has-error input[type="tel"] {
        border-color: ${props => props.theme.colors.error};
    }

    &.has-error select:focus,
    &.has-error input[type="tel"]:focus {
        border-color: ${props => props.theme.colors.error};
    }
`;

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

interface QuickCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: Customer) => void;
}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { isCollapsed } = useSidebar();
    const contentLeft = typeof window !== 'undefined' ? (isCollapsed ? 64 : 240) : 0;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { createCustomer, isCreating } = useCreateCustomer({
        onSuccess: (customer) => {
            onSuccess(customer);
            onClose();
        },
        onError: (error) => {
            setErrors({ submit: error.message || 'Nie udało się utworzyć klienta' });
        },
    });

    useEffect(() => {
        if (isOpen) {
            setFirstName('');
            setLastName('');
            setPhone('');
            setEmail('');
            setErrors({});
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (!firstName.trim() || firstName.trim().length < 2) {
            newErrors.firstName = 'Imię musi mieć co najmniej 2 znaki';
        }

        if (!lastName.trim() || lastName.trim().length < 2) {
            newErrors.lastName = 'Nazwisko musi mieć co najmniej 2 znaki';
        }

        // Phone has real digits if after stripping non-digits we have more than just a country code
        const phoneDigits = phone.replace(/\D/g, '');
        const hasPhone = phoneDigits.length > 3;
        const hasEmail = email.trim().length > 0;

        if (!hasPhone && !hasEmail) {
            newErrors.phone = 'Podaj numer telefonu lub adres email';
        }

        if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = 'Nieprawidłowy format adresu email';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const payload: CreateCustomerPayload = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: hasEmail ? email.trim().toLowerCase() : null,
            phone: hasPhone ? phone.replace(/[\s-]/g, '') : null,
            homeAddress: null,
            companyData: null,
            notes: '',
        };

        createCustomer(payload);
    };

    if (!isOpen) return null;

    return (
        <Overlay
            $isOpen={isOpen}
            $contentLeft={contentLeft}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <ModalContainer $isOpen={isOpen}>
                <Form onSubmit={handleSubmit}>
                    <Header>
                        <DragHandle>
                            <DragHandleBar />
                        </DragHandle>

                        <CloseButton type="button" onClick={onClose}>
                            <IconX />
                        </CloseButton>

                        <Title>Nowy klient</Title>
                    </Header>

                    <Content>
                        <FieldGroup>
                            <Label>Imię</Label>
                            <Input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="np. Jan"
                                $hasError={!!errors.firstName}
                                autoFocus
                            />
                            {errors.firstName && (
                                <ErrorMessage>{errors.firstName}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Nazwisko</Label>
                            <Input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="np. Kowalski"
                                $hasError={!!errors.lastName}
                            />
                            {errors.lastName && (
                                <ErrorMessage>{errors.lastName}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Numer telefonu</Label>
                            <PhoneInputWrapper className={errors.phone ? 'has-error' : ''}>
                                <PhoneInput
                                    value={phone}
                                    onChange={(value) => setPhone(value)}
                                    hasError={!!errors.phone}
                                />
                            </PhoneInputWrapper>
                            {errors.phone && (
                                <ErrorMessage>{errors.phone}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Adres email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="np. jan@firma.pl"
                                $hasError={!!errors.email}
                            />
                            {errors.email && (
                                <ErrorMessage>{errors.email}</ErrorMessage>
                            )}
                        </FieldGroup>

                        {errors.submit && (
                            <SubmitError>{errors.submit}</SubmitError>
                        )}
                    </Content>

                    <Footer>
                        <Button
                            type="button"
                            $variant="secondary"
                            onClick={onClose}
                            disabled={isCreating}
                        >
                            Anuluj
                        </Button>
                        <Button
                            type="submit"
                            $variant="primary"
                            disabled={isCreating}
                        >
                            {isCreating ? 'Zapisywanie...' : 'Dodaj klienta'}
                        </Button>
                    </Footer>
                </Form>
            </ModalContainer>
        </Overlay>
    );
};
