// src/common/utils/moneyInput.ts
//
// Rules for typing an amount by hand, in one place.
//
// A money field is not a number field. `<input type="number">` accepts "1e5",
// "0.12345" and (in some browsers) a stray "+", then hands them all to
// parseFloat, so a price of 0.125 zł rounds to something the operator never
// typed and never sees. These helpers keep the field a text input whose content
// is always a plain amount with at most two decimals - the only shape a grosz
// can take.

/**
 * The only thing a price field may contain while being typed.
 *
 * Deliberately permissive about *incomplete* input: "", "12", "12," and "12,4"
 * all pass, because a user halfway through typing 12,45 must not be blocked on
 * the way there. What it rejects is anything that could never become a price -
 * letters, a second separator, exponent notation, a sign, a third decimal.
 */
export const MAX_2_DECIMALS = /^\d*[.,]?\d{0,2}$/;

/** Cents → what goes in the field. Comma, because that is the Polish separator. */
export const centsToInput = (cents: number): string =>
    (cents / 100).toFixed(2).replace('.', ',');

/**
 * Field content → cents. Accepts either separator (a numeric keypad may offer
 * only the dot) and treats anything unparseable as zero, so a half-typed field
 * reads as "nothing entered yet" rather than NaN.
 */
export const inputToCents = (raw: string): number => {
    const parsed = parseFloat(raw.replace(',', '.'));
    return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
};

/** "0", "0,00", "0.0", "" after trimming a stray separator - anything that reads as no money yet. */
export const isZeroAmount = (raw: string): boolean => {
    const normalized = raw.trim().replace(',', '.');
    return normalized !== '' && /^0+(\.0*)?$/.test(normalized);
};

/**
 * Every price field in the app shares this one rule: while the field shows a
 * zero amount, the next DIGIT the operator presses replaces it instead of
 * appending to it. Without this, a price left at "0,00" turns "1" into
 * "10,00" - the operator wanted "1" and has to notice, select all, retype.
 *
 * Wire it as the input's onKeyDown, passing the field's current displayed
 * value and the same setter/handler its onChange already calls:
 *
 *   onKeyDown={handleZeroAwareKeyDown(value, setValue)}
 *
 * Only digit keys are intercepted - backspace, the decimal separator, arrow
 * keys and typing into an already-nonzero field behave exactly as before.
 */
export const handleZeroAwareKeyDown =
    (value: string, onChange: (next: string) => void) =>
    (event: { key: string; preventDefault: () => void }): void => {
        if (!/^[0-9]$/.test(event.key)) return;
        if (!isZeroAmount(value)) return;
        event.preventDefault();
        onChange(event.key);
    };
