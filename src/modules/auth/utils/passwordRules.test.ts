// Ptaszki pod polem hasła obiecują użytkownikowi, że formularz to hasło
// przyjmie. Te testy pilnują, żeby obietnica była prawdziwa: lista reguł
// pokazywana w interfejsie i walidacja zapisu muszą dawać ten sam wynik dla
// każdego hasła. Zanim reguły zeszły do jednego miejsca, rejestracja wymagała
// samych 8 znaków, a reset hasła dodatkowo wielkiej litery, małej i cyfry -
// ten sam człowiek zakładał konto hasłem, którego po resecie nie mógł ustawić.
import { describe, expect, it } from 'vitest';
import { PASSWORD_RULES, isPasswordValid } from './passwordRules';
import { signupSchema, resetPasswordSchema } from './validators';

const SAMPLES = [
    '',
    'abc',
    'haslo',                 // za krótkie, bez wielkiej litery i cyfry
    'haslo123',              // 8 znaków, cyfra, ale bez wielkiej litery
    'HASLO123',              // bez małej litery
    'HasloDlugie',           // bez cyfry
    'Haslo123',              // komplet
    'Bardzo Dlugie Haslo 1', // komplet, ze spacjami
    'Zażółć1gęślą',          // komplet, znaki diakrytyczne
];

const parseSignupPassword = (password: string) =>
    signupSchema.safeParse({
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan@example.com',
        password,
        confirmPassword: password,
        acceptTerms: true,
    }).success;

const parseResetPassword = (password: string) =>
    resetPasswordSchema.safeParse({ password, confirmPassword: password }).success;

describe('PASSWORD_RULES', () => {
    it('każda reguła ma treść na listę i pełny komunikat walidacji', () => {
        for (const rule of PASSWORD_RULES) {
            expect(rule.label.length).toBeGreaterThan(0);
            expect(rule.message.length).toBeGreaterThan(0);
        }
    });

    it.each(SAMPLES)('rejestracja przyjmuje hasło dokładnie wtedy, gdy komplet ptaszków: %j', (password) => {
        expect(parseSignupPassword(password)).toBe(isPasswordValid(password));
    });

    it.each(SAMPLES)('reset hasła stawia te same wymogi co rejestracja: %j', (password) => {
        expect(parseResetPassword(password)).toBe(parseSignupPassword(password));
    });

    it('odhacza reguły pojedynczo, w miarę pisania', () => {
        const met = (password: string) =>
            PASSWORD_RULES.filter(rule => rule.test(password)).map(rule => rule.id);

        expect(met('')).toEqual([]);
        expect(met('h')).toEqual(['lowercase']);
        expect(met('Haslo')).toEqual(['uppercase', 'lowercase']);
        expect(met('Haslo1')).toEqual(['uppercase', 'lowercase', 'digit']);
        expect(met('Haslo123')).toEqual(['minLength', 'uppercase', 'lowercase', 'digit']);
    });

    it('puste hasło to jeden zarzut - brak hasła, a nie komplet niespełnionych reguł', () => {
        const result = signupSchema.safeParse({
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'jan@example.com',
            password: '',
            confirmPassword: '',
            acceptTerms: true,
        });
        const passwordIssues = result.success
            ? []
            : result.error.issues.filter(issue => issue.path[0] === 'password');
        expect(passwordIssues).toHaveLength(1);
    });
});
