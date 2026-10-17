// src/modules/activity/types.ts
//
// Mirrors the backend feed contract (GET /api/v1/audit/feed). The backend ships
// every entry already rendered: title, context line, formatted amount, labelled
// before/after values; this module deliberately owns no dictionary of action
// names, field labels or colours. Anything that needs translating is translated
// server-side; here we only decide layout.

/** Stable icon key. The mapping to an actual glyph lives in `ActivityIcon`. */
export type ActivityIconKey =
    | 'CREATE' | 'EDIT' | 'DELETE' | 'STATUS' | 'PHOTO' | 'DOCUMENT' | 'COMMENT'
    | 'NOTE' | 'SERVICE' | 'MONEY' | 'CALENDAR' | 'VEHICLE' | 'CUSTOMER' | 'USER'
    | 'SECURITY' | 'MESSAGE' | 'CAMPAIGN' | 'TIME' | 'SIGNATURE' | 'PHONE'
    | 'TASK' | 'VIEW' | 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'RESTORE' | 'SPLIT'
    | 'MERGE' | 'LEAVE' | 'PAYROLL' | 'LINK' | 'EXPORT';

export type ActivitySeverity = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

/**
 * Obszar studia - główny filtr Aktywności. Definicja (które moduły i akcje do niego
 * należą) mieszka w backendzie (`AuditArea`); tu jest tylko kod.
 */
export type ActivityArea = 'VISITS' | 'MONEY' | 'CLIENTS' | 'TEAM';

export type ActivityActorType = 'EMPLOYEE' | 'CUSTOMER' | 'SYSTEM' | 'INTEGRATION';

export type ActivityResource =
    | 'CUSTOMER' | 'VEHICLE' | 'VISIT' | 'APPOINTMENT' | 'LEAD' | 'EMPLOYEE'
    | 'USER' | 'TASK' | 'SERVICE' | 'FINANCIAL_DOCUMENT' | 'CAMPAIGN' | 'MESSAGE'
    | 'WORK_TIME' | 'PROTOCOL' | 'STUDIO' | 'NONE';

export type ActivityValueType =
    | 'TEXT' | 'MONEY' | 'NUMBER' | 'DATE' | 'DATE_TIME' | 'BOOLEAN' | 'ENUM'
    | 'PHONE' | 'EMAIL' | 'LIST' | 'REFERENCE' | 'SECRET';

/** A code plus the label the backend already translated. */
export interface ActivityCodeLabel {
    code: string;
    label: string;
}

export interface ActivityActor {
    type: ActivityActorType;
    typeLabel: string;
    /** User id for employees, customer id for customers, null for automated actors. */
    id: string | null;
    displayName: string;
    initials: string;
}

/** A pointer to a business object. The backend sends a type and an id, never a URL. */
export interface ActivityReference {
    resource: ActivityResource;
    id: string;
    label: string | null;
}

export interface ActivityAmount {
    /** Plain decimal, for computing. */
    value: string;
    currency: string;
    /** Ready to display, e.g. "1 230,00 zł". */
    display: string;
}

export interface ActivityChange {
    field: string;
    label: string;
    type: ActivityValueType;
    oldValue: string | null;
    newValue: string | null;
    oldValueDisplay: string | null;
    newValueDisplay: string | null;
}

export interface ActivityItem {
    id: string;
    occurredAt: string;

    actor: ActivityActor;
    module: ActivityCodeLabel;
    action: ActivityCodeLabel;
    severity: ActivityCodeLabel;
    channel: ActivityCodeLabel;

    icon: ActivityIconKey;

    title: string;
    description: string | null;
    summary: string;

    subject: ActivityReference | null;
    related: ActivityReference[];

    amount: ActivityAmount | null;

    changes: ActivityChange[];
    changeSummary: string | null;

    metadata: Record<string, string>;
    correlationId: string | null;
    ipAddress: string | null;
}

export interface ActivityFeedPage {
    items: ActivityItem[];
    /** Pass back as `cursor` for the next page; null at the end of the feed. */
    nextCursor: string | null;
    hasMore: boolean;
}

export interface ActivityFilterOption {
    value: string;
    label: string;
    icon: string | null;
}

export interface ActivityActionFilterOption {
    value: string;
    label: string;
    icon: ActivityIconKey;
    severity: ActivitySeverity;
}

export interface ActivityFilterOptions {
    areas: ActivityFilterOption[];
    modules: ActivityFilterOption[];
    actions: ActivityActionFilterOption[];
    actorTypes: ActivityFilterOption[];
    severities: ActivityFilterOption[];
    channels: ActivityFilterOption[];
}

/** Pracownik, który w okresie coś zrobił - `GET /audit/actors`. */
export interface ActivityActorActivity {
    id: string;
    displayName: string;
    eventCount: number;
    lastActivityAt: string;
}

export interface ActivityActorsResponse {
    actors: ActivityActorActivity[];
}

/**
 * Kto wykonał akcję: wszyscy, jeden pracownik (jego id), klienci albo automaty.
 * Jeden napis zamiast obiektu, bo tak siedzi w `<select>` i w kluczu zapytania.
 */
export type ActivityWho = 'ALL' | 'CUSTOMERS' | 'AUTOMATIONS' | `user:${string}`;

export const whoForEmployee = (userId: string): ActivityWho => `user:${userId}`;

export const employeeOf = (who: ActivityWho): string | null =>
    who.startsWith('user:') ? who.slice('user:'.length) : null;

/** Query the feed is currently narrowed by. */
export interface ActivityFilters {
    /** Null = „Wszystko". */
    area: ActivityArea | null;
    who: ActivityWho;
    /** Ukrywa rutynowe wiadomości automatu, które doszły bez błędu. */
    hideAutomated: boolean;
    search: string;
    /** ISO-8601 instant, inclusive. */
    from: string | null;
    to: string | null;
}

/**
 * What the screen opens on: everything, without routine automated messages.
 *
 * Bez z góry narzuconego „ważne" - dla każdego studia znaczy to co innego. Jedyne, co
 * ukrywamy domyślnie, to przypomnienia i automatyczne SMS-y, które doszły bez błędu:
 * to ich setki zalewały feed. Przełącznik „Pokaż automaty" przywraca je jednym kliknięciem.
 */
export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
    area: null,
    who: 'ALL',
    hideAutomated: true,
    search: '',
    from: null,
    to: null,
};
