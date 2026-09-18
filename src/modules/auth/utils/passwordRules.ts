// src/modules/auth/utils/passwordRules.ts
//
// JEDNA lista wymogów hasła dla całego modułu auth. Czyta ją i formularz
// (walidacja przy zapisie), i lista podpowiedzi pod polem (ptaszki w trakcie
// pisania) - dzięki temu użytkownik nie może zobaczyć kompletu odhaczonych
// wymogów i mimo to dostać błędu przy zapisie.
//
// Wcześniej reguły były rozpisane dwa razy i już zdążyły się rozjechać:
// rejestracja wymagała tylko 8 znaków, a ustawianie nowego hasła dodatkowo
// wielkiej litery, małej i cyfry. Ten sam człowiek zakładał więc konto hasłem,
// którego po resecie nie mógł już ustawić.

import { t } from '@/common/i18n';

export interface PasswordRule {
    id: string;
    /** Krótka treść na listę pod polem ("co najmniej 8 znaków"). */
    label: string;
    /** Pełne zdanie do komunikatu walidacji formularza. */
    message: string;
    test: (password: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
    {
        id: 'minLength',
        label: t.auth.passwordRules.minLength,
        message: t.auth.validation.passwordMin,
        test: password => password.length >= 8,
    },
    {
        id: 'uppercase',
        label: t.auth.passwordRules.uppercase,
        message: t.auth.validation.passwordUppercase,
        test: password => /[A-Z]/.test(password),
    },
    {
        id: 'lowercase',
        label: t.auth.passwordRules.lowercase,
        message: t.auth.validation.passwordLowercase,
        test: password => /[a-z]/.test(password),
    },
    {
        id: 'digit',
        label: t.auth.passwordRules.digit,
        message: t.auth.validation.passwordDigit,
        test: password => /[0-9]/.test(password),
    },
] as const;

/** Czy hasło spełnia komplet wymogów. */
export const isPasswordValid = (password: string): boolean =>
    PASSWORD_RULES.every(rule => rule.test(password));
