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

/**
 * Średnia lista (tablet, laptop z rozwiniętym menu): tabela jeszcze się mieści, ale na
 * kolumnę „Treść" zostaje kilkadziesiąt pikseli - jej nagłówek wchodził wtedy na
 * „Wynik". Poniżej tej szerokości treść znika z wiersza (zostaje w podpowiedzi
 * i w oknie zmiany), a jej miejsce oddajemy pozostałym kolumnom.
 */
export const SMS_CONTENT_FROM = 960;

export const smsNoContent = `@container ${SMS_LIST_CONTAINER} (min-width: ${SMS_CARDS_BELOW}px) and (max-width: ${SMS_CONTENT_FROM - 1}px)`;
