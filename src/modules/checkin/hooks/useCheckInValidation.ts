import { useMemo } from 'react';
import { t } from '@/common/i18n';
import { isValidEmail, isValidPolishPhone } from '@/common/utils';
import type { CheckInFormData, CheckInStep } from '../types';

export const useCheckInValidation = (formData: CheckInFormData, currentStep: CheckInStep) => {
    const errors = useMemo(() => {
        const validationErrors: Record<string, string> = {};

        if (currentStep === 'verification') {
            // Walidacja danych klienta - tylko jeśli hasFullCustomerData jest true
            if (formData.hasFullCustomerData) {
                if (!formData.customerData.firstName || formData.customerData.firstName.length < 2) {
                    validationErrors.firstName = t.customers.validation.firstNameMin;
                }
                if (!formData.customerData.lastName || formData.customerData.lastName.length < 2) {
                    validationErrors.lastName = t.customers.validation.lastNameMin;
                }
                // Wymagaj co najmniej jednego sposobu kontaktu: e-mail LUB telefon
                const hasEmail = !!formData.customerData.email && formData.customerData.email.trim().length > 0;
                const hasPhone = !!formData.customerData.phone && formData.customerData.phone.trim().length > 0;

                if (!hasEmail && !hasPhone) {
                    // Żaden kontakt nie został podany
                    validationErrors.contact = 'Podaj e-mail lub numer telefonu';
                } else {
                    // Waliduj tylko te pola, które zostały podane
                    if (hasEmail && !isValidEmail(formData.customerData.email)) {
                        validationErrors.email = t.customers.validation.emailInvalid;
                    }
                    if (hasPhone && !isValidPolishPhone(formData.customerData.phone)) {
                        validationErrors.phone = t.customers.validation.phoneInvalid;
                    }
                }
            } else {
                // Jeśli nie ma pełnych danych, musi być wybór klienta
                if (!formData.customerData.id) {
                    validationErrors.customer = 'Musisz wybrać klienta';
                }
            }

            // Walidacja pojazdu
            if (!formData.vehicleData) {
                validationErrors.vehicle = 'Pojazd jest wymagany';
            }

            // Walidacja przekazania pojazdu przez inną osobę
            if (formData.vehicleHandoff.isHandedOffByOtherPerson) {
                const handoff = formData.vehicleHandoff.contactPerson;

                if (!handoff.firstName || handoff.firstName.trim().length < 2) {
                    validationErrors.handoffFirstName = 'Imię osoby przekazującej jest wymagane (min. 2 znaki)';
                }
                if (!handoff.lastName || handoff.lastName.trim().length < 2) {
                    validationErrors.handoffLastName = 'Nazwisko osoby przekazującej jest wymagane (min. 2 znaki)';
                }

                const hasHandoffEmail = !!handoff.email && handoff.email.trim().length > 0;
                const hasHandoffPhone = !!handoff.phone && handoff.phone.trim().length > 0;

                if (!hasHandoffEmail && !hasHandoffPhone) {
                    validationErrors.handoffContact = 'Podaj e-mail lub numer telefonu osoby przekazującej';
                } else {
                    if (hasHandoffEmail && !isValidEmail(handoff.email)) {
                        validationErrors.handoffEmail = 'Nieprawidłowy format adresu e-mail';
                    }
                    if (hasHandoffPhone && !isValidPolishPhone(handoff.phone)) {
                        validationErrors.handoffPhone = 'Nieprawidłowy format numeru telefonu';
                    }
                }
            }
        }

        // Przebieg nie jest wymagany – pole opcjonalne

        // Zdjęcia są opcjonalne – brak walidacji
        if (currentStep === 'photos') {
            // No validation required - photos are optional
        }

        return validationErrors;
    }, [formData, currentStep]);

    const isStepValid = Object.keys(errors).length === 0;

    return { errors, isStepValid };
};