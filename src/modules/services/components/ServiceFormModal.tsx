// src/modules/services/components/ServiceFormModal.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { Input, Label, FieldGroup, ErrorMessage, Select } from '@/common/components/Form';
import { PriceInput } from './PriceInput';
import { useCreateService, useUpdateService } from '../hooks/useServices';
import { serviceSchema } from '../utils/validators';
import { t } from '@/common/i18n';
import type { Service, VatRate } from '../types';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.md} 0;
`;

const Toast = styled.div<{ $show: boolean }>`
    position: fixed;
    bottom: ${props => props.$show ? props.theme.spacing.xl : '-100px'};
    left: 50%;
    transform: translateX(-50%);
    background: ${props => props.theme.colors.success};
    color: white;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    transition: bottom ${props => props.theme.transitions.normal};
    z-index: 10000;
    max-width: 90%;
    text-align: center;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    service?: Service;
    onSuccess?: () => void;
}

export const ServiceFormModal = ({ isOpen, onClose, service, onSuccess }: ServiceFormModalProps) => {
    const [name, setName] = useState('');
    const [basePriceNet, setBasePriceNet] = useState(0);
    const [vatRate, setVatRate] = useState<VatRate>(23);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showToast, setShowToast] = useState(false);

    const createMutation = useCreateService();
    const updateMutation = useUpdateService();

    useEffect(() => {
        if (isOpen) {
            if (service) {
                setName(service.name);
                setBasePriceNet(service.basePriceNet);
                setVatRate(service.vatRate);
            } else {
                setName('');
                setBasePriceNet(0);
                setVatRate(23);
            }
            setErrors({});
        }
    }, [isOpen, service]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = serviceSchema.safeParse({ name, basePriceNet, vatRate });

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[String(err.path[0])] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            if (service) {
                await updateMutation.mutateAsync({
                    originalServiceId: service.id,
                    name,
                    basePriceNet,
                    vatRate,
                });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
            } else {
                await createMutation.mutateAsync({
                    name,
                    basePriceNet,
                    vatRate,
                });
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to save service:', error);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={service ? t.services.editService : t.services.addService}
                maxWidth="600px"
            >
                <Form onSubmit={handleSubmit}>
                    <div>
                        <SectionTitle>{t.services.form.title}</SectionTitle>

                        <FieldGroup>
                            <Label htmlFor="name">{t.services.form.nameLabel}</Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t.services.form.namePlaceholder}
                            />
                            {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                        </FieldGroup>
                    </div>

                    <FieldGroup>
                        <Label htmlFor="vatRate">{t.services.form.vatLabel}</Label>
                        <Select
                            id="vatRate"
                            value={vatRate}
                            onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
                        >
                            <option value={23}>{t.services.vatRates[23]}</option>
                            <option value={8}>{t.services.vatRates[8]}</option>
                            <option value={5}>{t.services.vatRates[5]}</option>
                            <option value={0}>{t.services.vatRates[0]}</option>
                            <option value={-1}>{t.services.vatRates['-1']}</option>
                        </Select>
                        {errors.vatRate && <ErrorMessage>{errors.vatRate}</ErrorMessage>}
                    </FieldGroup>

                    <PriceInput
                        netAmount={basePriceNet}
                        vatRate={vatRate}
                        onChange={setBasePriceNet}
                        netLabel={t.services.form.priceNetLabel}
                        grossLabel={t.services.form.priceGrossLabel}
                        vatLabel={t.services.form.vatAmount}
                        hasError={!!errors.basePriceNet}
                    />
                    {errors.basePriceNet && <ErrorMessage>{errors.basePriceNet}</ErrorMessage>}

                    <ButtonGroup>
                        <Button type="button" $variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            {t.services.form.cancel}
                        </Button>
                        <Button type="submit" $variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? t.services.form.submitting : t.services.form.submit}
                        </Button>
                    </ButtonGroup>
                </Form>
            </Modal>

            <Toast $show={showToast}>
                {t.services.success.updated}
            </Toast>
        </>
    );
};