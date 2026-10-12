/**
 * Próg układu listy „Zaplanowane SMS-y" - liczony od szerokości SAMEJ LISTY, nie okna,
 * tak jak lista wizyt (patrz operations/components/opsListLayout.ts, tam pełne uzasadnienie).
 * Pasek filtrów i tabela stoją w jednej karcie i przełączają się w tym samym momencie.
 */
export const SMS_LIST_CONTAINER = 'scheduled-sms-list';

/**
 * Poniżej tej szerokości wiersz łamie się na dwie krótkie linie. Najwęższe kolumny
 * (112 + 140 + 150 + 32), cztery odstępy po 16 px i padding 2 × 20 px dają ~540 px;
 * zapas zostawia treści choć kawałek miejsca, zanim zniknie.
 */
export const SMS_CARDS_BELOW = 640;

export const smsCards = `@container ${SMS_LIST_CONTAINER} (max-width: ${SMS_CARDS_BELOW - 1}px)`;
export const smsTable = `@container ${SMS_LIST_CONTAINER} (min-width: ${SMS_CARDS_BELOW}px)`;
