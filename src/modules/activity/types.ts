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
    | 'MERGE' | 'LEAVE' | 'PAYROLL' | 'LINK';

export type ActivitySeverity = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

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
    modules: ActivityFilterOption[];
    actions: ActivityActionFilterOption[];
    actorTypes: ActivityFilterOption[];
    severities: ActivityFilterOption[];
    channels: ActivityFilterOption[];
}

/** Query the feed is currently narrowed by. Empty arrays / nulls mean "no filter". */
export interface ActivityFilters {
    modules: string[];
    actorTypes: ActivityActorType[];
    severities: ActivitySeverity[];
    search: string;
    /** ISO-8601 instant, inclusive. */
    from: string | null;
    to: string | null;
}

export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
    modules: [],
    actorTypes: [],
    severities: [],
    search: '',
    from: null,
    to: null,
};

/**
 * What the screen opens on.
 *
 * Not the unfiltered feed: a working studio produces far more photo uploads and
 * comments than decisions, so landing on everything would bury the events an owner
 * opened this screen to see. "Ważne" is one click away from the full firehose.
 */
export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
    ...EMPTY_ACTIVITY_FILTERS,
    severities: ['HIGH', 'CRITICAL'],
};
