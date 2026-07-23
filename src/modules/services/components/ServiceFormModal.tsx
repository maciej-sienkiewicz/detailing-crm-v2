import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalContent,
  ModalFooter,
  CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { Input, Label, FieldGroup, ErrorMessage, Select } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { PriceInput } from './PriceInput';
import { useCreateService, useUpdateService, useSyncItemName } from '../hooks/useServices';
import { serviceSchema } from '../utils/validators';
import { t } from '@/common/i18n';
import { useProtocolTemplates, useProtocolRulesByService } from '@/modules/protocols/api/useProtocols';
import type { Service, VatRate, AffectedPackage } from '../types';

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

const SectionTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.md} 0;
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

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.md};
    background: rgb(249, 250, 251);
    border-radius: ${props => props.theme.radii.md};
    margin-bottom: ${props => props.theme.spacing.md};
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

const FormInner = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const VatHint = styled.span`
    font-size: 11px;
    color: ${props => props.theme.colors.textMuted};
    margin-top: 4px;
    display: block;
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
    const [basePriceGross, setBasePriceGross] = useState(0);
    const [vatRate, setVatRate] = useState<VatRate>(23);
    const [requireManualPrice, setRequireManualPrice] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showToast, setShowToast] = useState(false);
    const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
    const [showProtocolSection, setShowProtocolSection] = useState(false);
    const [pendingAffectedPackages, setPendingAffectedPackages] = useState<AffectedPackage[] | null>(null);
    const [updatedServiceId, setUpdatedServiceId] = useState<string | null>(null);
    const [updatedServiceName, setUpdatedServiceName] = useState<string>('');

    const createMutation = useCreateService();
    const updateMutation = useUpdateService();
    const syncItemName = useSyncItemName();

    // Fetch protocol templates
    const { data: protocolTemplates = [] } = useProtocolTemplates();

    // Fetch existing protocol rules for this service (if editing)
    const { data: existingRules = [] } = useProtocolRulesByService(service?.id || '');

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (service) {
                setName(service.name);
                setBasePriceNet(service.basePriceNet);
                setBasePriceGross(service.basePriceGross);
                setVatRate(service.vatRate);
                setRequireManualPrice(service.requireManualPrice);
            } else {
                setName('');
                setBasePriceNet(0);
                setBasePriceGross(0);
                setVatRate(23);
                setRequireManualPrice(false);
                setSelectedProtocols([]);
                setShowProtocolSection(false);
            }
            setErrors({});
        }
    }, [isOpen, service]);

    // Separate effect for loading existing protocol rules (only when rules change)
    useEffect(() => {
        if (isOpen && service && existingRules.length > 0) {
            const protocolIds = existingRules.map(rule => rule.protocolTemplateId);
            setSelectedProtocols(protocolIds);
            // Auto-expand section if there are existing protocols
            if (protocolIds.length > 0) {
                setShowProtocolSection(true);
            }
        }
    }, [isOpen, service, existingRules.length]); // Use length instead of array reference

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = serviceSchema.safeParse({ name, basePriceNet, vatRate, requireManualPrice });

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error?.issues?.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[String(err.path[0])] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            if (service) {
                const result = await updateMutation.mutateAsync({
                    originalServiceId: service.id,
                    name,
                    basePriceNet,
                    basePriceGross,
                    vatRate,
                    requireManualPrice,
                });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
                if (result.affectedPackages && result.affectedPackages.length > 0) {
                    setPendingAffectedPackages(result.affectedPackages);
                    setUpdatedServiceId(result.id);
                    setUpdatedServiceName(result.name);
                    return; // modal stays open until user handles dialog
                }
            } else {
                await createMutation.mutateAsync({
                    name,
                    basePriceNet,
                    basePriceGross,
                    vatRate,
                    requireManualPrice,
                });
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to save service:', error);
        }
    };

    const handleSyncPackages = async (confirm: boolean) => {
        if (confirm && pendingAffectedPackages && updatedServiceId) {
            await Promise.all(
                pendingAffectedPackages.map(pkg =>
                    syncItemName.mutateAsync({
                        packageId: pkg.packageId,
                        data: { serviceId: updatedServiceId, newName: updatedServiceName },
                    })
                )
            );
        }
        setPendingAffectedPackages(null);
        setUpdatedServiceId(null);
        setUpdatedServiceName('');
        onSuccess?.();
        onClose();
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="600px">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>
                            {service ? t.services.editService : t.services.addService}
                        </ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <form onSubmit={handleSubmit}>
                    <ModalContent>
                        <FormInner>
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
                                    disabled={!!service}
                                >
                                    <option value={23}>{t.services.vatRates[23]}</option>
                                    <option value={8}>{t.services.vatRates[8]}</option>
                                    <option value={5}>{t.services.vatRates[5]}</option>
                                    <option value={0}>{t.services.vatRates[0]}</option>
                                    <option value={-1}>{t.services.vatRates['-1']}</option>
                                </Select>
                                {!!service && (
                                    <VatHint>Stawka VAT nie może być zmieniona podczas edycji usługi.</VatHint>
                                )}
                                {errors.vatRate && <ErrorMessage>{errors.vatRate}</ErrorMessage>}
                            </FieldGroup>

                            <ToggleRow>
                                <ToggleLabel>
                                    <ToggleLabelText>{t.services.form.requireManualPriceLabel}</ToggleLabelText>
                                    <ToggleDescription>
                                        {t.services.form.requireManualPriceDescription}
                                    </ToggleDescription>
                                </ToggleLabel>
                                <Toggle
                                    checked={requireManualPrice}
                                    onChange={(checked) => {
                                        setRequireManualPrice(checked);
                                        // Automatycznie wyzeruj cenę gdy checkbox jest zaznaczany
                                        if (checked) {
                                            setBasePriceNet(0);
                                        }
                                    }}
                                    label=""
                                />
                            </ToggleRow>

                            {!requireManualPrice && (
                                <>
                                    <PriceInput
                                        netAmount={basePriceNet}
                                        grossAmount={basePriceGross}
                                        vatRate={vatRate}
                                        onChange={(net, gross) => { setBasePriceNet(net); setBasePriceGross(gross); }}
                                        netLabel={t.services.form.priceNetLabel}
                                        grossLabel={t.services.form.priceGrossLabel}
                                        vatLabel={t.services.form.vatAmount}
                                        hasError={!!errors.basePriceNet}
                                    />
                                    {errors.basePriceNet && <ErrorMessage>{errors.basePriceNet}</ErrorMessage>}
                                </>
                            )}

                            <Divider />

                            <div>
                                <ToggleRow>
                                    <ToggleLabel>
                                        <ToggleLabelText>Wymagane dokumenty dla tej usługi</ToggleLabelText>
                                        <ToggleDescription>
                                            Gdy ta usługa zostanie dodana do wizyty, klient będzie musiał podpisać wybrane dokumenty
                                        </ToggleDescription>
                                    </ToggleLabel>
                                    <Toggle
                                        checked={showProtocolSection}
                                        onChange={setShowProtocolSection}
                                        label=""
                                    />
                                </ToggleRow>

                                {showProtocolSection && (
                                    <>
                                        <InfoBox>
                                            <InfoIcon />
                                            <div>
                                                Wybierz protokoły, które będą automatycznie dodawane do wizyt z tą usługą.
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
                                    </>
                                )}
                            </div>
                        </FormInner>
                    </ModalContent>

                    <ModalFooter>
                        <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                            {t.services.form.cancel}
                        </SharedButton>
                        <SharedButton $variant="primary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? t.services.form.submitting : t.services.form.submit}
                        </SharedButton>
                    </ModalFooter>
                </form>
            </ModalShell>

            <Toast $show={showToast}>
                {t.services.success.updated}
            </Toast>

            {pendingAffectedPackages && pendingAffectedPackages.length > 0 && (
                <ModalShell isOpen onClose={() => handleSyncPackages(false)} maxWidth="480px">
                    <ModalHeader>
                        <ModalTitleGroup>
                            <ModalTitle>Zaktualizować nazwy w pakietach?</ModalTitle>
                        </ModalTitleGroup>
                        <CloseBtn onClick={() => handleSyncPackages(false)} />
                    </ModalHeader>
                    <ModalContent>
                        <InfoBox>
                            <InfoIcon />
                            <div>
                                Zmieniono nazwę na <strong>„{updatedServiceName}"</strong>.
                                Usługa ta wchodzi w skład{' '}
                                {pendingAffectedPackages.length === 1 ? 'pakietu' : 'pakietów'}:{' '}
                                <strong>{pendingAffectedPackages.map(p => p.packageName).join(', ')}</strong>.
                                Czy zaktualizować nazwę w{' '}
                                {pendingAffectedPackages.length === 1 ? 'tym pakiecie' : 'tych pakietach'}?
                            </div>
                        </InfoBox>
                    </ModalContent>
                    <ModalFooter>
                        <SharedButton $variant="secondary" type="button" onClick={() => handleSyncPackages(false)}>
                            Nie, zostaw stare nazwy
                        </SharedButton>
                        <SharedButton $variant="primary" type="button" onClick={() => handleSyncPackages(true)}>
                            Tak, zaktualizuj
                        </SharedButton>
                    </ModalFooter>
                </ModalShell>
            )}
        </>
    );
};
