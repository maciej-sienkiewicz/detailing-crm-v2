// src/modules/appointments/components/AppointmentActions.tsx
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { t } from '@/common/i18n';
import { ErrorDisplay } from './common/ErrorDisplay';

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    flex-direction: column;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
    }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    border: none;
    flex: 1;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
    }

    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: ${props.theme.shadows.lg};
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    ` : `
        background-color: ${props.theme.colors.surface};
        color: ${props.theme.colors.text};
        border: 1px solid ${props.theme.colors.border};

        &:hover:not(:disabled) {
            background-color: ${props.theme.colors.surfaceHover};
        }
    `}
`;

interface AppointmentActionsProps {
    onSubmit: () => void;
    canSubmit: boolean;
    isSubmitting: boolean;
    hasError: boolean;
}

export const AppointmentActions = ({
                                       onSubmit,
                                       canSubmit,
                                       isSubmitting,
                                       hasError
                                   }: AppointmentActionsProps) => {
    const navigate = useNavigate();

    return (
        <>
            <ButtonGroup>
                <Button
                    $variant="secondary"
                    onClick={() => navigate('/appointments')}
                    disabled={isSubmitting}
                >
                    {t.common.cancel}
                </Button>
                <Button
                    $variant="primary"
                    onClick={onSubmit}
                    disabled={!canSubmit || isSubmitting}
                >
                    {isSubmitting
                        ? t.appointments.createView.submitting
                        : t.appointments.createView.submitButton}
                </Button>
            </ButtonGroup>

            {hasError && (
                <ErrorDisplay message={t.appointments.createView.createError} />
            )}
        </>
    );
};