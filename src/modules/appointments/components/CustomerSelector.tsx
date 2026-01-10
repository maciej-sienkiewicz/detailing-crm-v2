import styled from 'styled-components';
import { UseFormReturn } from 'react-hook-form';
import type { AppointmentCreateRequest, Service } from '../types';
import { formatMoneyAmount } from '../hooks/usePriceCalculator';
import { useDebounce } from '@/common/hooks';
import { useState } from 'react';
import { useCustomerSearch, useCustomerVehicles } from '../hooks/useAppointmentForm';

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;
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

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const Select = styled.select`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const TextArea = styled.textarea`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-family: inherit;
    resize: vertical;
    min-height: 100px;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const ErrorMessage = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
`;

const ToggleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
`;

const ToggleSwitch = styled.label`
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
`;

const ToggleInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + span {
        background-color: ${props => props.theme.colors.primary};
    }

    &:checked + span:before {
        transform: translateX(24px);
    }
`;

const ToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.border};
    transition: ${props => props.theme.transitions.normal};
    border-radius: ${props => props.theme.radii.full};

    &:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: ${props => props.theme.transitions.normal};
        border-radius: 50%;
    }
`;

const ToggleLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const GridLayout = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const SearchResult = styled.div`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        border-color: ${props => props.theme.colors.primary};
    }
`;

const SearchResultName = styled.div`
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
`;

const SearchResultMeta = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

interface CustomerSelectorProps {
    form: UseFormReturn<AppointmentCreateRequest>;
}

export const CustomerSelector = ({ form }: CustomerSelectorProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);
    const { data: customers, isLoading } = useCustomerSearch(debouncedQuery);

    const customerMode = form.watch('customer.mode');

    return (
        <FormSection>
            <SectionHeader>
                <SectionTitle>Klient</SectionTitle>
            </SectionHeader>

            <ToggleContainer>
                <ToggleSwitch>
                    <ToggleInput
                        type="checkbox"
                        checked={customerMode === 'NEW'}
                        onChange={(e) => {
                            form.setValue('customer.mode', e.target.checked ? 'NEW' : 'EXISTING');
                            if (e.target.checked) {
                                form.setValue('customer.id', undefined);
                            } else {
                                form.setValue('customer.newData', undefined);
                            }
                        }}
                    />
                    <ToggleSlider />
                </ToggleSwitch>
                <ToggleLabel>Dodaj nowego klienta</ToggleLabel>
            </ToggleContainer>

            {customerMode === 'EXISTING' ? (
                <FieldGroup>
                    <Label>Szukaj klienta</Label>
                    <Input
                        type="text"
                        placeholder="Wprowadź imię, nazwisko lub email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isLoading && <SearchResultMeta>Wyszukiwanie...</SearchResultMeta>}
                    {customers && customers.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {customers.map((customer) => (
                                <SearchResult
                                    key={customer.id}
                                    onClick={() => {
                                        form.setValue('customer.id', customer.id);
                                        setSearchQuery(`${customer.firstName} ${customer.lastName}`);
                                    }}
                                >
                                    <SearchResultName>
                                        {customer.firstName} {customer.lastName}
                                    </SearchResultName>
                                    <SearchResultMeta>
                                        {customer.email} • {customer.phone}
                                    </SearchResultMeta>
                                </SearchResult>
                            ))}
                        </div>
                    )}
                    {form.formState.errors.customer?.id && (
                        <ErrorMessage>{form.formState.errors.customer.id.message}</ErrorMessage>
                    )}
                </FieldGroup>
            ) : (
                <GridLayout>
                    <FieldGroup>
                        <Label>Imię</Label>
                        <Input
                            {...form.register('customer.newData.firstName')}
                            placeholder="Jan"
                        />
                        {form.formState.errors.customer?.newData?.firstName && (
                            <ErrorMessage>{form.formState.errors.customer.newData.firstName.message}</ErrorMessage>
                        )}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Nazwisko</Label>
                        <Input
                            {...form.register('customer.newData.lastName')}
                            placeholder="Kowalski"
                        />
                        {form.formState.errors.customer?.newData?.lastName && (
                            <ErrorMessage>{form.formState.errors.customer.newData.lastName.message}</ErrorMessage>
                        )}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Telefon</Label>
                        <Input
                            {...form.register('customer.newData.phone')}
                            placeholder="+48 123 456 789"
                        />
                        {form.formState.errors.customer?.newData?.phone && (
                            <ErrorMessage>{form.formState.errors.customer.newData.phone.message}</ErrorMessage>
                        )}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Email</Label>
                        <Input
                            {...form.register('customer.newData.email')}
                            placeholder="jan.kowalski@example.com"
                        />
                        {form.formState.errors.customer?.newData?.email && (
                            <ErrorMessage>{form.formState.errors.customer.newData.email.message}</ErrorMessage>
                        )}
                    </FieldGroup>
                </GridLayout>
            )}
        </FormSection>
    );
};

