/**
 * Dashboard Module Types
 * Defines data structures for operational metrics, business analytics, and incoming calls
 */

/**
 * Visit detail for operational stats hover
 */
export interface VisitDetail {
  /** Unique visit identifier */
  id: string;
  name: string;
  /** Vehicle brand */
  brand: string;
  /** Vehicle model */
  model: string;
  /** Visit value in PLN */
  /** null bez prawa do cen (VISITS_SERVICE_PRICES_VIEW). */
  amount: number | null;
  /** Customer first name */
  customerFirstName: string;
  /** Customer last name */
  customerLastName: string;
  /** Customer phone number (optional) */
  phoneNumber?: string;
  /** Estimated completion date (ISO) */
  estimatedCompletionDate?: string;
  /** Scheduled/start date of the visit or appointment (ISO) */
  scheduledDate?: string;
}

/**
 * Operational statistics showing current work status
 */
export interface OperationalStats {
  /** Number of orders currently being worked on */
  inProgress: number;
  /** Number of visits that are overdue (past estimated completion date) */
  overdue?: number;
  /** Number of completed orders ready for customer pickup */
  readyForPickup: number;
  /** Number of new orders scheduled to arrive today */
  incomingToday: number;
  /** Number of reservations abandoned in the last 30 days */
  abandonedLast30Days: number;
  /** Details of visits in progress */
  inProgressDetails: VisitDetail[];
  /** Details of visits ready for pickup */
  readyForPickupDetails: VisitDetail[];
  /** Details of visits arriving today */
  incomingTodayDetails: VisitDetail[];
  /** Details of abandoned reservations in the last 30 days */
  abandonedDetails?: VisitDetail[];
}

/**
 * Revenue summary from dedicated endpoint
 */
/**
 * Przychód miesiąca w groszach: ta sama liczba co kafel „Przychody" w Finansach
 * (dokumenty przychodowe netto, z ustawieniem obsługi statusów płatności).
 *
 * `netAmount` brak w starszym backendzie - ten sumował w `grossAmount` ceny brutto
 * wydanych wizyt. Nowy backend wysyła w `grossAmount` to samo co w `netAmount`,
 * tylko dla frontu sprzed zmiany. Czytaj przez `revenueAmount`.
 */
export interface DashboardRevenueAmount {
  netAmount?: number;
  /** @deprecated stara nazwa; czytaj przez `revenueAmount` */
  grossAmount?: number;
  currency: string;
}

export interface DashboardRevenueBucket extends DashboardRevenueAmount {
  /** Pierwszy dzień miesiąca, ISO. */
  monthStart: string;
}

export interface DashboardRevenueSummary {
  currentMonth: DashboardRevenueAmount;
  previousMonth: DashboardRevenueAmount;
  /** Poprzedni miesiąc do tego samego dnia - baza deltaPercentage (brak w starszym backendzie). */
  previousMonthToDate?: DashboardRevenueAmount;
  deltaPercentage: number;
  buckets: DashboardRevenueBucket[];
}

/** Kwota przychodu w groszach, także z odpowiedzi starszego backendu. */
export const revenueAmount = (amount: DashboardRevenueAmount): number =>
  amount.netAmount ?? amount.grossAmount ?? 0;

/**
 * Reservation count summary from dedicated endpoint
 */
export interface DashboardReservationBucket {
  /** Pierwszy dzień miesiąca, ISO. */
  monthStart: string;
  count: number;
}

export interface DashboardReservationSummary {
  currentMonth: { count: number };
  previousMonth: { count: number };
  /** Poprzedni miesiąc do tego samego dnia - baza deltaPercentage (brak w starszym backendzie). */
  previousMonthToDate?: { count: number };
  deltaPercentage: number;
  buckets: DashboardReservationBucket[];
}

/**
 * Status badge variant for visit rows
 */
export type VisitStatusKind = 'info' | 'warn' | 'neutral' | 'success' | 'err';

/**
 * Upcoming visit entry shown in "Najbliższe wizyty" panel
 */
export interface UpcomingVisit {
  id: string;
  type: 'VISIT' | 'RESERVATION';
  time: string;
  dateLabel: string;
  /** ISO date string (YYYY-MM-DD) used to render the calendar chip */
  isoDate: string;
  serviceName: string;
  /**
   * null = brak danych klienta. Świadomie null, a nie pusty string ani myślnik:
   * o tym, jak pokazać brak, decyduje widok — tylko on zna właściwe słowa i to
   * on wie, że pusta wartość ma być kursywą, a nie dziurą po separatorze.
   */
  customerName: string | null;
  /** null = wizyta bez wskazanego pojazdu. */
  vehicleName: string | null;
  price: number;
  priceNetto: number;
  statusKind: VisitStatusKind;
  statusLabel: string;
}

/**
 * Task item shown in "Do zrobienia" panel
 */
export interface DashboardTask {
  id: string;
  title: string;
  meta: string;
  done: boolean;
  createdAt?: string;
  createdByUserName?: string;
  /** Kiedy oznaczono jako wykonane; po 48 h bez zmiany statusu zadanie trafia do archiwum. */
  completedAt?: string | null;
  visibilityType?: 'ALL' | 'USERS' | 'ROLE';
  visibleToUserIds?: string[];
  visibleToUserNames?: string[];
  visibleToRoleId?: string;
  visibleToRoleName?: string;
}

export type TaskVisibilityType = 'ALL' | 'USERS' | 'ROLE';

export interface TaskVisibilityUser {
  userId: string;
  fullName: string;
}

export interface TaskVisibilityRole {
  roleId: string;
  name: string;
}

export interface TaskVisibilityOptions {
  users: TaskVisibilityUser[];
  roles: TaskVisibilityRole[];
}

export interface CreateTaskPayload {
  title: string;
  meta?: string;
  visibilityType?: TaskVisibilityType;
  visibleToUserIds?: string[];
  visibleToRoleId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  meta?: string;
  done?: boolean;
}

/**
 * Archived task entry returned by GET /api/v1/tasks/archive
 */
export interface ArchivedTask {
  id: string;
  title: string;
  meta: string | null;
  done: boolean;
  createdAt: string;
  createdByUserName: string;
  completedAt: string | null;
  completedByUserName: string | null;
  deletedAt: string;
  deletedByUserName: string | null;
  /** Do archiwum odłożył je system: wykonane, a statusu nikt nie ruszył przez 48 h. */
  archivedAutomatically?: boolean;
}


/**
 * Odpowiedź GET /v1/dashboard/stats - same kafelki stanu. Przychód, połączenia i opinie
 * Google wypadły: pulpit ich nie pokazywał, a front dosztukowywał je atrapą.
 */
export interface DashboardData {
  stats: OperationalStats;
}

