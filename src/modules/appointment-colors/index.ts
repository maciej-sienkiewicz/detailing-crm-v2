// Kolorami zarządza się w Ustawieniach → Oznaczenia; ten moduł dostarcza tam
// dane i formularz dodawania/edycji, używany też przy zakładaniu wizyty.
export { AppointmentColorFormModal } from './components/AppointmentColorFormModal';
export { pickInitialColorId } from './defaultColor';
export { appointmentColorsQuery, APPOINTMENT_COLORS_KEY } from './api/appointmentColorsQuery';
export type { AppointmentColor, AppointmentColorFilters } from './types';