interface VehicleSelectorProps {
    form: UseFormReturn<AppointmentCreateRequest>;
}

export const VehicleSelector = ({ form }: VehicleSelectorProps) => {
    const vehicleMode = form.watch('vehicle.mode');
    const customerMode = form.watch('customer.mode');
    const customerId = form.watch('customer.id');

    const { data: vehicles } = useCustomerVehicles(customerMode === 'EXISTING' ? customerId : undefined);

    return (
        <FormSection>
            <SectionHeader>
                <SectionTitle>Pojazd</SectionTitle>
            </SectionHeader>

            <FieldGroup>
                <Label>Tryb</Label>
                <Select
                    value={vehicleMode}
                    onChange={(e) => {
                        const mode = e.target.value as 'EXISTING' | 'NEW' | 'NONE';
                        form.setValue('vehicle.mode', mode);
                        form.setValue('vehicle.id', undefined);
                        form.setValue('vehicle.newData', undefined);
                    }}
                >
                    <option value="EXISTING">Istniejący pojazd</option>
                    <option value="NEW">Nowy pojazd</option>
                    <option value="NONE">Bez pojazdu</option>
                </Select>
            </FieldGroup>

            {vehicleMode === 'EXISTING' && (
                <FieldGroup>
                    <Label>Wybierz pojazd</Label>
                    <Select {...form.register('vehicle.id')}>
                        <option value="">Wybierz pojazd...</option>
                        {vehicles?.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                                {vehicle.brand} {vehicle.model} ({vehicle.year}) - {vehicle.licensePlate}
                            </option>
                        ))}
                    </Select>
                    {form.formState.errors.vehicle?.id && (
                        <ErrorMessage>{form.formState.errors.vehicle.id.message}</ErrorMessage>
                    )}
                </FieldGroup>
            )}

            {vehicleMode === 'NEW' && (
                <GridLayout>
                    <FieldGroup>
                        <Label>Marka</Label>
                        <Input
                            {...form.register('vehicle.newData.brand')}
                            placeholder="Audi"
                        />
                        {form.formState.errors.vehicle?.newData?.brand && (
                            <ErrorMessage>{form.formState.errors.vehicle.newData.brand.message}</ErrorMessage>
                        )}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Model</Label>
                        <Input
                            {...form.register('vehicle.newData.model')}
                            placeholder="A5"
                        />
                        {form.formState.errors.vehicle?.newData?.model && (
                            <ErrorMessage>{form.formState.errors.vehicle.newData.model.message}</ErrorMessage>
                        )}
                    </FieldGroup>
                </GridLayout>
            )}
        </FormSection>
    );
};

interface ServiceSelectorProps {
    form: UseFormReturn<AppointmentCreateRequest>;
    services: Service[];
}

