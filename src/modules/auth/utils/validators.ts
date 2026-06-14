// src/modules/auth/utils/validators.ts
import { z } from 'zod';
import { t } from '@/common/i18n';

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
    password: z
        .string()
        .min(1, t.auth.validation.passwordRequired)
        .min(8, t.auth.validation.passwordMin),
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
    password: z
        .string()
        .min(8, t.auth.validation.passwordMin)
        .regex(/[A-Z]/, t.auth.validation.passwordUppercase)
        .regex(/[a-z]/, t.auth.validation.passwordLowercase)
        .regex(/[0-9]/, t.auth.validation.passwordDigit),
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