import { useNavigate } from 'react-router-dom';
import { Button, ButtonGroup } from '@/common/components/Button';
import { t } from '@/common/i18n';
import {ErrorDisplay} from "@/modules/appointments/components/common/ErrorDisplay.tsx";

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