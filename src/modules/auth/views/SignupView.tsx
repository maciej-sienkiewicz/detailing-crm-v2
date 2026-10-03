
// src/modules/auth/views/SignupView.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useSignup } from '../hooks/useAuth';
import { signupSchema, type SignupFormData } from '../utils/validators';
import { PasswordInput } from '../components/PasswordInput';
import { AuthInput } from '../components/AuthInput';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { Checkbox } from '../components/Checkbox';
import { ErrorAlert } from '../components/ErrorAlert';
import { t } from '@/common/i18n';
import { Label, FieldGroup, ErrorMessage, FormGrid } from '@/common/components/Form';
import { AuthLayout } from '../components/AuthLayout';
import { AuthAside, AuthForm, AuthHeading, AuthLink, AuthMeta, AuthPrimaryButton } from '../components/AuthUi';

// Linki do regulaminu i polityki w treści zgody - jak pozostałe linki bramy.
const TermsLabel = styled.span`
    a {
        color: #0f172a;
        font-weight: 600;
        text-decoration: underline;
        text-decoration-color: rgba(15, 23, 42, 0.25);
        text-underline-offset: 3px;

        &:hover {
            text-decoration-color: currentColor;
        }
    }
`;

export const SignupView = () => {
    const [formData, setFormData] = useState<SignupFormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        acceptTerms: false,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
    const [apiError, setApiError] = useState<string>('');
    // Wymogi hasła pokazujemy od wejścia w pole, a potem dopóki cokolwiek w nim
    // stoi - listę trzeba znać PRZED pisaniem, a po wyjściu z pola wciąż bywa
    // potrzebna (użytkownik poprawia hasło po zobaczeniu błędu niżej).
    const [passwordFocused, setPasswordFocused] = useState(false);

    const signupMutation = useSignup();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setApiError('');

        const result = signupSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {};
            // Pierwszy zarzut, nie ostatni: zod zgłasza je w kolejności sprawdzeń,
            // więc dla pustego pola pierwszy mówi „jest wymagane", a kolejny już
            // „nieprawidłowy format" - i to ten drugi widział użytkownik, który
            // po prostu niczego nie wpisał.
            result.error.issues.forEach((err) => {
                const field = err.path[0] as keyof SignupFormData | undefined;
                if (field && !fieldErrors[field]) {
                    fieldErrors[field] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            await signupMutation.mutateAsync({ ...formData, confirmPassword: formData.password });
        } catch (error: any) {
            const message = error?.response?.data?.message || t.auth.errors.serverError;
            setApiError(message);
        }
    };

    return (
        <AuthLayout statement={t.auth.gate.signup} points={t.auth.gate.signupPoints}>
            <AuthHeading>
                <h1>{t.auth.signup.title}</h1>
                <p>{t.auth.signup.subtitle}</p>
            </AuthHeading>

            {apiError && <ErrorAlert message={apiError} />}

            <AuthForm onSubmit={handleSubmit}>
                <FormGrid $columns={2}>
                    <FieldGroup>
                        <Label htmlFor="firstName">{t.auth.signup.firstNameLabel}</Label>
                        <AuthInput
                            type="text"
                            id="firstName"
                            name="given-name"
                            autoComplete="given-name"
                            placeholder={t.auth.signup.firstNamePlaceholder}
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            $hasError={!!errors.firstName}
                        />
                        {errors.firstName && <ErrorMessage>{errors.firstName}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label htmlFor="lastName">{t.auth.signup.lastNameLabel}</Label>
                        <AuthInput
                            type="text"
                            id="lastName"
                            name="family-name"
                            autoComplete="family-name"
                            placeholder={t.auth.signup.lastNamePlaceholder}
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            $hasError={!!errors.lastName}
                        />
                        {errors.lastName && <ErrorMessage>{errors.lastName}</ErrorMessage>}
                    </FieldGroup>
                </FormGrid>

                <FieldGroup>
                    <Label htmlFor="email">{t.auth.signup.emailLabel}</Label>
                    <AuthInput
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="email"
                        placeholder={t.auth.signup.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        $hasError={!!errors.email}
                    />
                    {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                </FieldGroup>

                <FieldGroup>
                    <Label htmlFor="password">{t.auth.signup.passwordLabel}</Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={(value) => setFormData({ ...formData, password: value })}
                        placeholder={t.auth.signup.passwordPlaceholder}
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
                    <Checkbox
                        id="acceptTerms"
                        checked={formData.acceptTerms}
                        onChange={(checked) => setFormData({ ...formData, acceptTerms: checked })}
                        hasError={!!errors.acceptTerms}
                        label={
                            <TermsLabel>
                                {t.auth.signup.acceptTerms}{' '}
                                <a href="/terms" target="_blank" rel="noopener noreferrer">
                                    {t.auth.signup.termsLink}
                                </a>{' '}
                                {t.auth.signup.and}{' '}
                                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                                    {t.auth.signup.privacyLink}
                                </a>
                            </TermsLabel>
                        }
                    />
                    {errors.acceptTerms && <ErrorMessage>{errors.acceptTerms}</ErrorMessage>}
                </FieldGroup>

                <AuthPrimaryButton type="submit" disabled={signupMutation.isPending}>
                    {signupMutation.isPending ? t.auth.signup.submitting : t.auth.signup.submitButton}
                </AuthPrimaryButton>
            </AuthForm>

            <AuthAside>
                <AuthMeta>
                    {t.auth.signup.hasAccount} <AuthLink to="/login">{t.auth.signup.loginLink}</AuthLink>
                </AuthMeta>
            </AuthAside>
        </AuthLayout>
    );
};
