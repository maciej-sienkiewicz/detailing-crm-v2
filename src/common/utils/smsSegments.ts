// src/common/utils/smsSegments.ts
//
// Długość SMS-a liczona tak, jak liczy ją operator.
//
// Ta arytmetyka żyła w dwóch kopiach (okno SMS-a do klienta i okno zmiany zakresu
// usług), a trzecie miejsce, które jej potrzebowało, byłoby trzecią kopią. Reguła
// jest jedna i zmienia rachunek za wysyłkę, więc ma jedno miejsce.

/** GSM-7: 160 znaków w jednym segmencie, 153 gdy wiadomość jest dzielona. */
const GSM_SINGLE = 160;
const GSM_MULTI = 153;

/**
 * UCS-2: jeden polski ogonek przełącza CAŁĄ wiadomość na to kodowanie i segment
 * kurczy się do 70 znaków. Stąd „ż" w środku zdania potrafi podwoić rachunek.
 */
const UCS2_SINGLE = 70;
const UCS2_MULTI = 67;

const POLISH_CHARS_RE = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

/** Czy tekst zawiera znaki, które wypychają SMS-a do kodowania UCS-2. */
export const hasPolishCharacters = (text: string): boolean => POLISH_CHARS_RE.test(text);

/**
 * Na ile segmentów operator podzieli wiadomość tej długości.
 *
 * @param emptyIsZero co zwrócić dla pustego tekstu. Licznik „ile zapłacę" chce 0
 *        (nic nie wysyłamy), a podgląd gotowej treści chce 1 (tyle wyjdzie, gdy
 *        użytkownik cokolwiek wpisze). Obie kopie tej funkcji różniły się dokładnie
 *        tym jednym miejscem i nie ma powodu tego ujednolicać wbrew wywołującym.
 */
export const smsSegments = (
    length: number,
    polish: boolean,
    emptyIsZero = true
): number => {
    if (length === 0) return emptyIsZero ? 0 : 1;
    const single = polish ? UCS2_SINGLE : GSM_SINGLE;
    const multi = polish ? UCS2_MULTI : GSM_MULTI;
    return length <= single ? 1 : Math.ceil(length / multi);
};

/** Polska odmiana: 1 SMS, 2-4 SMS-y, 5+ SMS-ów. */
export const smsWord = (count: number): string => {
    if (count === 1) return 'SMS';
    const last = count % 10;
    const lastTwo = count % 100;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'SMS-y' : 'SMS-ów';
};
