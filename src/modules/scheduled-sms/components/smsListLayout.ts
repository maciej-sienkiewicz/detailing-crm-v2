/**
 * Próg układu listy „Zaplanowane SMS-y" - liczony od szerokości SAMEJ LISTY, nie okna,
 * tak jak lista wizyt (patrz operations/components/opsListLayout.ts, tam pełne uzasadnienie).
 * Pasek filtrów i tabela stoją w jednej karcie i przełączają się w tym samym momencie.
 */
export const SMS_LIST_CONTAINER = 'scheduled-sms-list';

/** Najwęższe kolumny (220 + 150 + 112 + 160 + 44), cztery odstępy po 12 px i padding 2 × 20 px, z zapasem. */
export const SMS_CARDS_BELOW = 800;

export const smsCards = `@container ${SMS_LIST_CONTAINER} (max-width: ${SMS_CARDS_BELOW - 1}px)`;
export const smsTable = `@container ${SMS_LIST_CONTAINER} (min-width: ${SMS_CARDS_BELOW}px)`;
