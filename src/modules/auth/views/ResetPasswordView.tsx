// src/modules/auth/views/ResetPasswordView.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordFormData } from '../utils/validators';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { ErrorAlert } from '../components/ErrorAlert';
import { SuccessAlert } from '../components/SuccessAlert';
import { AuthLayout } from '../components/AuthLayout';
import { AuthAside, AuthForm, AuthHeading, AuthLink, AuthMeta, AuthPrimaryButton } from '../components/AuthUi';
import { authApi } from '../api/authApi';
import { t } from '@/common/i18n';
import { Label, FieldGroup, ErrorMessage } from '@/common/components/Form';

type TokenState = 'loading' | 'valid' | 'invalid';
type ViewMode = 'reset' | 'setup';

interface ResetPasswordViewProps {
    mode?: ViewMode;
}

export const ResetPasswordView = ({ mode = 'reset' }: ResetPasswordViewProps) => {
    const copy = mode === 'setup' ? t.auth.confirmPassword : t.auth.resetPassword;
    const statement = mode === 'setup' ? t.auth.gate.confirmPassword : t.auth.gate.resetPassword;
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [tokenState, setTokenState] = useState<TokenState>('loading');
    const [formData, setFormData] = useState<ResetPasswordFormData>({ password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
    const [apiError, setApiError] = useState('');
    const [success, setSuccess] = useState(false);
    // Jak w rejestracji: wymogi widoczne od wejścia w pole i dopóki coś w nim stoi.
    const [passwordFocused, setPasswordFocused] = useState(false);

    const resetPasswordMutation = useResetPassword();

    useEffect(() => {
        if (!token) {
            setTokenState('invalid');
            return;
        }

        authApi.validateResetToken(token)
            .then((res) => setTokenState(res.valid ? 'valid' : 'invalid'))
            .catch(() => setTokenState('invalid'));
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setApiError('');

        const result = resetPasswordSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
            // Pierwszy zarzut, nie ostatni: zod zgłasza je w kolejności sprawdzeń,
            // więc dla pustego pola pierwszy mówi „jest wymagane", a kolejny już
            // „nieprawidłowy format" - i to ten drugi widział użytkownik, który
            // po prostu niczego nie wpisał.
            result.error.issues.forEach((err) => {
                const field = err.path[0] as keyof ResetPasswordFormData | undefined;
                if (field && !fieldErrors[field]) {
                    fieldErrors[field] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            await resetPasswordMutation.mutateAsync({ token, ...formData });
            setSuccess(true);
        } catch (error: any) {
            const message = error?.response?.data?.message || t.auth.errors.serverError;
            setApiError(message);
        }
    };

    if (tokenState === 'loading') {
        return (
            <AuthLayout statement={statement}>
                <AuthHeading>
                    <h1>{copy.title}</h1>
                    <p>{t.common.loading}</p>
                </AuthHeading>
            </AuthLayout>
        );
    }

    if (tokenState === 'invalid') {
        return (
            <AuthLayout statement={statement}>
                <AuthHeading>
                    <h1>{copy.expiredTitle}</h1>
                    <p>{copy.expiredMessage}</p>
                </AuthHeading>
                <AuthPrimaryButton
                    type="button"
                    onClick={() => window.location.href = mode === 'setup' ? '/login' : '/forgot-password'}
                >
                    {copy.expiredAction}
                </AuthPrimaryButton>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout statement={statement}>
            <AuthHeading>
                <h1>{copy.title}</h1>
                <p>{copy.subtitle}</p>
            </AuthHeading>

            {apiError && <ErrorAlert message={apiError} />}
            {success && <SuccessAlert message={copy.successMessage} />}

            {success ? (
                <AuthAside>
                    <AuthMeta>
                        <AuthLink to="/login">{copy.successAction}</AuthLink>
                    </AuthMeta>
                </AuthAside>
            ) : (
                <AuthForm onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Label htmlFor="password">{copy.passwordLabel}</Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={(value) => setFormData({ ...formData, password: value })}
                            placeholder={copy.passwordPlaceholder}
                            hasError={!!errors.password}
                            autoComplete="new-password"
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                        />
                        <PasswordRequirements
                            password={formData.password}
                            visible={passwordFocused || formData.password.length > 0}
                        />
                        {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label htmlFor="confirmPassword">{copy.confirmPasswordLabel}</Label>
                        <PasswordInput
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                            placeholder={copy.confirmPasswordPlaceholder}
                            hasError={!!errors.confirmPassword}
                            autoComplete="new-password"
                        />
                        {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
                    </FieldGroup>

                    <AuthPrimaryButton type="submit" disabled={resetPasswordMutation.isPending}>
                        {resetPasswordMutation.isPending ? copy.submitting : copy.submitButton}
                    </AuthPrimaryButton>
                </AuthForm>
            )}
        </AuthLayout>
    );
};
