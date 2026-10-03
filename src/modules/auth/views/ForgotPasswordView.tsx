// src/modules/auth/views/ForgotPasswordView.tsx
import { useState } from 'react';
import { useForgotPassword } from '../hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../utils/validators';
import { AuthInput } from '../components/AuthInput';
import { ErrorAlert } from '../components/ErrorAlert';
import { SuccessAlert } from '../components/SuccessAlert';
import { t } from '@/common/i18n';
import { Label, FieldGroup, ErrorMessage } from '@/common/components/Form';
import { AuthLayout } from '../components/AuthLayout';
import { AuthAside, AuthForm, AuthHeading, AuthLink, AuthMeta, AuthPrimaryButton } from '../components/AuthUi';

export const ForgotPasswordView = () => {
    const [formData, setFormData] = useState<ForgotPasswordFormData>({ email: '' });
    const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [apiError, setApiError] = useState('');

    const forgotPasswordMutation = useForgotPassword();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setApiError('');

        const result = forgotPasswordSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof ForgotPasswordFormData, string>> = {};
            // Pierwszy zarzut, nie ostatni: zod zgłasza je w kolejności sprawdzeń,
            // więc dla pustego pola pierwszy mówi „jest wymagane", a kolejny już
            // „nieprawidłowy format" - i to ten drugi widział użytkownik, który
            // po prostu niczego nie wpisał.
            result.error.issues.forEach((err) => {
                const field = err.path[0] as keyof ForgotPasswordFormData | undefined;
                if (field && !fieldErrors[field]) {
                    fieldErrors[field] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            await forgotPasswordMutation.mutateAsync(formData);
            setSubmitted(true);
        } catch {
            setApiError(t.auth.errors.serverError);
        }
    };

    return (
        <AuthLayout statement={t.auth.gate.forgotPassword}>
            <AuthHeading>
                <h1>{t.auth.forgotPassword.title}</h1>
                <p>{t.auth.forgotPassword.subtitle}</p>
            </AuthHeading>

            {apiError && <ErrorAlert message={apiError} />}
            {submitted && <SuccessAlert message={t.auth.forgotPassword.successMessage} />}

            {!submitted && (
                <AuthForm onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Label htmlFor="email">{t.auth.forgotPassword.emailLabel}</Label>
                        <AuthInput
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            placeholder={t.auth.forgotPassword.emailPlaceholder}
                            value={formData.email}
                            onChange={(e) => setFormData({ email: e.target.value })}
                            $hasError={!!errors.email}
                        />
                        {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                    </FieldGroup>

                    <AuthPrimaryButton type="submit" disabled={forgotPasswordMutation.isPending}>
                        {forgotPasswordMutation.isPending
                            ? t.auth.forgotPassword.submitting
                            : t.auth.forgotPassword.submitButton}
                    </AuthPrimaryButton>
                </AuthForm>
            )}

            <AuthAside>
                <AuthMeta>
                    <AuthLink to="/login">{t.auth.forgotPassword.backToLogin}</AuthLink>
                </AuthMeta>
            </AuthAside>
        </AuthLayout>
    );
};
