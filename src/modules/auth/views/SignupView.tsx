
// src/modules/auth/views/SignupView.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useSignup } from '../hooks/useAuth';
import { signupSchema, type SignupFormData } from '../utils/validators';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { Checkbox } from '../components/Checkbox';
import { ErrorAlert } from '../components/ErrorAlert';
import { t } from '@/common/i18n';
import { Input, Label, FieldGroup, ErrorMessage, FormGrid } from '@/common/components/Form';
import { Button } from '@/common/components/Button';

const Container = styled.div`
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
`;

const Card = styled.div`
    width: 100%;
    max-width: 540px;
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.xl};
    padding: ${props => props.theme.spacing.xl};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const LogoContainer = styled.div`
    text-align: center;
    margin-bottom: ${props => props.theme.spacing.xl};
`;

const Logo = styled.div`
    width: 64px;
    height: 64px;
    margin: 0 auto ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    border-radius: ${props => props.theme.radii.lg};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: ${props => props.theme.fontWeights.bold};
    color: white;
    box-shadow: ${props => props.theme.shadows.lg};
`;

const Title = styled.h1`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.xs} 0;
`;

const Subtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textMuted};
    margin: 0;
`;

const Form = styled.form`
    margin-top: ${props => props.theme.spacing.xl};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const TermsLabel = styled.span`
    a {
        color: ${props => props.theme.colors.primary};
        font-weight: ${props => props.theme.fontWeights.semibold};
        transition: color ${props => props.theme.transitions.fast};

        &:hover {
            color: #0284c7;
        }
    }
`;

const Footer = styled.div`
    margin-top: ${props => props.theme.spacing.xl};
    text-align: center;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const FooterLink = styled(Link)`
    color: ${props => props.theme.colors.primary};
    font-weight: ${props => props.theme.fontWeights.semibold};
    transition: color ${props => props.theme.transitions.fast};

    &:hover {
        color: #0284c7;
    }
`;

export const SignupView = () => {
    const [formData, setFormData] = useState<SignupFormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
    const [apiError, setApiError] = useState<string>('');

    const signupMutation = useSignup();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setApiError('');

        const result = signupSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {};
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as keyof SignupFormData] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            await signupMutation.mutateAsync(formData);
        } catch (error: any) {
            const message = error?.response?.data?.message || t.auth.errors.serverError;
            setApiError(message);
        }
    };

    return (
        <Container>
            <Card>
                <LogoContainer>
                    <Logo>D</Logo>
                    <Title>{t.auth.signup.title}</Title>
                    <Subtitle>{t.auth.signup.subtitle}</Subtitle>
                </LogoContainer>

                {apiError && <ErrorAlert message={apiError} />}

                <Form onSubmit={handleSubmit}>
                    <FormGrid $columns={2}>
                        <FieldGroup>
                            <Label htmlFor="firstName">{t.auth.signup.firstNameLabel}</Label>
                            <Input
                                type="text"
                                id="firstName"
                                name="given-name"
                                autoComplete="given-name"
                                placeholder={t.auth.signup.firstNamePlaceholder}
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                            {errors.firstName && <ErrorMessage>{errors.firstName}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label htmlFor="lastName">{t.auth.signup.lastNameLabel}</Label>
                            <Input
                                type="text"
                                id="lastName"
                                name="family-name"
                                autoComplete="family-name"
                                placeholder={t.auth.signup.lastNamePlaceholder}
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                            {errors.lastName && <ErrorMessage>{errors.lastName}</ErrorMessage>}
                        </FieldGroup>
                    </FormGrid>

                    <FieldGroup>
                        <Label htmlFor="email">{t.auth.signup.emailLabel}</Label>
                        <Input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            placeholder={t.auth.signup.emailPlaceholder}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                        />
                        <PasswordStrengthIndicator password={formData.password} />
                        {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label htmlFor="confirmPassword">{t.auth.signup.confirmPasswordLabel}</Label>
                        <PasswordInput
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                            placeholder={t.auth.signup.confirmPasswordPlaceholder}
                            hasError={!!errors.confirmPassword}
                            autoComplete="new-password"
                        />
                        {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
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

                    <Button
                        type="submit"
                        $variant="primary"
                        $fullWidth
                        $size="lg"
                        disabled={signupMutation.isPending}
                    >
                        {signupMutation.isPending ? t.auth.signup.submitting : t.auth.signup.submitButton}
                    </Button>
                </Form>

                <Footer>
                    {t.auth.signup.hasAccount}{' '}
                    <FooterLink to="/login">{t.auth.signup.loginLink}</FooterLink>
                </Footer>
            </Card>
        </Container>
    );
};
