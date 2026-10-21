// src/modules/appointments/utils/validateAppointmentEdit.ts
//
// Walidacja edycji rezerwacji (AppointmentEditView). Widok przekazywał do formularza
// `errors={{}}`, więc rezerwację bez usługi, bez koloru albo z końcem przed początkiem
// dało się wysłać - i jedyną odpowiedzią był błąd serwera. Reguły są te same co przy
// zakładaniu rezerwacji w kalendarzu (QuickEventModal): klient, usługa, kolor, termin,
// a nowy klient z telefonem albo e-mailem. Pojazd w rezerwacji jest opcjonalny,
// a numer telefonu nie musi być polski - jak w kalendarzu.

import { isValidEmail } from '@/common/utils/validators';
import type { CheckInFormData } from '@/modules/checkin/types';

export const validateAppointmentEdit = (form: CheckInFormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    const c = form.customerData;
    const hasName = !!(c?.firstName?.trim() || c?.lastName?.trim());
    const hasPhone = !!c?.phone?.trim();
    const hasEmail = !!c?.email?.trim();

    if (!c?.id && !hasName && !hasPhone && !hasEmail) {
        errors.customer = 'Wybierz klienta';
    } else if (form.isNewCustomer && !hasPhone && !hasEmail) {
        errors.contact = 'Podaj e-mail lub numer telefonu';
    }
    if (hasEmail && !isValidEmail(c.email.trim())) {
        errors.email = 'Nieprawidłowy format adresu e-mail';
    }

    if (!form.visitStartAt || !form.visitEndAt) {
        errors.schedule = 'Podaj początek i koniec rezerwacji';
    } else if (new Date(form.visitEndAt) < new Date(form.visitStartAt)) {
        errors.schedule = 'Koniec rezerwacji musi być po jej początku';
    }

    if (!form.services || form.services.length === 0) {
        errors.services = 'Dodaj przynajmniej jedną usługę';
    }
    if (!form.appointmentColorId) {
        errors.color = 'Wybierz kolor rezerwacji';
    }
    return errors;
};
