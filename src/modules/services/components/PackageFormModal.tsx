// src/modules/services/components/PackageFormModal.tsx
import { useState, useEffect, useRef } from 'react';
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
import { PriceInput } from './PriceInput';
import { Toggle } from '@/common/components/Toggle';
import { useCreatePackage, useUpdatePackage } from '../hooks/useServices';
import { useServices } from '../hooks/useServices';
import { t } from '@/common/i18n';
import type { Service, VatRate } from '../types';

const FormInner = styled.div`
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

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.md};
    background: rgb(249, 250, 251);
    border-radius: ${props => props.theme.radii.md};
    margin-bottom: ${props => props.theme.spacing.md};
`;

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

const ServiceSearchInput = styled(Input)`
    width: 100%;
`;

const ServicePickerContainer = styled.div`
    position: relative;
`;

const ServiceDropdown = styled.div`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10);
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
`;

const ServiceOption = styled.div`
    padding: 8px 12px;
    font-size: ${props => props.theme.fontSizes.sm};
    cursor: pointer;
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child { border-bottom: none; }
    &:hover { background: ${props => props.theme.colors.surfaceHover}; }
`;

const SelectedServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    margin-top: ${props => props.theme.spacing.sm};
`;

const SelectedServiceItem = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: rgb(239, 246, 255);
    border: 1px solid rgb(191, 219, 254);
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const PositionNumber = styled.span`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgb(37, 99, 235);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
`;

const SelectedServiceName = styled.span`
    flex: 1;
    color: ${props => props.theme.colors.text};
`;

const RemoveBtn = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: ${props => props.theme.colors.textMuted};
    line-height: 1;
    font-size: 16px;
    flex-shrink: 0;
    transition: color 150ms ease;
    &:hover { color: ${props => props.theme.colors.error}; }
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: rgb(254, 249, 230);
    border: 1px solid rgb(253, 230, 138);
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    color: rgb(120, 53, 15);
`;

interface PackageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    package?: Service;
    onSuccess?: () => void;
}

