import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { Label, FieldGroup, ErrorMessage, Select } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { useCreateProtocolRule, useUpdateProtocolRule } from '../api/useProtocols';
import { useServices } from '@/modules/services/hooks/useServices';
import type { ProtocolTemplate, ProtocolStage, ProtocolRule } from '../types';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: rgb(239, 246, 255); // blue-50
    border: 1px solid rgb(191, 219, 254); // blue-200
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: rgb(30, 64, 175); // blue-800
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    align-items: flex-start;

    svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 2px;
    }
`;

const RadioGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const RadioOption = styled.label`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        border-color: var(--brand-primary);
        background: rgb(249, 250, 251);
    }

    input:checked ~ & {
        border-color: var(--brand-primary);
        background: rgb(239, 246, 255);
    }
`;

const RadioInput = styled.input`
    margin-top: 2px;
    cursor: pointer;
`;

const RadioContent = styled.div`
    flex: 1;
`;

const RadioTitle = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const RadioDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.md};
    background: rgb(249, 250, 251);
    border-radius: ${props => props.theme.radii.md};
`;

const ToggleLabel = styled.div``;

const ToggleLabelText = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin-bottom: 2px;
`;

const ToggleDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

// Icons
const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface ProtocolRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: ProtocolStage;
    templates: ProtocolTemplate[];
    editingRule?: ProtocolRule | null;
    onSuccess?: () => void;
}

export const ProtocolRuleModal = ({
    isOpen,
    onClose,
    stage,
    templates,
    editingRule,
    onSuccess,
}: ProtocolRuleModalProps) => {
    const [protocolTemplateId, setProtocolTemplateId] = useState('');
    const [triggerType, setTriggerType] = useState<'GLOBAL_ALWAYS' | 'SERVICE_SPECIFIC'>('GLOBAL_ALWAYS');
    const [serviceId, setServiceId] = useState('');
    const [isMandatory, setIsMandatory] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = useCreateProtocolRule();
    const updateMutation = useUpdateProtocolRule();

    // Fetch active services for the service selector
    const { services, isLoading: isLoadingServices } = useServices({
        search: '',
        page: 1,
        limit: 100,
        showInactive: false,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingRule) {
                // Populate form with editing rule data
                setProtocolTemplateId(editingRule.protocolTemplateId);
                setTriggerType(editingRule.triggerType);
                setServiceId(editingRule.serviceId || '');
                setIsMandatory(editingRule.isMandatory);
            } else {
                // Reset form when modal opens for creating new rule
                setProtocolTemplateId('');
                setTriggerType('GLOBAL_ALWAYS');
                setServiceId('');
                setIsMandatory(true);
            }
            setErrors({});
        }
    }, [isOpen, editingRule]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!protocolTemplateId) {
            newErrors.protocolTemplateId = 'Wybierz szablon protokołu';
        }

        if (triggerType === 'SERVICE_SPECIFIC' && !serviceId) {
            newErrors.serviceId = 'Wybierz usługę dla tego protokołu';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const data = {
                protocolTemplateId,
                triggerType,
                stage,
                serviceId: triggerType === 'SERVICE_SPECIFIC' ? serviceId : undefined,
                isMandatory,
                displayOrder: editingRule?.displayOrder ?? 999, // Keep order for edits, default for new
            };

            if (editingRule) {
                await updateMutation.mutateAsync({
                    id: editingRule.id,
                    data,
                });
            } else {
                await createMutation.mutateAsync(data);
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(`Failed to ${editingRule ? 'update' : 'create'} protocol rule:`, error);
            setErrors({ submit: `Wystąpił błąd podczas ${editingRule ? 'aktualizacji' : 'tworzenia'} reguły` });
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${editingRule ? 'Edytuj' : 'Dodaj'} regułę protokołu (${stage === 'CHECK_IN' ? 'Przyjęcie' : 'Wydanie'})`}
        >
            <Form onSubmit={handleSubmit}>
                <InfoBox>
                    <InfoIcon />
                    <div>
                        Reguły określają, które protokoły są wymagane przy{' '}
                        {stage === 'CHECK_IN' ? 'przyjęciu' : 'wydaniu'} pojazdu.
                        Możesz ustawić protokoły globalne (zawsze wymagane) lub specyficzne dla konkretnych usług.
                    </div>
                </InfoBox>

                <FieldGroup>
                    <Label>Wybierz szablon protokołu *</Label>
                    <Select
                        value={protocolTemplateId}
                        onChange={(e) => setProtocolTemplateId(e.target.value)}
                    >
                        <option value="">-- Wybierz szablon --</option>
                        {templates
                            .filter(t => t.isActive)
                            .map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                    </Select>
                    {errors.protocolTemplateId && (
                        <ErrorMessage>{errors.protocolTemplateId}</ErrorMessage>
                    )}
                </FieldGroup>

                <FieldGroup>
                    <Label>Typ wyzwalacza *</Label>
                    <RadioGroup>
                        <RadioOption>
                            <RadioInput
                                type="radio"
                                name="triggerType"
                                value="GLOBAL_ALWAYS"
                                checked={triggerType === 'GLOBAL_ALWAYS'}
                                onChange={() => setTriggerType('GLOBAL_ALWAYS')}
                            />
                            <RadioContent>
                                <RadioTitle>Globalny - zawsze wymagany</RadioTitle>
                                <RadioDescription>
                                    Ten protokół będzie wymagany dla wszystkich wizyt przy{' '}
                                    {stage === 'CHECK_IN' ? 'przyjęciu' : 'wydaniu'} pojazdu.
                                </RadioDescription>
                            </RadioContent>
                        </RadioOption>

                        <RadioOption>
                            <RadioInput
                                type="radio"
                                name="triggerType"
                                value="SERVICE_SPECIFIC"
                                checked={triggerType === 'SERVICE_SPECIFIC'}
                                onChange={() => setTriggerType('SERVICE_SPECIFIC')}
                            />
                            <RadioContent>
                                <RadioTitle>Specyficzny dla usługi</RadioTitle>
                                <RadioDescription>
                                    Protokół będzie wymagany tylko gdy wybrana usługa zostanie dodana do wizyty.
                                </RadioDescription>
                            </RadioContent>
                        </RadioOption>
                    </RadioGroup>
                </FieldGroup>

                {triggerType === 'SERVICE_SPECIFIC' && (
                    <FieldGroup>
                        <Label>Wybierz usługę *</Label>
                        <Select
                            value={serviceId}
                            onChange={(e) => setServiceId(e.target.value)}
                            disabled={isLoadingServices}
                        >
                            <option value="">
                                {isLoadingServices ? 'Ładowanie usług...' : '-- Wybierz usługę --'}
                            </option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
                                </option>
                            ))}
                        </Select>
                        {errors.serviceId && (
                            <ErrorMessage>{errors.serviceId}</ErrorMessage>
                        )}
                    </FieldGroup>
                )}

                <ToggleRow>
                    <ToggleLabel>
                        <ToggleLabelText>Obowiązkowy</ToggleLabelText>
                        <ToggleDescription>
                            Jeśli włączone, wizyta nie może być zakończona bez podpisu tego protokołu
                        </ToggleDescription>
                    </ToggleLabel>
                    <Toggle
                        checked={isMandatory}
                        onChange={setIsMandatory}
                        label=""
                    />
                </ToggleRow>

                {errors.submit && (
                    <ErrorMessage>{errors.submit}</ErrorMessage>
                )}

                <ButtonGroup>
                    <Button type="button" $variant="secondary" onClick={onClose}>
                        Anuluj
                    </Button>
                    <Button type="submit" $variant="primary" disabled={isSubmitting}>
                        {isSubmitting
                            ? (editingRule ? 'Zapisywanie...' : 'Dodawanie...')
                            : (editingRule ? 'Zapisz zmiany' : 'Dodaj regułę')}
                    </Button>
                </ButtonGroup>
            </Form>
        </Modal>
    );
};
