// src/modules/auth/views/ForgotPasswordView.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useForgotPassword } from '../hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../utils/validators';
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
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as keyof ForgotPasswordFormData] = err.message;
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
        <Container>
            <Card>
                <LogoContainer>
                    <Logo>D</Logo>
                    <Title>{t.auth.forgotPassword.title}</Title>
                    <Subtitle>{t.auth.forgotPassword.subtitle}</Subtitle>
                </LogoContainer>

                {apiError && <ErrorAlert message={apiError} />}
                {submitted && <SuccessAlert message={t.auth.forgotPassword.successMessage} />}

                {!submitted && (
                    <Form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Label htmlFor="email">{t.auth.forgotPassword.emailLabel}</Label>
                            <Input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                placeholder={t.auth.forgotPassword.emailPlaceholder}
                                value={formData.email}
                                onChange={(e) => setFormData({ email: e.target.value })}
                            />
                            {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                        </FieldGroup>

                        <Button
                            type="submit"
                            $variant="primary"
                            $fullWidth
                            $size="lg"
                            disabled={forgotPasswordMutation.isPending}
                        >
                            {forgotPasswordMutation.isPending
                                ? t.auth.forgotPassword.submitting
                                : t.auth.forgotPassword.submitButton}
                        </Button>
                    </Form>
                )}

                <Footer>
                    <FooterLink to="/login">{t.auth.forgotPassword.backToLogin}</FooterLink>
                </Footer>
            </Card>
        </Container>
    );
};