export const PackageFormModal = ({ isOpen, onClose, package: pkg, onSuccess }: PackageFormModalProps) => {
    const [name, setName] = useState('');
    const [basePriceNet, setBasePriceNet] = useState(0);
    const [vatRate, setVatRate] = useState<VatRate>(23);
    const [requireManualPrice, setRequireManualPrice] = useState(false);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    const createMutation = useCreatePackage();
    const updateMutation = useUpdatePackage();

    const { services: allServices } = useServices({
        search: serviceSearch,
        page: 1,
        limit: 50,
        showInactive: false,
    });

    // Only non-package, active services available for selection
    const availableServices = allServices.filter(
        s => !s.isPackage && !selectedServices.some(sel => sel.id === s.id)
    );

    useEffect(() => {
        if (isOpen) {
            if (pkg) {
                setName(pkg.name);
                setBasePriceNet(pkg.basePriceNet);
                setVatRate(pkg.vatRate);
                setRequireManualPrice(pkg.requireManualPrice);
                // Reconstruct selected from packageItems — we need Service objects;
                // use id + name from snapshot (price/vat not critical for display)
                const preselected: Service[] = (pkg.packageItems || []).map(item => ({
                    id: item.serviceId,
                    name: item.serviceName,
                    basePriceNet: 0,
                    vatRate: 23,
                    requireManualPrice: false,
                    isActive: true,
                    isPackage: false,
                    packageItems: null,
                    createdAt: '',
                    updatedAt: '',
                    createdByFirstName: '',
                    createdByLastName: '',
                    updatedBy: '',
                    replacesServiceId: null,
                }));
                setSelectedServices(preselected);
            } else {
                setName('');
                setBasePriceNet(0);
                setVatRate(23);
                setRequireManualPrice(false);
                setSelectedServices([]);
            }
            setServiceSearch('');
            setErrors({});
        }
    }, [isOpen, pkg]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Nazwa jest wymagana';
        if (!requireManualPrice && basePriceNet <= 0) errs.basePriceNet = 'Cena musi być większa od 0';
        if (selectedServices.length < 2) errs.services = 'Pakiet musi zawierać co najmniej 2 usługi';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const serviceIds = selectedServices.map(s => s.id);

        try {
            if (pkg) {
                await updateMutation.mutateAsync({
                    originalPackageId: pkg.id,
                    name,
                    basePriceNet,
                    vatRate,
                    requireManualPrice,
                    serviceIds,
                });
            } else {
                await createMutation.mutateAsync({
                    name,
                    basePriceNet,
                    vatRate,
                    requireManualPrice,
                    serviceIds,
                });
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to save package:', err);
        }
    };

    const addService = (svc: Service) => {
        setSelectedServices(prev => [...prev, svc]);
        setServiceSearch('');
        setIsDropdownOpen(false);
    };

    const removeService = (id: string) => {
        setSelectedServices(prev => prev.filter(s => s.id !== id));
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="600px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>
                        {pkg ? 'Edytuj pakiet' : 'Utwórz pakiet'}
                    </ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <form onSubmit={handleSubmit}>
                <ModalContent>
                    <FormInner>
                        <div>
                            <SectionTitle>Dane pakietu</SectionTitle>

                            <FieldGroup>
                                <Label htmlFor="pkg-name">Nazwa pakietu</Label>
                                <Input
                                    id="pkg-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="np. Pakiet Premium"
                                />
                                {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                            </FieldGroup>

                            <FieldGroup>
                                <Label htmlFor="pkg-vatRate">{t.services.form.vatLabel}</Label>
                                <Select
                                    id="pkg-vatRate"
                                    value={vatRate}
                                    onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
                                >
                                    <option value={23}>{t.services.vatRates[23]}</option>
                                    <option value={8}>{t.services.vatRates[8]}</option>
                                    <option value={5}>{t.services.vatRates[5]}</option>
                                    <option value={0}>{t.services.vatRates[0]}</option>
                                    <option value={-1}>{t.services.vatRates['-1']}</option>
                                </Select>
                            </FieldGroup>

                            <ToggleRow>
                                <div>
                                    <ToggleLabelText>{t.services.form.requireManualPriceLabel}</ToggleLabelText>
                                    <ToggleDescription>{t.services.form.requireManualPriceDescription}</ToggleDescription>
                                </div>
                                <Toggle
                                    checked={requireManualPrice}
                                    onChange={(checked) => {
                                        setRequireManualPrice(checked);
                                        if (checked) setBasePriceNet(0);
                                    }}
                                    label=""
                                />
                            </ToggleRow>

                            {!requireManualPrice && (
                                <>
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
                                </>
                            )}
                        </div>

                        <div>
                            <SectionTitle>Usługi wchodzące w skład pakietu</SectionTitle>

                            <InfoBox>
                                Pakiet musi zawierać co najmniej 2 usługi. Cena pakietu jest ustawiana całościowo — poszczególne usługi nie mają własnych cen w kontekście pakietu.
                            </InfoBox>

                            <FieldGroup style={{ marginTop: '12px' }}>
                                <Label>Dodaj usługę do pakietu</Label>
                                <ServicePickerContainer ref={dropdownRef}>
                                    <ServiceSearchInput
                                        type="text"
                                        placeholder="Wpisz nazwę usługi..."
                                        value={serviceSearch}
                                        onChange={(e) => {
                                            setServiceSearch(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                    />
                                    {isDropdownOpen && availableServices.length > 0 && (
                                        <ServiceDropdown>
                                            {availableServices.map(svc => (
                                                <ServiceOption
                                                    key={svc.id}
                                                    onMouseDown={() => addService(svc)}
                                                >
                                                    {svc.name}
                                                </ServiceOption>
                                            ))}
                                        </ServiceDropdown>
                                    )}
                                </ServicePickerContainer>
                                {errors.services && <ErrorMessage>{errors.services}</ErrorMessage>}
                            </FieldGroup>

                            {selectedServices.length > 0 && (
                                <SelectedServicesList>
                                    {selectedServices.map((svc, index) => (
                                        <SelectedServiceItem key={svc.id}>
                                            <PositionNumber>{index + 1}</PositionNumber>
                                            <SelectedServiceName>{svc.name}</SelectedServiceName>
                                            <RemoveBtn
                                                type="button"
                                                onClick={() => removeService(svc.id)}
                                                title="Usuń z pakietu"
                                            >
                                                ×
                                            </RemoveBtn>
                                        </SelectedServiceItem>
                                    ))}
                                </SelectedServicesList>
                            )}
                        </div>
                    </FormInner>
                </ModalContent>

                <ModalFooter>
                    <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                        {t.services.form.cancel}
                    </SharedButton>
                    <SharedButton $variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t.services.form.submitting : (pkg ? 'Zapisz pakiet' : 'Utwórz pakiet')}
                    </SharedButton>
                </ModalFooter>
            </form>
        </ModalShell>
    );
};
