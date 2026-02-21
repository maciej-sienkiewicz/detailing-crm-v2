import { useLocalStorage } from '../../../common/hooks';
import { AppointmentStatus, VisitStatus } from '../types';

const STORAGE_KEY = 'calendar-filters-v2';

const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = ['CREATED', 'ABANDONED', 'CANCELLED'];
const ALL_VISIT_STATUSES: VisitStatus[] = ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'ARCHIVED'];

interface CalendarFiltersState {
    appointmentStatuses: AppointmentStatus[];
    visitStatuses: VisitStatus[];
}

const DEFAULT_FILTERS: CalendarFiltersState = {
    appointmentStatuses: ALL_APPOINTMENT_STATUSES,
    visitStatuses: ALL_VISIT_STATUSES,
};

/**
 * Validates that a value loaded from storage is a valid AppointmentStatus.
 * Guards against stale data if status enums change between deployments.
 */
function validateAppointmentStatuses(raw: unknown): AppointmentStatus[] {
    if (!Array.isArray(raw)) return ALL_APPOINTMENT_STATUSES;
    return raw.filter((s): s is AppointmentStatus =>
        ALL_APPOINTMENT_STATUSES.includes(s as AppointmentStatus),
    );
}

function validateVisitStatuses(raw: unknown): VisitStatus[] {
    if (!Array.isArray(raw)) return ALL_VISIT_STATUSES;
    return raw.filter((s): s is VisitStatus =>
        ALL_VISIT_STATUSES.includes(s as VisitStatus),
    );
}

export function useCalendarFilters() {
    const [stored, setStored] = useLocalStorage<CalendarFiltersState>(STORAGE_KEY, DEFAULT_FILTERS);

    // Validate on read – protects against stale / malformed localStorage data
    const appointmentStatuses = validateAppointmentStatuses(stored.appointmentStatuses);
    const visitStatuses = validateVisitStatuses(stored.visitStatuses);

    const setAppointmentStatuses = (statuses: AppointmentStatus[]) => {
        setStored((prev) => ({ ...prev, appointmentStatuses: statuses }));
    };

    const setVisitStatuses = (statuses: VisitStatus[]) => {
        setStored((prev) => ({ ...prev, visitStatuses: statuses }));
    };

    return {
        appointmentStatuses,
        visitStatuses,
        setAppointmentStatuses,
        setVisitStatuses,
    };
}
