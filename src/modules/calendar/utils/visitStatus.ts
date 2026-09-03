/**
 * Wizyta, która już się toczy: auto jest w studiu (w trakcie) albo czeka na odbiór.
 * W kalendarzu taki kafelek jest lżejszy niż rezerwacja — nie musi walczyć o uwagę
 * z tym, co dopiero przyjedzie.
 */
export const isStartedVisit = (status?: string): boolean =>
    status === 'IN_PROGRESS' || status === 'READY_FOR_PICKUP';
