// src/modules/auth/utils/validators.ts
import { z } from 'zod';
import { t } from '@/common/i18n';
import { PASSWORD_RULES } from './passwordRules';

/**
 * Hasło USTAWIANE przez użytkownika (rejestracja, reset, aktywacja konta).
 * Reguły biorą się z PASSWORD_RULES - z tej samej listy, którą widzi pod polem
 * jako ptaszki. Rozjazd między tym, co pokazujemy, a tym, co przyjmujemy, jest
 * tu niemożliwy z konstrukcji, a nie z uwagi recenzenta.
 *
 * Hasło PODAWANE przy logowaniu tych reguł nie sprawdza: konta założone przed
 * zaostrzeniem wymogów muszą się dalej logować, a walidacja siły na ekranie
 * logowania i tak niczego nie chroni.
 */
export const newPasswordSchema = z
    .string()
    .min(1, t.auth.validation.passwordRequired)
    .superRefine((password, ctx) => {
        // Puste hasło opisuje już `min(1)` - bez tego użytkownik dostaje
        // komplet czterech zarzutów za niewpisanie niczego.
        if (!password) return;
        for (const rule of PASSWORD_RULES) {
            if (!rule.test(password)) {
                ctx.addIssue({ code: 'custom', message: rule.message });
            }
        }
    });

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, t.auth.validation.emailRequired)
        .email(t.auth.validation.emailInvalid),
    password: z
        .string()
        .min(1, t.auth.validation.passwordRequired),
    rememberMe: z.boolean(),
});

export const signupSchema = z.object({
    firstName: z
        .string()
        .min(1, t.auth.validation.firstNameRequired)
        .min(2, t.auth.validation.firstNameMin),
    lastName: z
        .string()
        .min(1, t.auth.validation.lastNameRequired)
        .min(2, t.auth.validation.lastNameMin),
    email: z
        .string()
        .min(1, t.auth.validation.emailRequired)
        .email(t.auth.validation.emailInvalid),
    password: newPasswordSchema,
    confirmPassword: z
        .string()
        .min(1, t.auth.validation.passwordRequired),
    acceptTerms: z
        .boolean()
        .refine((val) => val === true, {
            message: t.auth.validation.termsRequired,
        }),
}).refine((data) => data.password === data.confirmPassword, {
    message: t.auth.validation.passwordMismatch,
    path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, t.auth.validation.emailRequired)
        .email(t.auth.validation.emailInvalid),
});

export const resetPasswordSchema = z.object({
    password: newPasswordSchema,
    confirmPassword: z
        .string()
        .min(1, t.auth.validation.passwordRequired),
}).refine((data) => data.password === data.confirmPassword, {
    message: t.auth.validation.passwordMismatch,
    path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;