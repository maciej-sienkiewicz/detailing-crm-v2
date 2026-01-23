import { useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import type { CreateCustomerFormData } from '../utils/customerValidation';
import { t } from '@/common/i18n';
import { PhoneInputField } from '@/common/components/PhoneInputField';

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }
`;

const FormSection = styled.fieldset`
    border: none;
    padding: 0;
    margin: 0 0 32px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
`;

const SectionIcon = styled.div<{ $color?: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: ${props => props.$color || 'var(--brand-primary)'};
    border-radius: 12px;
    
    svg {
        width: 20px;
        height: 20px;
        color: white;
    }
`;

const SectionTitleGroup = styled.div`
    flex: 1;
`;

const SectionTitle = styled.legend`
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
`;

const SectionSubtitle = styled.p`
    margin: 2px 0 0;
    font-size: 13px;
    color: #64748b;
`;

const FormField = styled.div<{ $fullWidth?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;

    ${props => props.$fullWidth && `
        @media (min-width: ${props.theme.breakpoints.sm}) {
            grid-column: span 2;
        }
    `}
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    letter-spacing: -0.01em;
`;

const InputWrapper = styled.div<{ $hasError?: boolean; $isFocused?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border: 1.5px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 10px;
    transition: all 0.2s ease;
    
    &:hover {
        border-color: ${props => props.$hasError ? '#ef4444' : '#cbd5e1'};
    }
    
    &:focus-within {
        border-color: ${props => props.$hasError ? '#ef4444' : 'var(--brand-primary)'};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    background: transparent;
    color: #0f172a;
    
    &:focus {
        outline: none;
    }
    
    &::placeholder {
        color: #94a3b8;
    }
`;

const TextAreaWrapper = styled(InputWrapper)`
    align-items: flex-start;
`;

const TextArea = styled.textarea`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    background: transparent;
    color: #0f172a;
    min-height: 100px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;

    &:focus {
        outline: none;
    }

    &::placeholder {
        color: #94a3b8;
    }
`;

const ErrorMessage = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
    
    svg {
        width: 14px;
        height: 14px;
    }
`;

const ToggleCard = styled.label<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: ${props => props.$isActive ? 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)' : '#f8fafc'};
    border: 1.5px solid ${props => props.$isActive ? 'var(--brand-primary)' : '#e2e8f0'};
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-column: span 2;
    }

    &:hover {
        border-color: ${props => props.$isActive ? 'var(--brand-primary)' : '#cbd5e1'};
        background: ${props => props.$isActive ? 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)' : '#f1f5f9'};
    }
`;

const ToggleSwitch = styled.div<{ $isActive?: boolean }>`
    position: relative;
    width: 44px;
    height: 24px;
    background: ${props => props.$isActive ? 'var(--brand-primary)' : '#cbd5e1'};
    border-radius: 12px;
    transition: all 0.2s ease;
    flex-shrink: 0;
    
    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${props => props.$isActive ? '22px' : '2px'};
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    }
`;

const ToggleContent = styled.div`
    flex: 1;
`;

const ToggleTitle = styled.span`
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const ToggleDescription = styled.span`
    display: block;
    font-size: 13px;
    color: #64748b;
    margin-top: 2px;
`;

const HiddenCheckbox = styled.input`
    position: absolute;
    opacity: 0;
    pointer-events: none;
`;

const ExpandableSection = styled.div<{ $isExpanded: boolean }>`
    display: grid;
    grid-template-rows: ${props => props.$isExpanded ? '1fr' : '0fr'};
    transition: grid-template-rows 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    margin-top: ${props => props.$isExpanded ? '20px' : '0'};
`;

const ExpandableContent = styled.div`
    overflow: hidden;
`;

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const HomeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
);

const BuildingIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01" />
        <path d="M16 6h.01" />
        <path d="M12 6h.01" />
        <path d="M12 10h.01" />
        <path d="M12 14h.01" />
        <path d="M16 10h.01" />
        <path d="M16 14h.01" />
        <path d="M8 10h.01" />
        <path d="M8 14h.01" />
    </svg>
);

const NotesIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
    </svg>
);

const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

interface CustomerFormProps {
    includeCompany: boolean;
    onIncludeCompanyChange: (value: boolean) => void;
    includeHomeAddress: boolean;
    onIncludeHomeAddressChange: (value: boolean) => void;
}

export const CustomerForm = ({
                                 includeCompany,
                                 onIncludeCompanyChange,
                                 includeHomeAddress,
                                 onIncludeHomeAddressChange,
                             }: CustomerFormProps) => {
    const {
        register,
        formState: { errors },
    } = useFormContext<CreateCustomerFormData>();

    return (
        <>
            <FormSection>
                <SectionHeader>
                    <SectionIcon $color="#6366f1">
                        <UserIcon />
                    </SectionIcon>
                    <SectionTitleGroup>
                        <SectionTitle>{t.customers.form.personalInfo}</SectionTitle>
                        <SectionSubtitle>Podstawowe dane kontaktowe klienta</SectionSubtitle>
                    </SectionTitleGroup>
                </SectionHeader>

                <FormGrid>
                    <FormField>
                        <Label htmlFor="firstName">{t.customers.form.firstName}</Label>
                        <InputWrapper $hasError={!!errors.firstName}>
                            <Input
                                id="firstName"
                                {...register('firstName')}
                                placeholder={t.customers.form.firstNamePlaceholder}
                            />
                        </InputWrapper>
                        {errors.firstName && (
                            <ErrorMessage>
                                <ErrorIcon />
                                {errors.firstName.message}
                            </ErrorMessage>
                        )}
                    </FormField>

                    <FormField>
                        <Label htmlFor="lastName">{t.customers.form.lastName}</Label>
                        <InputWrapper $hasError={!!errors.lastName}>
                            <Input
                                id="lastName"
                                {...register('lastName')}
                                placeholder={t.customers.form.lastNamePlaceholder}
                            />
                        </InputWrapper>
                        {errors.lastName && (
                            <ErrorMessage>
                                <ErrorIcon />
                                {errors.lastName.message}
                            </ErrorMessage>
                        )}
                    </FormField>

                    <FormField>
                        <Label htmlFor="email">{t.customers.form.email}</Label>
                        <InputWrapper $hasError={!!errors.email}>
                            <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                placeholder={t.customers.form.emailPlaceholder}
                            />
                        </InputWrapper>
                        {errors.email && (
                            <ErrorMessage>
                                <ErrorIcon />
                                {errors.email.message}
                            </ErrorMessage>
                        )}
                    </FormField>

                    <FormField>
                        <Label htmlFor="phone">{t.customers.form.phone}</Label>
                        <PhoneInputField
                            name="phone"
                            id="phone"
                            placeholder={t.customers.form.phonePlaceholder}
                        />
                    </FormField>
                </FormGrid>
            </FormSection>

            <FormSection>
                <ToggleCard $isActive={includeHomeAddress}>
                    <HiddenCheckbox
                        type="checkbox"
                        checked={includeHomeAddress}
                        onChange={e => onIncludeHomeAddressChange(e.target.checked)}
                    />
                    <ToggleSwitch $isActive={includeHomeAddress} />
                    <ToggleContent>
                        <ToggleTitle>{t.customers.form.includeHomeAddress}</ToggleTitle>
                        <ToggleDescription>Adres zamieszkania do korespondencji</ToggleDescription>
                    </ToggleContent>
                </ToggleCard>

                <ExpandableSection $isExpanded={includeHomeAddress}>
                    <ExpandableContent>
                        <SectionHeader>
                            <SectionIcon $color="#10b981">
                                <HomeIcon />
                            </SectionIcon>
                            <SectionTitleGroup>
                                <SectionTitle>{t.customers.form.homeAddress.title}</SectionTitle>
                                <SectionSubtitle>Dane adresowe klienta</SectionSubtitle>
                            </SectionTitleGroup>
                        </SectionHeader>

                        <FormGrid>
                            <FormField $fullWidth>
                                <Label htmlFor="homeAddress.street">{t.customers.form.homeAddress.street}</Label>
                                <InputWrapper $hasError={!!errors.homeAddress?.street}>
                                    <Input
                                        id="homeAddress.street"
                                        {...register('homeAddress.street')}
                                        placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.homeAddress?.street && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.homeAddress.street.message}
                                    </ErrorMessage>
                                )}
                            </FormField>
                            <FormField>
                                <Label htmlFor="homeAddress.city">{t.customers.form.homeAddress.city}</Label>
                                <InputWrapper $hasError={!!errors.homeAddress?.city}>
                                    <Input
                                        id="homeAddress.city"
                                        {...register('homeAddress.city')}
                                        placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.homeAddress?.city && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.homeAddress.city.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="homeAddress.postalCode">{t.customers.form.homeAddress.postalCode}</Label>
                                <InputWrapper $hasError={!!errors.homeAddress?.postalCode}>
                                    <Input
                                        id="homeAddress.postalCode"
                                        {...register('homeAddress.postalCode')}
                                        placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                    />
                                </InputWrapper>
                                {errors.homeAddress?.postalCode && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.homeAddress.postalCode.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="homeAddress.country">{t.customers.form.homeAddress.country}</Label>
                                <InputWrapper $hasError={!!errors.homeAddress?.country}>
                                    <Input
                                        id="homeAddress.country"
                                        {...register('homeAddress.country')}
                                        placeholder={t.customers.form.homeAddress.countryPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.homeAddress?.country && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.homeAddress.country.message}
                                    </ErrorMessage>
                                )}
                            </FormField>
                        </FormGrid>
                    </ExpandableContent>
                </ExpandableSection>
            </FormSection>

            <FormSection>
                <ToggleCard $isActive={includeCompany}>
                    <HiddenCheckbox
                        type="checkbox"
                        checked={includeCompany}
                        onChange={e => onIncludeCompanyChange(e.target.checked)}
                    />
                    <ToggleSwitch $isActive={includeCompany} />
                    <ToggleContent>
                        <ToggleTitle>{t.customers.form.includeCompany}</ToggleTitle>
                        <ToggleDescription>Dane firmy do faktur i dokumentów</ToggleDescription>
                    </ToggleContent>
                </ToggleCard>

                <ExpandableSection $isExpanded={includeCompany}>
                    <ExpandableContent>
                        <SectionHeader>
                            <SectionIcon $color="#f59e0b">
                                <BuildingIcon />
                            </SectionIcon>
                            <SectionTitleGroup>
                                <SectionTitle>{t.customers.form.company.title}</SectionTitle>
                                <SectionSubtitle>Dane rejestrowe firmy</SectionSubtitle>
                            </SectionTitleGroup>
                        </SectionHeader>

                        <FormGrid>
                            <FormField $fullWidth>
                                <Label htmlFor="company.name">{t.customers.form.company.name}</Label>
                                <InputWrapper $hasError={!!errors.company?.name}>
                                    <Input
                                        id="company.name"
                                        {...register('company.name')}
                                        placeholder={t.customers.form.company.namePlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.name && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.name.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="company.nip">{t.customers.form.company.nip}</Label>
                                <InputWrapper $hasError={!!errors.company?.nip}>
                                    <Input
                                        id="company.nip"
                                        {...register('company.nip')}
                                        placeholder={t.customers.form.company.nipPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.nip && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.nip.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="company.regon">{t.customers.form.company.regon}</Label>
                                <InputWrapper $hasError={!!errors.company?.regon}>
                                    <Input
                                        id="company.regon"
                                        {...register('company.regon')}
                                        placeholder={t.customers.form.company.regonPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.regon && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.regon.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField $fullWidth>
                                <Label htmlFor="company.address.street">{t.customers.form.company.street}</Label>
                                <InputWrapper $hasError={!!errors.company?.address?.street}>
                                    <Input
                                        id="company.address.street"
                                        {...register('company.address.street')}
                                        placeholder={t.customers.form.company.streetPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.address?.street && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.address.street.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="company.address.city">{t.customers.form.company.city}</Label>
                                <InputWrapper $hasError={!!errors.company?.address?.city}>
                                    <Input
                                        id="company.address.city"
                                        {...register('company.address.city')}
                                        placeholder={t.customers.form.company.cityPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.address?.city && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.address.city.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="company.address.postalCode">{t.customers.form.company.postalCode}</Label>
                                <InputWrapper $hasError={!!errors.company?.address?.postalCode}>
                                    <Input
                                        id="company.address.postalCode"
                                        {...register('company.address.postalCode')}
                                        placeholder={t.customers.form.company.postalCodePlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.address?.postalCode && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.address.postalCode.message}
                                    </ErrorMessage>
                                )}
                            </FormField>

                            <FormField>
                                <Label htmlFor="company.address.country">{t.customers.form.company.country}</Label>
                                <InputWrapper $hasError={!!errors.company?.address?.country}>
                                    <Input
                                        id="company.address.country"
                                        {...register('company.address.country')}
                                        placeholder={t.customers.form.company.countryPlaceholder}
                                    />
                                </InputWrapper>
                                {errors.company?.address?.country && (
                                    <ErrorMessage>
                                        <ErrorIcon />
                                        {errors.company.address.country.message}
                                    </ErrorMessage>
                                )}
                            </FormField>
                        </FormGrid>
                    </ExpandableContent>
                </ExpandableSection>
            </FormSection>

            <FormSection>
                <SectionHeader>
                    <SectionIcon $color="#8b5cf6">
                        <NotesIcon />
                    </SectionIcon>
                    <SectionTitleGroup>
                        <SectionTitle>{t.customers.form.notes.title}</SectionTitle>
                        <SectionSubtitle>Dodatkowe uwagi i informacje</SectionSubtitle>
                    </SectionTitleGroup>
                </SectionHeader>

                <FormGrid>
                    <FormField $fullWidth>
                        <Label htmlFor="notes">{t.customers.form.notes.label}</Label>
                        <TextAreaWrapper $hasError={!!errors.notes}>
                            <TextArea
                                id="notes"
                                {...register('notes')}
                                placeholder={t.customers.form.notes.placeholder}
                            />
                        </TextAreaWrapper>
                        {errors.notes && (
                            <ErrorMessage>
                                <ErrorIcon />
                                {errors.notes.message}
                            </ErrorMessage>
                        )}
                    </FormField>
                </FormGrid>
            </FormSection>
        </>
    );
};