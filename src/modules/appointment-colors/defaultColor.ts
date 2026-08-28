/**
 * Który kolor ma być zaznaczony, zanim użytkownik cokolwiek kliknie.
 *
 * Reguła jest jedna dla całej aplikacji, bo inaczej wizard check-inu i szybkie
 * dodawanie z kalendarza podpowiadałyby co innego dla tej samej wizyty:
 * wybór już dokonany > kolor domyślny studia > pierwszy aktywny (kolor jest
 * polem wymaganym, więc puste pole to tylko praca do wykonania).
 */
/**
 * Kolory przychodzą z kilku miejsc o różnych typach (lista ustawień, skrócony
 * typ w module wizyt), więc reguła opisuje tylko pola, które naprawdę czyta.
 */
export interface ColorChoice {
    id: string;
    isDefault?: boolean;
    isActive?: boolean;
}

export const pickInitialColorId = (
    colors: ReadonlyArray<ColorChoice>,
    current?: string | null
): string => {
    if (current) return current;

    const selectable = colors.filter(color => color.isActive !== false);

    return selectable.find(color => color.isDefault)?.id ?? selectable[0]?.id ?? '';
};
