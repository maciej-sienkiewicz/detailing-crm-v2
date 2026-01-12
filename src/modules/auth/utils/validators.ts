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

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;