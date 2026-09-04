// src/modules/appointments/components/CustomerModal.tsx
import { useState } from 'react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { useDebounce } from '@/common/hooks';
import { useCustomerSearch } from '../hooks/useAppointmentForm';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    FormErrorMsg,
} from '@/common/components/Form';
import {
    PickerSearch,
    PickerPane,
    PickerResults,
    PickerStatus,
    PickerSkeleton,
    PickerRow,
    PickerAvatar,
    PickerRowMain,
    PickerRowTitle,
    PickerRowSub,
    PickerRowMeta,
    PickerAddRow,
    PickerEmpty,
    initialsOf,
} from '@/common/components/PickerList';
import { PhoneInput } from '@/common/components/PhoneInput';
import { t } from '@/common/i18n';
import type { Customer, SelectedCustomer } from '../types';

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: SelectedCustomer) => void;
    /**
     * Id of the customer already attached to the record being edited. Present means the
     * user is replacing someone, so the modal says "Zmień klienta" and marks that row.
     */
    currentCustomerId?: string;
}

type CustomerMode = 'search' | 'new';

const EMPTY_FORM = { firstName: '', lastName: '', phone: '', email: '' };

export const CustomerModal = ({ isOpen, onClose, onSelect, currentCustomerId }: CustomerModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState<CustomerMode>('search');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const debouncedQuery = useDebounce(searchQuery, 200);
    const { data: customers, isLoading, isFetching, isPlaceholderData } = useCustomerSearch(debouncedQuery);

    // Reopening the modal must not resurrect the previous session's half-typed search
    // or a form the user abandoned, so every close path clears it. ModalShell routes
    // Escape and the backdrop through onClose too, so this covers all of them.
    const handleClose = () => {
        setSearchQuery('');
        setMode('search');
        setFormData(EMPTY_FORM);
        setErrors({});
        onClose();
    };

    const handleCustomerClick = (customer: Customer) => {
        onSelect({
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email,
            isNew: false,
        });
        handleClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName || formData.firstName.length < 2) {
            newErrors.firstName = t.appointments.validation.firstNameMinLength;
        }
        if (!formData.lastName || formData.lastName.length < 2) {
            newErrors.lastName = t.appointments.validation.lastNameMinLength;
        }

        // Walidacja: wymagaj co najmniej jednego sposobu kontaktu (telefon LUB email)
        const hasPhone = formData.phone && formData.phone.trim().length > 0;
        const hasEmail = formData.email && formData.email.trim().length > 0;

        if (!hasPhone && !hasEmail) {
            newErrors.phone = 'Podaj co najmniej numer telefonu lub adres email';
            newErrors.email = 'Podaj co najmniej numer telefonu lub adres email';
        } else {
            // Waliduj format tylko jeśli pole jest wypełnione
            if (hasPhone && !/^(\+48)?\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
                newErrors.phone = t.appointments.validation.phoneInvalid;
            }
            if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = t.appointments.validation.emailInvalid;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitNew = () => {
        if (!validateForm()) return;

        onSelect({
            ...formData,
            isNew: true,
        });
        handleClose();
    };

    const isReplacing = !!currentCustomerId;
    const modalTitle = mode === 'new'
        ? t.appointments.customerModal.titleNew
        : (isReplacing ? t.appointments.customerModal.titleChange : t.appointments.customerModal.titleSelect);
    const modalSubtitle = mode === 'new'
        ? t.appointments.customerModal.subtitleNew
        : (isReplacing ? t.appointments.customerModal.subtitleChange : t.appointments.customerModal.subtitleSelect);

    const hasQuery = searchQuery.trim().length > 0;
    const results = customers ?? [];
    // Rows for the query still in flight are the previous query's (keepPreviousData), which
    // is what keeps the list from blanking between keystrokes. Placeholders appear only when
    // there is nothing worth holding on to: the first load, or a stale-but-empty list.
    const isStale = hasQuery && isPlaceholderData;
    const showSkeleton = hasQuery && (isLoading || (isStale && results.length === 0));
    const statusText = !hasQuery
        ? ''
        : showSkeleton
            ? t.appointments.customerModal.searching
            : isStale
                ? t.appointments.customerModal.searching
            : results.length > 0
                ? `${t.appointments.customerModal.resultsCount}: ${results.length}`
                : t.appointments.customerModal.noResults;

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg" stableHeight>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{modalTitle}</ModalTitle>
                    <ModalSubtitle>{modalSubtitle}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                {mode === 'search' ? (
                    <>
                        <PickerSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder={t.appointments.customerModal.searchPlaceholder}
                            autoFocus
                            loading={hasQuery && isFetching}
                        />

                        <PickerPane>
                            <PickerStatus>{statusText}</PickerStatus>
                            <PickerResults aria-busy={isFetching} $stale={isStale}>
                                {showSkeleton ? (
                                    <PickerSkeleton />
                                ) : !hasQuery ? (
                                    <PickerEmpty
                                        title={t.appointments.customerModal.enterSearch}
                                        description={t.appointments.customerModal.enterSearchHint}
                                    />
                                ) : results.length > 0 ? (
                                    results.map((customer) => (
                                        <PickerRow
                                            key={customer.id}
                                            type="button"
                                            $selected={customer.id === currentCustomerId}
                                            onClick={() => handleCustomerClick(customer)}
                                        >
                                            <PickerAvatar>{initialsOf(customer.firstName, customer.lastName)}</PickerAvatar>
                                            <PickerRowMain>
                                                <PickerRowTitle>
                                                    {customer.firstName} {customer.lastName}
                                                </PickerRowTitle>
                                                <PickerRowSub>
                                                    {[customer.phone, customer.email].filter(Boolean).join(' · ') || '-'}
                                                </PickerRowSub>
                                            </PickerRowMain>
                                            {customer.id === currentCustomerId && (
                                                <PickerRowMeta>{t.appointments.customerModal.currentBadge}</PickerRowMeta>
                                            )}
                                        </PickerRow>
                                    ))
                                ) : (
                                    <PickerEmpty
                                        title={t.appointments.customerModal.noResults}
                                        description={t.appointments.customerModal.noResultsHint}
                                    />
                                )}
                            </PickerResults>
                        </PickerPane>

                        <PickerAddRow
                            label={t.appointments.customerModal.addNewButton}
                            hint={t.appointments.customerModal.addNewHint}
                            onClick={() => setMode('new')}
                        />
                    </>
                ) : (
                    <FormGrid>
                        <FormField>
                            <FieldLabel htmlFor="customer-modal-first-name">
                                {t.appointments.customerModal.firstName}
                            </FieldLabel>
                            <InputShell $hasError={!!errors.firstName}>
                                <BareInput
                                    id="customer-modal-first-name"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, firstName: capitalizeFirst(e.target.value) })
                                    }
                                    placeholder={t.appointments.customerModal.firstNamePlaceholder}
                                    autoFocus
                                />
                            </InputShell>
                            {errors.firstName && <FormErrorMsg>{errors.firstName}</FormErrorMsg>}
                        </FormField>

                        <FormField>
                            <FieldLabel htmlFor="customer-modal-last-name">
                                {t.appointments.customerModal.lastName}
                            </FieldLabel>
                            <InputShell $hasError={!!errors.lastName}>
                                <BareInput
                                    id="customer-modal-last-name"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, lastName: capitalizeFirst(e.target.value) })
                                    }
                                    placeholder={t.appointments.customerModal.lastNamePlaceholder}
                                />
                            </InputShell>
                            {errors.lastName && <FormErrorMsg>{errors.lastName}</FormErrorMsg>}
                        </FormField>

                        <FormField>
                            <FieldLabel htmlFor="customer-modal-phone">
                                {t.appointments.customerModal.phone}
                            </FieldLabel>
                            <PhoneInput
                                id="customer-modal-phone"
                                value={formData.phone}
                                onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                                hasError={!!errors.phone}
                                placeholder={t.appointments.customerModal.phonePlaceholder}
                            />
                            {errors.phone && <FormErrorMsg>{errors.phone}</FormErrorMsg>}
                        </FormField>

                        <FormField>
                            <FieldLabel htmlFor="customer-modal-email">
                                {t.appointments.customerModal.email}
                            </FieldLabel>
                            <InputShell $hasError={!!errors.email}>
                                <BareInput
                                    id="customer-modal-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder={t.appointments.customerModal.emailPlaceholder}
                                />
                            </InputShell>
                            {errors.email && <FormErrorMsg>{errors.email}</FormErrorMsg>}
                        </FormField>
                    </FormGrid>
                )}
            </ModalContent>

            <ModalFooter>
                {mode === 'search' ? (
                    <SharedButton $variant="secondary" onClick={handleClose}>
                        {t.appointments.customerModal.cancel}
                    </SharedButton>
                ) : (
                    <>
                        <SharedButton $variant="secondary" onClick={() => setMode('search')}>
                            {t.appointments.customerModal.backToSearch}
                        </SharedButton>
                        <SharedButton $variant="primary" onClick={handleSubmitNew}>
                            {t.appointments.customerModal.confirmButton}
                        </SharedButton>
                    </>
                )}
            </ModalFooter>
        </ModalShell>
    );
};
