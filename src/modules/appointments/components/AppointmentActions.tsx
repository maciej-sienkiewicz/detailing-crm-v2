// src/modules/appointments/components/AppointmentActions.tsx
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/common/components/Button';
import { t } from '@/common/i18n';
import {ErrorDisplay} from "@/modules/appointments/components/common/ErrorDisplay.tsx";

const ActionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    width: 100%;
`;

const CenteredButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
    }
`;

const StyledButton = styled(Button)`
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        width: auto;
        min-width: 180px;
    }
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
        <ActionsContainer>
            <CenteredButtonGroup>
                <StyledButton
                    $variant="secondary"
                    onClick={() => navigate('/appointments')}
                    disabled={isSubmitting}
                >
                    {t.common.cancel}
                </StyledButton>
                <StyledButton
                    $variant="primary"
                    onClick={onSubmit}
                    disabled={!canSubmit || isSubmitting}
                >
                    {isSubmitting
                        ? t.appointments.createView.submitting
                        : t.appointments.createView.submitButton}
                </StyledButton>
            </CenteredButtonGroup>

            {hasError && (
                <ErrorDisplay message={t.appointments.createView.createError} />
            )}
        </ActionsContainer>
    );
};