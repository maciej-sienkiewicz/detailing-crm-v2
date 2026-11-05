import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useToast } from '@/common/components/Toast';
import { pushApi } from '../api/pushApi';
import { problemDetail } from '@/core/problem';

/**
 * The DESKTOP half of Click-to-Call: click a customer's number → the user's
 * phone shows a "Zadzwoń" notification. All feedback goes through toasts;
 * the component only calls `requestCall(phone, name)`.
 */
export const useClickToCall = () => {
    const { showSuccess, showError, showInfo } = useToast();

    const mutation = useMutation({
        mutationFn: (params: { phoneNumber: string; displayName?: string }) =>
            pushApi.requestCall(params),
        onSuccess: result => {
            if (result.deliveredDevices > 0) {
                showSuccess('Połączenie wysłane na telefon - odbierz powiadomienie i zadzwoń.');
            } else {
                // Push service accepted nothing (all sends failed server-side).
                showError('Nie udało się dostarczyć powiadomienia na telefon. Spróbuj ponownie.');
            }
        },
        onError: error => {
            // 422 = valid click the server cannot carry out - an onboarding nudge, not an error.
            // Two reasons: no paired phone, or the paired phone has „Dzwonienie z komputera”
            // switched off. The server says which; the toast used to always claim the first.
            if (isAxiosError(error) && error.response?.status === 422) {
                showInfo(
                    problemDetail(error)
                        ?? 'Nie masz sparowanego telefonu. Sparuj go w Ustawieniach → Telefon → Dzwonienie z komputera.',
                );
                return;
            }
            showError('Nie udało się wysłać numeru na telefon.');
        },
    });

    return {
        requestCall: (phoneNumber: string, displayName?: string) =>
            mutation.mutate({ phoneNumber, displayName }),
        isRequesting: mutation.isPending,
    };
};
