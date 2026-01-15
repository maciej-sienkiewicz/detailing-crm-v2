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
                if (!formData.customerData.email || !isValidEmail(formData.customerData.email)) {
                    validationErrors.email = t.customers.validation.emailInvalid;
                }
                if (!formData.customerData.phone || !isValidPolishPhone(formData.customerData.phone)) {
                    validationErrors.phone = t.customers.validation.phoneInvalid;
                }
            } else {
                // Jeśli nie ma pełnych danych, musi być alias lub wybór klienta
                if (!formData.customerAlias && !formData.customerData.id) {
                    validationErrors.customer = 'Musisz wybrać klienta lub wprowadzić alias';
                }
            }

            // Walidacja pojazdu
            if (!formData.vehicleData) {
                validationErrors.vehicle = 'Pojazd jest wymagany';
            } else {
                // VIN jest opcjonalny - walidacja tylko jeśli został podany
                if (formData.vehicleData.vin && formData.vehicleData.vin.length > 0 && formData.vehicleData.vin.length !== 17) {
                    validationErrors.vin = t.checkin.verification.vinFormat;
                }
            }
        }

        if (currentStep === 'technical') {
            if (!formData.technicalState.mileage || formData.technicalState.mileage <= 0) {
                validationErrors.mileage = t.checkin.technical.mileageRequired;
            }
        }

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