// src/modules/auth/views/LoginView.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useLogin, useDemoAccount } from '../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../utils/validators';
import { PasswordInput } from '../components/PasswordInput';
import { Checkbox } from '../components/Checkbox';
import { ErrorAlert } from '../components/ErrorAlert';
import { SuccessAlert } from '../components/SuccessAlert';
import { t } from '@/common/i18n';
import { Input, Label, FieldGroup, ErrorMessage } from '@/common/components/Form';
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
    max-width: 440px;
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

const RememberMeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.md};
`;

const ForgotLink = styled(Link)`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.primary};
    font-weight: ${props => props.theme.fontWeights.medium};
    transition: color ${props => props.theme.transitions.fast};

    &:hover {
        color: #0284c7;
    }
`;

const DemoSection = styled.div`
    margin-top: ${props => props.theme.spacing.xl};
`;

const DemoSeparator = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};

    &::before,
    &::after {
        content: '';
        flex: 1;
        height: 1px;
        background-color: ${props => props.theme.colors.border};
    }

    span {
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.theme.colors.textMuted};
        white-space: nowrap;
    }
`;

const DemoButton = styled.button<{ disabled?: boolean }>`
    width: 100%;
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    transition: all ${props => props.theme.transitions.normal};
    border: none;
    background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
    opacity: ${props => props.disabled ? 0.6 : 1};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }
`;

const DemoIcon = styled.span`
    font-size: 20px;
    line-height: 1;
`;

const DemoInfo = styled.p`
    margin: ${props => props.theme.spacing.md} 0 0;
    text-align: center;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    line-height: 1.4;
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
            const message = error?.response?.data?.message || t.auth.errors.serverError;
            setApiError(message);
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
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as keyof LoginFormData] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        try {
            await loginMutation.mutateAsync(formData);
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
                    <Title>{t.auth.login.title}</Title>
                    <Subtitle>{t.auth.login.subtitle}</Subtitle>
                </LogoContainer>

                {successMessage && <SuccessAlert message={successMessage} />}
                {apiError && <ErrorAlert message={apiError} />}

                <Form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Label htmlFor="email">{t.auth.login.emailLabel}</Label>
                        <Input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            placeholder={t.auth.login.emailPlaceholder}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                        <ForgotLink to="/forgot-password">
                            {t.auth.login.forgotPassword}
                        </ForgotLink>
                    </RememberMeRow>

                    <Button
                        type="submit"
                        $variant="primary"
                        $fullWidth
                        $size="lg"
                        disabled={isAnyPending}
                    >
                        {loginMutation.isPending ? t.auth.login.submitting : t.auth.login.submitButton}
                    </Button>
                </Form>

                <DemoSection>
                    <DemoSeparator>
                        <span>{t.auth.login.demoSeparator}</span>
                    </DemoSeparator>
                    <DemoButton
                        type="button"
                        onClick={handleDemoLogin}
                        disabled={isAnyPending}
                    >
                        <DemoIcon>▶</DemoIcon>
                        {demoMutation.isPending ? t.auth.login.demoSubmitting : t.auth.login.demoButton}
                    </DemoButton>
                    <DemoInfo>{t.auth.login.demoInfo}</DemoInfo>
                </DemoSection>

                <Footer>
                    {t.auth.login.noAccount}{' '}
                    <FooterLink to="/signup">{t.auth.login.signupLink}</FooterLink>
                </Footer>
            </Card>
        </Container>
    );
};
