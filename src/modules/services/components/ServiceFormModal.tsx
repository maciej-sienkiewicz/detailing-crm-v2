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
import { useProtocolTemplates, useProtocolRulesByService } from '@/modules/protocols/api/useProtocols';
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

const Divider = styled.hr`
    border: none;
    border-top: 1px solid ${props => props.theme.colors.border};
    margin: ${props => props.theme.spacing.lg} 0;
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: rgb(239, 246, 255); // blue-50
    border: 1px solid rgb(191, 219, 254); // blue-200
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    color: rgb(30, 64, 175); // blue-800
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.md};

    svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-top: 2px;
    }
`;

const ProtocolCheckboxList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    max-height: 200px;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.sm};
    background: rgb(249, 250, 251);
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
`;

const ProtocolCheckbox = styled.label`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm};
    cursor: pointer;
    border-radius: ${props => props.theme.radii.sm};
    transition: background ${props => props.theme.transitions.fast};

    &:hover {
        background: white;
    }

    input {
        margin-top: 2px;
        cursor: pointer;
    }
`;

const ProtocolInfo = styled.div`
    flex: 1;
`;

const ProtocolName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const ProtocolDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

const ProtocolBadge = styled.span<{ $stage: 'CHECK_IN' | 'CHECK_OUT' }>`
    display: inline-block;
    padding: 2px ${props => props.theme.spacing.xs};
    font-size: 10px;
    font-weight: 600;
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => props.$stage === 'CHECK_IN' ? 'rgb(239, 246, 255)' : 'rgb(254, 243, 199)'};
    color: ${props => props.$stage === 'CHECK_IN' ? 'rgb(37, 99, 235)' : 'rgb(180, 83, 9)'};
`;

const EmptyProtocols = styled.div`
    padding: ${props => props.theme.spacing.md};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.xs};
`;

// Icons
const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

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
    const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

    const createMutation = useCreateService();
    const updateMutation = useUpdateService();

    // Fetch protocol templates
    const { data: protocolTemplates = [] } = useProtocolTemplates();

    // Fetch existing protocol rules for this service (if editing)
    const { data: existingRules = [] } = useProtocolRulesByService(service?.id || '');

    useEffect(() => {
        if (isOpen) {
            if (service) {
                setName(service.name);
                setBasePriceNet(service.basePriceNet);
                setVatRate(service.vatRate);
                // Populate selected protocols from existing rules
                setSelectedProtocols(existingRules.map(rule => rule.protocolTemplateId));
            } else {
                setName('');
                setBasePriceNet(0);
                setVatRate(23);
                setSelectedProtocols([]);
            }
            setErrors({});
        }
    }, [isOpen, service, existingRules]);

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

                    <Divider />

                    <div>
                        <SectionTitle>Wymagane dokumenty dla tej usługi</SectionTitle>
                        <InfoBox>
                            <InfoIcon />
                            <div>
                                Gdy ta usługa zostanie dodana do wizyty, system automatycznie poprosi klienta o podpis pod wybranymi dokumentami.
                            </div>
                        </InfoBox>

                        <FieldGroup>
                            <Label>Wybierz protokoły</Label>
                            {protocolTemplates.length === 0 ? (
                                <EmptyProtocols>
                                    Brak dostępnych protokołów. Dodaj szablony protokołów w Centrum Dokumentacji.
                                </EmptyProtocols>
                            ) : (
                                <ProtocolCheckboxList>
                                    {protocolTemplates
                                        .filter(template => template.isActive)
                                        .map(template => {
                                            const isChecked = selectedProtocols.includes(template.id);
                                            // Check if this is used in existing rules to determine stage
                                            const existingRule = existingRules.find(r => r.protocolTemplateId === template.id);

                                            return (
                                                <ProtocolCheckbox key={template.id}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedProtocols([...selectedProtocols, template.id]);
                                                            } else {
                                                                setSelectedProtocols(selectedProtocols.filter(id => id !== template.id));
                                                            }
                                                        }}
                                                    />
                                                    <ProtocolInfo>
                                                        <ProtocolName>
                                                            {template.name}
                                                            {existingRule && (
                                                                <>
                                                                    {' '}
                                                                    <ProtocolBadge $stage={existingRule.stage}>
                                                                        {existingRule.stage === 'CHECK_IN' ? 'Przyjęcie' : 'Wydanie'}
                                                                    </ProtocolBadge>
                                                                </>
                                                            )}
                                                        </ProtocolName>
                                                        {template.description && (
                                                            <ProtocolDescription>{template.description}</ProtocolDescription>
                                                        )}
                                                    </ProtocolInfo>
                                                </ProtocolCheckbox>
                                            );
                                        })}
                                </ProtocolCheckboxList>
                            )}
                        </FieldGroup>
                    </div>

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