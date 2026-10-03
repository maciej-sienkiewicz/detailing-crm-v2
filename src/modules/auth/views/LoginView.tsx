// src/modules/auth/views/LoginView.tsx
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useLogin, useDemoAccount } from '../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../utils/validators';
import { PasswordInput } from '../components/PasswordInput';
import { AuthInput } from '../components/AuthInput';
import { Checkbox } from '../components/Checkbox';
import { ErrorAlert } from '../components/ErrorAlert';
import { SuccessAlert } from '../components/SuccessAlert';
import { AuthLayout } from '../components/AuthLayout';
import {
    AuthAside,
    AuthForm,
    AuthHeading,
    AuthLink,
    AuthMeta,
    AuthPrimaryButton,
    AuthSecondaryButton,
} from '../components/AuthUi';
import { t } from '@/common/i18n';
import { Label, FieldGroup, ErrorMessage } from '@/common/components/Form';

const RememberMeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 14px;
`;

// 502 during login means the app is being redeployed behind the reverse proxy;
// the backend never gets to respond, so there is no error message to relay.
const getLoginErrorMessage = (error: any): string => {
    if (error?.response?.status === 502) {
        return t.auth.errors.maintenance;
    }
    return error?.response?.data?.message || t.auth.errors.serverError;
};

export const LoginView = () => {
    const location = useLocation();
    const successMessage = (location.state as { message?: string })?.message;

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [apiError, setApiError] = useState<string>('');

    const loginMutation = useLogin();
    const demoMutation = useDemoAccount();

    const handleDemoLogin = async () => {
        setApiError('');
        try {
            await demoMutation.mutateAsync();
        } catch (error: any) {
            setApiError(getLoginErrorMessage(error));
        }
    };

    const isAnyPending = loginMutation.isPending || demoMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setApiError('');

        const result = loginSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
            // Pierwszy zarzut, nie ostatni: zod zgłasza je w kolejności sprawdzeń,
            // więc dla pustego pola pierwszy mówi „jest wymagane", a kolejny już
            // „nieprawidłowy format" - i to ten drugi widział użytkownik, który
            // po prostu niczego nie wpisał.
            result.error.issues.forEach((err) => {
                const field = err.path[0] as keyof LoginFormData | undefined;
                if (field && !fieldErrors[field]) {
                    fieldErrors[field] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            await loginMutation.mutateAsync(formData);
        } catch (error: any) {
            setApiError(getLoginErrorMessage(error));
        }
    };

    return (
        <AuthLayout statement={t.auth.gate.login}>
            <AuthHeading>
                <h1>{t.auth.login.title}</h1>
                <p>{t.auth.login.subtitle}</p>
            </AuthHeading>

            {successMessage && <SuccessAlert message={successMessage} />}
            {apiError && <ErrorAlert message={apiError} />}

            <AuthForm onSubmit={handleSubmit}>
                <FieldGroup>
                    <Label htmlFor="email">{t.auth.login.emailLabel}</Label>
                    <AuthInput
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="email"
                        placeholder={t.auth.login.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        $hasError={!!errors.email}
                    />
                    {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                </FieldGroup>

                <FieldGroup>
                    <Label htmlFor="password">{t.auth.login.passwordLabel}</Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={(value) => setFormData({ ...formData, password: value })}
                        placeholder={t.auth.login.passwordPlaceholder}
                        hasError={!!errors.password}
                        autoComplete="current-password"
                    />
                    {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
                </FieldGroup>

                <RememberMeRow>
                    <Checkbox
                        id="rememberMe"
                        checked={formData.rememberMe}
                        onChange={(checked) => setFormData({ ...formData, rememberMe: checked })}
                        label={t.auth.login.rememberMe}
                    />
                    <AuthLink to="/forgot-password">{t.auth.login.forgotPassword}</AuthLink>
                </RememberMeRow>

                <AuthPrimaryButton type="submit" disabled={isAnyPending}>
                    {loginMutation.isPending ? t.auth.login.submitting : t.auth.login.submitButton}
                </AuthPrimaryButton>
            </AuthForm>

            <AuthAside>
                <AuthSecondaryButton type="button" onClick={handleDemoLogin} disabled={isAnyPending}>
                    {demoMutation.isPending ? t.auth.login.demoSubmitting : t.auth.login.demoButton}
                </AuthSecondaryButton>
                <AuthMeta>{t.auth.login.demoInfo}</AuthMeta>
                <AuthMeta>
                    {t.auth.login.noAccount} <AuthLink to="/signup">{t.auth.login.signupLink}</AuthLink>
                </AuthMeta>
            </AuthAside>
        </AuthLayout>
    );
};
