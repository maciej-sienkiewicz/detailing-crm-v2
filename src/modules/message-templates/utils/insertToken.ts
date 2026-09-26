/**
 * Wstawia zmienną (`{{imie}}`) w miejscu kursora, zastępując zaznaczenie.
 *
 * Chip „Wstaw: Imię" doklejał zmienną na KONIEC treści, niezależnie od tego, gdzie
 * stał kursor - „Dzień dobry, !" plus kliknięcie dawało „Dzień dobry, !{{imie}}"
 * i zmienną trzeba było przenosić ręcznie. Zwraca też pozycję kursora za wstawką,
 * żeby pisać dalej bez sięgania po mysz.
 *
 * Bez znanej pozycji (pole nigdy nie miało focusu) - na końcu, jak dotąd.
 */
export function insertToken(
  text: string,
  token: string,
  selectionStart: number | null | undefined,
  selectionEnd: number | null | undefined
): { text: string; caret: number } {
  const len = text.length;
  const start = selectionStart ?? len;
  const end = selectionEnd ?? start;
  const from = Math.max(0, Math.min(start, end, len));
  const to = Math.min(len, Math.max(start, end));
  return { text: text.slice(0, from) + token + text.slice(to), caret: from + token.length };
}
