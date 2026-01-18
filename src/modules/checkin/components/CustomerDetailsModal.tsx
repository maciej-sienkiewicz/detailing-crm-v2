import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { FormGrid, FieldGroup, Label, Input } from '@/common/components/Form';
import { Button } from '@/common/components/Button';
import { Toggle } from '@/common/components/Toggle';
import { t } from '@/common/i18n';
import { useCustomerDetail } from '@/modules/customers/hooks/useCustomerDetail';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h4`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: ${props => props.theme.spacing.md} 0;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: ${props => props.theme.colors.primary};
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    justify-content: flex-end;
    margin-top: ${props => props.theme.spacing.lg};
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
`;

interface CustomerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string | null;
    fallbackData?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        homeAddress: {
            street: string;
            city: string;
            postalCode: string;
            country: string;
        } | null;
        company: {
            name: string;
            nip: string;
            regon: string;
            address: {
                street: string;
                city: string;
                postalCode: string;
                country: string;
            };
        } | null;
    };
    onSave: (data: {
        customerData: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
        };
        homeAddress: {
            street: string;
            city: string;
            postalCode: string;
            country: string;
        } | null;
        company: {
            name: string;
            nip: string;
            regon: string;
            address: {
                street: string;
                city: string;
                postalCode: string;
                country: string;
            };
        } | null;
    }) => void;
}