export const ServiceSelector = ({ form, services }: ServiceSelectorProps) => {
    const selectedServiceId = form.watch('service.id');
    const selectedService = services.find(s => s.id === selectedServiceId);

    return (
        <FormSection>
            <SectionHeader>
                <SectionTitle>Usługa</SectionTitle>
            </SectionHeader>

            <FieldGroup>
                <Label>Wybierz usługę</Label>
                <Select
                    {...form.register('service.id')}
                    onChange={(e) => {
                        const service = services.find(s => s.id === e.target.value);
                        if (service) {
                            form.setValue('service.id', service.id);
                            form.setValue('service.basePriceNet', service.basePriceNet);
                            form.setValue('service.vatRate', service.vatRate);
                        }
                    }}
                >
                    <option value="">Wybierz usługę...</option>
                    {services.map((service) => (
                        <option key={service.id} value={service.id}>
                            {service.name} - {formatMoneyAmount(service.basePriceNet)} PLN netto
                        </option>
                    ))}
                </Select>
                {form.formState.errors.service?.id && (
                    <ErrorMessage>{form.formState.errors.service.id.message}</ErrorMessage>
                )}
            </FieldGroup>

            {selectedService && (
                <>
                    <GridLayout>
                        <FieldGroup>
                            <Label>Typ korekty</Label>
                            <Select {...form.register('service.adjustment.type')}>
                                <option value="PERCENT">Procent (%)</option>
                                <option value="FIXED_NET">Stała kwota netto</option>
                                <option value="FIXED_GROSS">Stała kwota brutto</option>
                                <option value="SET_NET">Ustaw cenę netto</option>
                                <option value="SET_GROSS">Ustaw cenę brutto</option>
                            </Select>
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Wartość korekty</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register('service.adjustment.value', { valueAsNumber: true })}
                                placeholder="0.00"
                            />
                        </FieldGroup>
                    </GridLayout>

                    <FieldGroup>
                        <Label>Notatka (opcjonalnie)</Label>
                        <TextArea
                            {...form.register('service.note')}
                            placeholder="Dodatkowe informacje..."
                        />
                        {form.formState.errors.service?.note && (
                            <ErrorMessage>{form.formState.errors.service.note.message}</ErrorMessage>
                        )}
                    </FieldGroup>
                </>
            )}
        </FormSection>
    );
};

interface ScheduleSelectorProps {
    form: UseFormReturn<AppointmentCreateRequest>;
}

export const ScheduleSelector = ({ form }: ScheduleSelectorProps) => {
    const isAllDay = form.watch('schedule.isAllDay');

    return (
        <FormSection>
            <SectionHeader>
                <SectionTitle>Harmonogram</SectionTitle>
            </SectionHeader>

            <ToggleContainer>
                <ToggleSwitch>
                    <ToggleInput
                        type="checkbox"
                        {...form.register('schedule.isAllDay')}
                        onChange={(e) => {
                            form.setValue('schedule.isAllDay', e.target.checked);
                            if (e.target.checked) {
                                const start = form.getValues('schedule.startDateTime');
                                if (start) {
                                    const date = start.split('T')[0];
                                    form.setValue('schedule.endDateTime', `${date}T23:59:59`);
                                }
                            }
                        }}
                    />
                    <ToggleSlider />
                </ToggleSwitch>
                <ToggleLabel>Cały dzień</ToggleLabel>
            </ToggleContainer>

            <GridLayout>
                <FieldGroup>
                    <Label>Data rozpoczęcia</Label>
                    <Input
                        type={isAllDay ? 'date' : 'datetime-local'}
                        {...form.register('schedule.startDateTime')}
                    />
                    {form.formState.errors.schedule?.startDateTime && (
                        <ErrorMessage>{form.formState.errors.schedule.startDateTime.message}</ErrorMessage>
                    )}
                </FieldGroup>

                {!isAllDay && (
                    <FieldGroup>
                        <Label>Data zakończenia</Label>
                        <Input
                            type="datetime-local"
                            {...form.register('schedule.endDateTime')}
                        />
                        {form.formState.errors.schedule?.endDateTime && (
                            <ErrorMessage>{form.formState.errors.schedule.endDateTime.message}</ErrorMessage>
                        )}
                    </FieldGroup>
                )}
            </GridLayout>
        </FormSection>
    );
};