import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { PriceInput } from '@/modules/services/components/PriceInput';
import { useCreateService } from '@/modules/services/hooks/useServices';
import type { VatRate } from '@/modules/services/types';
import {
    Overlay,
    ModalContainer,
    Form,
    Header,
    TitleGroup,
    CloseButton,
    Title,
    Content,
    FieldGroup,
    Label,
    Input,
    Select,
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

const VAT_OPTIONS: { value: VatRate; label: string }[] = [
    { value: 23, label: '23%' },
    { value: 8, label: '8%' },
    { value: 5, label: '5%' },
    { value: 0, label: '0%' },
    { value: -1, label: 'zw.' },
];

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

interface QuickServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onServiceCreate: (service: { id?: string; name: string; basePriceNet: number; basePriceGross: number; vatRate: VatRate }) => void;
    initialServiceName?: string;
    contentLeft?: number;
}

export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
                                                                        isOpen,
                                                                        onClose,
                                                                        onServiceCreate,
                                                                        initialServiceName = '',
                                                                        contentLeft: contentLeftProp,
                                                                    }) => {
    const { isCollapsed } = useSidebar();
    const contentLeft = contentLeftProp ?? (typeof window !== 'undefined' ? (isCollapsed ? 64 : 240) : 0);
    const [serviceName, setServiceName] = useState(initialServiceName);
    const [basePriceNet, setBasePriceNet] = useState(0);
    const [basePriceGross, setBasePriceGross] = useState(0);
    const [vatRate, setVatRate] = useState<VatRate>(23);
    const [saveToDatabase, setSaveToDatabase] = useState(false);
    const [requireManualPrice, setRequireManualPrice] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = useCreateService();

    useEffect(() => {
        if (isOpen) {
            setServiceName(initialServiceName);
            setBasePriceNet(0);
            setBasePriceGross(0);
            setVatRate(23);
            setSaveToDatabase(false);
            setRequireManualPrice(false);
            setErrors({});
        }
    }, [isOpen, initialServiceName]);

    useEffect(() => {
        if (basePriceNet > 0) {
            const rate = Math.max(0, vatRate);
            setBasePriceGross(Math.round(basePriceNet * (1 + rate / 100)));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vatRate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};
        if (!serviceName || serviceName.trim().length < 3) {
            newErrors.name = 'Nazwa usługi musi mieć co najmniej 3 znaki';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            let createdServiceId: string | undefined;

            if (saveToDatabase) {
                const result = await createMutation.mutateAsync({
                    name: serviceName,
                    basePriceNet,
                    basePriceGross,
                    vatRate,
                    requireManualPrice,
                });
                createdServiceId = result.id;
            }

            onServiceCreate({
                id: createdServiceId,
                name: serviceName,
                basePriceNet,
                basePriceGross,
                vatRate,
            });

            onClose();
        } catch (error) {
            setErrors({ submit: 'Nie udało się zapisać usługi' });
        }
    };

    const isSubmitting = createMutation.isPending;

    if (!isOpen) return null;

    return createPortal(
        <Overlay
            $isOpen={isOpen}
            $contentLeft={contentLeft}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <ModalContainer $isOpen={isOpen}>
                <Form onSubmit={handleSubmit}>
                    <Header>
                        <TitleGroup>
                            <Title>Wprowadź nową usługę</Title>
                        </TitleGroup>
                        <CloseButton type="button" onClick={onClose}>
                            <IconX />
                        </CloseButton>
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
                            <Label>Stawka VAT</Label>
                            <Select
                                value={vatRate}
                                onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
                            >
                                {VAT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </Select>
                        </FieldGroup>

                        <FieldGroup>
                            <PriceInput
                                netAmount={basePriceNet}
                                grossAmount={basePriceGross}
                                vatRate={vatRate}
                                onChange={(net, gross) => { setBasePriceNet(net); setBasePriceGross(gross); }}
                                netLabel="Cena netto"
                                grossLabel="Cena brutto"
                                vatLabel="VAT"
                                hasError={!!errors.price}
                            />
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

                        {saveToDatabase && (
                            <CheckboxContainer>
                                <CheckboxLabel>
                                    <Checkbox
                                        checked={requireManualPrice}
                                        onChange={(e) => setRequireManualPrice(e.target.checked)}
                                    />
                                    <CheckboxContent>
                                        <CheckboxTitle>
                                            Cena ustalana ręcznie przy każdej wizycie
                                        </CheckboxTitle>
                                        <CheckboxDescription>
                                            Przy dodawaniu tej usługi do wizyty zawsze będzie wymagane ręczne podanie ceny
                                        </CheckboxDescription>
                                    </CheckboxContent>
                                </CheckboxLabel>
                            </CheckboxContainer>
                        )}

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
        </Overlay>,
        document.body
    );
};