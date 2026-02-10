// src/modules/calendar/components/QuickCustomerModal.tsx

import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { useCreateCustomer } from '@/modules/customers';
import type { Customer, CreateCustomerPayload } from '@/modules/customers';
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

        if (!phone.trim()) {
            newErrors.phone = 'Numer telefonu jest wymagany';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const payload: CreateCustomerPayload = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: null,
            phone: phone.replace(/[\s-]/g, ''),
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
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="np. +48 123 456 789"
                                $hasError={!!errors.phone}
                            />
                            {errors.phone && (
                                <ErrorMessage>{errors.phone}</ErrorMessage>
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
