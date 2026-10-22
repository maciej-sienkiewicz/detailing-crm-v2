// src/common/utils/sessionGone.ts

import { problemStatus } from '@/core/problem';

/**
 * Statusy, po których sesja z linku (skan, przyjęcie z telefonu) już nie wróci: token
 * nieważny (401/403), nieznany (404) albo zamknięty (410).
 */
const GONE_STATUSES = new Set([401, 403, 404, 410]);

/**
 * Czy błąd mówi, że sesja wygasła albo zniknęła. Wtedy odpytywanie ma się skończyć -
 * dawniej szło dalej co kilka sekund, zostawiając w Network szereg 404/401 aż do
 * zamknięcia karty.
 */
export const isSessionGone = (error: unknown): boolean =>
    GONE_STATUSES.has(problemStatus(error) ?? 0);
