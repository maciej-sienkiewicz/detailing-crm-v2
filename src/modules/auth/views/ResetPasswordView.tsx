// src/modules/auth/views/ResetPasswordView.tsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useResetPassword } from '../hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordFormData } from '../utils/validators';
import { PasswordInput } from '../components/PasswordInput';
import { ErrorAlert } from '../components/ErrorAlert';
import { SuccessAlert } from '../components/SuccessAlert';
import { authApi } from '../api/authApi';
import { t } from '@/common/i18n';
import { Label, FieldGroup, ErrorMessage } from '@/common/components/Form';
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

const ExpiredContainer = styled.div`
    margin-top: ${props => props.theme.spacing.xl};
    text-align: center;
`;

const ExpiredTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.md} 0;
`;

const ExpiredMessage = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textMuted};
    margin: 0 0 ${props => props.theme.spacing.xl} 0;
    line-height: 1.6;
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

type TokenState = 'loading' | 'valid' | 'invalid';
type ViewMode = 'reset' | 'setup';

interface ResetPasswordViewProps {
    mode?: ViewMode;
}

export const ResetPasswordView = ({ mode = 'reset' }: ResetPasswordViewProps) => {
    const copy = mode === 'setup' ? t.auth.confirmPassword : t.auth.resetPassword;
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [tokenState, setTokenState] = useState<TokenState>('loading');
    const [formData, setFormData] = useState<ResetPasswordFormData>({ password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
    const [apiError, setApiError] = useState('');
    const [success, setSuccess] = useState(false);

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
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as keyof ResetPasswordFormData] = err.message;
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
            <Container>
                <Card>
                    <LogoContainer>
                        <Logo>D</Logo>
                        <Title>{copy.title}</Title>
                    </LogoContainer>
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        {t.common.loading}
                    </p>
                </Card>
            </Container>
        );
    }

    if (tokenState === 'invalid') {
        return (
            <Container>
                <Card>
                    <LogoContainer>
                        <Logo>D</Logo>
                    </LogoContainer>
                    <ExpiredContainer>
                        <ExpiredTitle>{copy.expiredTitle}</ExpiredTitle>
                        <ExpiredMessage>{copy.expiredMessage}</ExpiredMessage>
                        <Button
                            type="button"
                            $variant="primary"
                            $fullWidth
                            $size="lg"
                            onClick={() => window.location.href = mode === 'setup' ? '/login' : '/forgot-password'}
                        >
                            {copy.expiredAction}
                        </Button>
                    </ExpiredContainer>
                </Card>
            </Container>
        );
    }

    return (
        <Container>
            <Card>
                <LogoContainer>
                    <Logo>D</Logo>
                    <Title>{copy.title}</Title>
                    <Subtitle>{copy.subtitle}</Subtitle>
                </LogoContainer>

                {apiError && <ErrorAlert message={apiError} />}
                {success && <SuccessAlert message={copy.successMessage} />}

                {success ? (
                    <Footer>
                        <FooterLink to="/login">{copy.successAction}</FooterLink>
                    </Footer>
                ) : (
                    <Form onSubmit={handleSubmit}>
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

                        <Button
                            type="submit"
                            $variant="primary"
                            $fullWidth
                            $size="lg"
                            disabled={resetPasswordMutation.isPending}
                        >
                            {resetPasswordMutation.isPending
                                ? copy.submitting
                                : copy.submitButton}
                        </Button>
                    </Form>
                )}
            </Card>
        </Container>
    );
};
