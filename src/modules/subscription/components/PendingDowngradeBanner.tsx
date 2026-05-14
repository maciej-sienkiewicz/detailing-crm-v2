import { useToast } from '@/common/components/Toast';
import { useCancelPendingPlanChange } from '../api/subscriptionQueries';
import type { PendingDowngrade } from '../types';
import { formatDate } from '../utils/formatters';
import {
    Banner,
    BannerIcon,
    BannerBody,
    BannerTitle,
    BannerText,
    BannerActions,
    CancelBtn,
} from './PendingDowngradeBanner.styles';

interface Props {
    pendingDowngrade: PendingDowngrade;
}

const ClockIcon = () => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </svg>
);

export function PendingDowngradeBanner({ pendingDowngrade }: Props) {
    const { showSuccess, showError } = useToast();
    const cancel = useCancelPendingPlanChange();

    const handleCancel = async () => {
        try {
            await cancel.mutateAsync();
            showSuccess('Zmiana anulowana', 'Zaplanowany downgrade został odwołany.');
        } catch {
            showError('Błąd', 'Nie udało się anulować zmiany planu. Spróbuj ponownie.');
        }
    };

    return (
        <Banner>
            <BannerIcon>
                <ClockIcon />
            </BannerIcon>
            <BannerBody>
                <BannerTitle>Zaplanowana zmiana planu</BannerTitle>
                <BannerText>
                    Twój plan zostanie zmieniony na <strong>{pendingDowngrade.toPlanName}</strong>{' '}
                    dnia <strong>{formatDate(pendingDowngrade.effectiveAt)}</strong>.
                    Do tego czasu masz pełny dostęp do obecnego planu.
                </BannerText>
            </BannerBody>
            <BannerActions>
                <CancelBtn
                    onClick={handleCancel}
                    disabled={cancel.isPending}
                >
                    {cancel.isPending ? 'Anulowanie…' : 'Anuluj zmianę'}
                </CancelBtn>
            </BannerActions>
        </Banner>
    );
}