export const CustomerDetailsModal = ({
    isOpen,
    onClose,
    customerId,
    fallbackData,
    onSave,
}: CustomerDetailsModalProps) => {
    // Pobierz dane z API jeśli customerId istnieje
    const { customerDetail, isLoading } = useCustomerDetail(customerId || '');

    const [includeHomeAddress, setIncludeHomeAddress] = useState(false);
    const [includeCompany, setIncludeCompany] = useState(false);

    const [localCustomerData, setLocalCustomerData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });

    const [localHomeAddress, setLocalHomeAddress] = useState({
        street: '',
        city: '',
        postalCode: '',
        country: 'Polska',
    });

    const [localCompany, setLocalCompany] = useState({
        name: '',
        nip: '',
        regon: '',
        address: {
            street: '',
            city: '',
            postalCode: '',
            country: 'Polska',
        },
    });

    // Inicjalizuj dane gdy modal się otwiera
    useEffect(() => {
        if (!isOpen) return;

        if (customerDetail) {
            const { customer } = customerDetail;
            // Użyj danych z API
            setLocalCustomerData({
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.contact.email,
                phone: customer.contact.phone,
            });

            if (customer.homeAddress) {
                setIncludeHomeAddress(true);
                setLocalHomeAddress(customer.homeAddress);
            } else {
                setIncludeHomeAddress(false);
                setLocalHomeAddress({
                    street: '',
                    city: '',
                    postalCode: '',
                    country: 'Polska',
                });
            }

            if (customer.company) {
                setIncludeCompany(true);
                setLocalCompany({
                    ...customer.company,
                    regon: customer.company.regon || '',
                });
            } else {
                setIncludeCompany(false);
                setLocalCompany({
                    name: '',
                    nip: '',
                    regon: '',
                    address: {
                        street: '',
                        city: '',
                        postalCode: '',
                        country: 'Polska',
                    },
                });
            }
        } else if (fallbackData) {
            // Użyj danych fallback dla nowo dodanych klientów
            setLocalCustomerData({
                firstName: fallbackData.firstName,
                lastName: fallbackData.lastName,
                email: fallbackData.email,
                phone: fallbackData.phone,
            });

            if (fallbackData.homeAddress) {
                setIncludeHomeAddress(true);
                setLocalHomeAddress(fallbackData.homeAddress);
            } else {
                setIncludeHomeAddress(false);
                setLocalHomeAddress({
                    street: '',
                    city: '',
                    postalCode: '',
                    country: 'Polska',
                });
            }

            if (fallbackData.company) {
                setIncludeCompany(true);
                setLocalCompany(fallbackData.company);
            } else {
                setIncludeCompany(false);
                setLocalCompany({
                    name: '',
                    nip: '',
                    regon: '',
                    address: {
                        street: '',
                        city: '',
                        postalCode: '',
                        country: 'Polska',
                    },
                });
            }
        }
    }, [isOpen, customerDetail, fallbackData]);

    const handleCustomerDataChange = (field: string, value: string) => {
        setLocalCustomerData(prev => ({ ...prev, [field]: value }));
    };

    const handleHomeAddressChange = (field: string, value: string) => {
        setLocalHomeAddress(prev => ({ ...prev, [field]: value }));
    };

    const handleCompanyChange = (field: string, value: string) => {
        setLocalCompany(prev => ({ ...prev, [field]: value }));
    };

    const handleCompanyAddressChange = (field: string, value: string) => {
        setLocalCompany(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value },
        }));
    };

    const handleSave = () => {
        onSave({
            customerData: localCustomerData,
            homeAddress: includeHomeAddress ? localHomeAddress : null,
            company: includeCompany ? localCompany : null,
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edytuj dane klienta" maxWidth="800px">
            {isLoading ? (
                <LoadingContainer>
                    Ładowanie danych klienta...
                </LoadingContainer>
            ) : (
                <ModalContent>
                    <SectionTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.customers.form.title}
                    </SectionTitle>

                <FormGrid>
                    <FieldGroup>
                        <Label>{t.customers.form.firstName}</Label>
                        <Input
                            value={localCustomerData.firstName}
                            onChange={(e) => handleCustomerDataChange('firstName', e.target.value)}
                            placeholder={t.customers.form.firstNamePlaceholder}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.customers.form.lastName}</Label>
                        <Input
                            value={localCustomerData.lastName}
                            onChange={(e) => handleCustomerDataChange('lastName', e.target.value)}
                            placeholder={t.customers.form.lastNamePlaceholder}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.customers.form.email}</Label>
                        <Input
                            value={localCustomerData.email}
                            onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                            placeholder={t.customers.form.emailPlaceholder}
                            type="email"
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label>{t.customers.form.phone}</Label>
                        <Input
                            value={localCustomerData.phone}
                            onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                            placeholder={t.customers.form.phonePlaceholder}
                            type="tel"
                        />
                    </FieldGroup>
                </FormGrid>

                <Toggle
                    checked={includeHomeAddress}
                    onChange={setIncludeHomeAddress}
                    label={t.customers.form.includeHomeAddress}
                />

                {includeHomeAddress && (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {t.customers.form.homeAddress.title}
                        </SectionTitle>

                        <FormGrid>
                            <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>{t.customers.form.homeAddress.street}</Label>
                                <Input
                                    value={localHomeAddress.street}
                                    onChange={(e) => handleHomeAddressChange('street', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.streetPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.homeAddress.city}</Label>
                                <Input
                                    value={localHomeAddress.city}
                                    onChange={(e) => handleHomeAddressChange('city', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.cityPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.homeAddress.postalCode}</Label>
                                <Input
                                    value={localHomeAddress.postalCode}
                                    onChange={(e) => handleHomeAddressChange('postalCode', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.postalCodePlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.homeAddress.country}</Label>
                                <Input
                                    value={localHomeAddress.country}
                                    onChange={(e) => handleHomeAddressChange('country', e.target.value)}
                                    placeholder={t.customers.form.homeAddress.countryPlaceholder}
                                />
                            </FieldGroup>
                        </FormGrid>
                    </>
                )}

                <Toggle
                    checked={includeCompany}
                    onChange={setIncludeCompany}
                    label={t.customers.form.includeCompany}
                />

                {includeCompany && (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {t.customers.form.company.title}
                        </SectionTitle>

                        <FormGrid>
                            <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>{t.customers.form.company.name}</Label>
                                <Input
                                    value={localCompany.name}
                                    onChange={(e) => handleCompanyChange('name', e.target.value)}
                                    placeholder={t.customers.form.company.namePlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.nip}</Label>
                                <Input
                                    value={localCompany.nip}
                                    onChange={(e) => handleCompanyChange('nip', e.target.value)}
                                    placeholder={t.customers.form.company.nipPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.regon}</Label>
                                <Input
                                    value={localCompany.regon}
                                    onChange={(e) => handleCompanyChange('regon', e.target.value)}
                                    placeholder={t.customers.form.company.regonPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                <Label>{t.customers.form.company.street}</Label>
                                <Input
                                    value={localCompany.address.street}
                                    onChange={(e) => handleCompanyAddressChange('street', e.target.value)}
                                    placeholder={t.customers.form.company.streetPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.city}</Label>
                                <Input
                                    value={localCompany.address.city}
                                    onChange={(e) => handleCompanyAddressChange('city', e.target.value)}
                                    placeholder={t.customers.form.company.cityPlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.postalCode}</Label>
                                <Input
                                    value={localCompany.address.postalCode}
                                    onChange={(e) => handleCompanyAddressChange('postalCode', e.target.value)}
                                    placeholder={t.customers.form.company.postalCodePlaceholder}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.customers.form.company.country}</Label>
                                <Input
                                    value={localCompany.address.country}
                                    onChange={(e) => handleCompanyAddressChange('country', e.target.value)}
                                    placeholder={t.customers.form.company.countryPlaceholder}
                                />
                            </FieldGroup>
                        </FormGrid>
                    </>
                )}

                    <ButtonGroup>
                        <Button $variant="secondary" onClick={onClose}>
                            Anuluj
                        </Button>
                        <Button $variant="primary" onClick={handleSave}>
                            Zapisz zmiany
                        </Button>
                    </ButtonGroup>
                </ModalContent>
            )}
        </Modal>
    );
};
