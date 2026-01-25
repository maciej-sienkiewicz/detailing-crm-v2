// src/modules/calendar/components/QuickServiceModal.tsx
import React, { useState, useEffect } from 'react';
import { PriceInput } from '@/modules/services/components/PriceInput';
import { useCreateService } from '@/modules/services/hooks/useServices';
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
    CheckboxContainer,
    CheckboxLabel,
    Checkbox,
    CheckboxContent,
    CheckboxTitle,
    CheckboxDescription,
    SubmitError,
    Footer,
    Button,
} from './QuickServiceModalStyles';

// --- ICONS (Inline SVG) ---
const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

// --- TYPES ---
interface QuickServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onServiceCreate: (service: { id?: string; name: string; basePriceNet: number; vatRate: 23 }) => void;
    initialServiceName?: string;
}

// --- COMPONENT ---
export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
    isOpen,
    onClose,
    onServiceCreate,
    initialServiceName = '',
}) => {
    const [serviceName, setServiceName] = useState(initialServiceName);
    const [basePriceNet, setBasePriceNet] = useState(0);
    const [saveToDatabase, setSaveToDatabase] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = useCreateService();

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setServiceName(initialServiceName);
            setBasePriceNet(0);
            setSaveToDatabase(false);
            setErrors({});
        }
    }, [isOpen, initialServiceName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors: Record<string, string> = {};
        if (!serviceName || serviceName.trim().length < 3) {
            newErrors.name = 'Nazwa usługi musi mieć co najmniej 3 znaki';
        }
        if (basePriceNet <= 0) {
            newErrors.price = 'Cena musi być większa niż 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            let createdServiceId: string | undefined;

            // If save to database is checked, create the service
            if (saveToDatabase) {
                const result = await createMutation.mutateAsync({
                    name: serviceName,
                    basePriceNet,
                    vatRate: 23,
                    requireManualPrice: false,
                });
                // API returns the service object directly, not wrapped
                createdServiceId = result.id;
            }

            // Return the service (with ID if saved to DB, without if not)
            onServiceCreate({
                id: createdServiceId,
                name: serviceName,
                basePriceNet,
                vatRate: 23,
            });

            onClose();
        } catch (error) {
            console.error('Failed to create service:', error);
            setErrors({ submit: 'Nie udało się zapisać usługi' });
        }
    };

    const isSubmitting = createMutation.isPending;

    if (!isOpen) return null;

    return (
        <Overlay
            $isOpen={isOpen}
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

                        <Title>Wprowadź nową usługę</Title>
                    </Header>

                    <Content>
                        <FieldGroup>
                            <Label>Nazwa usługi</Label>
                            <Input
                                type="text"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                                placeholder="np. Mycie i odkurzanie"
                                $hasError={!!errors.name}
                                autoFocus
                            />
                            {errors.name && (
                                <ErrorMessage>{errors.name}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <PriceInput
                                netAmount={basePriceNet}
                                vatRate={23}
                                onChange={setBasePriceNet}
                                netLabel="Cena netto"
                                grossLabel="Cena brutto"
                                vatLabel="VAT"
                                hasError={!!errors.price}
                            />
                            {errors.price && (
                                <ErrorMessage>{errors.price}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <CheckboxContainer>
                            <CheckboxLabel>
                                <Checkbox
                                    checked={saveToDatabase}
                                    onChange={(e) => setSaveToDatabase(e.target.checked)}
                                />
                                <CheckboxContent>
                                    <CheckboxTitle>
                                        Czy zapisać usługę w bazie danych?
                                    </CheckboxTitle>
                                    <CheckboxDescription>
                                        Jeśli zaznaczysz tę opcję, usługa będzie dostępna do użycia w przyszłości
                                    </CheckboxDescription>
                                </CheckboxContent>
                            </CheckboxLabel>
                        </CheckboxContainer>

                        {errors.submit && (
                            <SubmitError>{errors.submit}</SubmitError>
                        )}
                    </Content>

                    <Footer>
                        <Button
                            type="button"
                            $variant="secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Anuluj
                        </Button>
                        <Button
                            type="submit"
                            $variant="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Zapisywanie...' : 'Dodaj usługę'}
                        </Button>
                    </Footer>
                </Form>
            </ModalContainer>
        </Overlay>
    );
};
