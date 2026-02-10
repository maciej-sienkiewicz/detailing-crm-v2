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
        }

        // Przebieg nie jest wymagany – pole opcjonalne

        if (currentStep === 'photos') {
            const requiredSlots = ['front', 'rear', 'left_side', 'right_side'];
            const uploadedRequired = formData.photos.filter(p =>
                requiredSlots.includes(p.type)
            );
            if (uploadedRequired.length < 0) {
                validationErrors.photos = t.checkin.validation.requiredPhotos;
            }
        }

        return validationErrors;
    }, [formData, currentStep]);

    const isStepValid = Object.keys(errors).length === 0;

    return { errors, isStepValid };
};