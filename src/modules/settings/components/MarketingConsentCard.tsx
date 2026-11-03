// src/modules/settings/components/MarketingConsentCard.tsx
//
// Zgoda na informacje handlowe od DetailBoost. Wycofanie ma być tak samo proste jak
// udzielenie (art. 7 ust. 3 RODO): przy rejestracji to jeden checkbox, tu jeden przełącznik.
// Każda zmiana dopisuje zdarzenie w backendzie z brzmieniem zgody, IP i przeglądarką.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { marketingConsentApi, type MarketingConsent } from '../api/marketingConsentApi';
import { SettingSwitchRow } from './SettingSwitchRow';
import { Card, CardHead, CardHeadText, CardNote, CardTitle } from './security/SecurityCard';

const QUERY_KEY = ['settings', 'marketing-consent'] as const;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

export function consentStatus(consent: MarketingConsent): string {
    if (!consent.changedAt) return 'Zgody nie udzielono.';
    return consent.granted
        ? `Zgoda udzielona ${formatDate(consent.changedAt)}.`
        : `Zgoda wycofana ${formatDate(consent.changedAt)}.`;
}

export function MarketingConsentCard() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { data, isError } = useQuery({ queryKey: QUERY_KEY, queryFn: marketingConsentApi.get });

    const save = useMutation({
        mutationFn: (granted: boolean) => marketingConsentApi.set(granted),
        onSuccess: (saved) => {
            queryClient.setQueryData(QUERY_KEY, saved);
            showSuccess(saved.granted ? 'Zgoda udzielona' : 'Zgoda wycofana');
        },
        onError: () => showError('Nie udało się zapisać zgody', 'Spróbuj jeszcze raz.'),
    });

    return (
        <Card aria-labelledby="marketing-consent-title">
            <CardHead>
                <CardHeadText>
                    <CardTitle id="marketing-consent-title">Informacje handlowe</CardTitle>
                    <CardNote>
                        {isError
                            ? 'Nie udało się wczytać zgody. Sprawdź połączenie z internetem.'
                            : data?.wording ?? 'Wczytywanie zgody…'}
                    </CardNote>
                </CardHeadText>
            </CardHead>
            <SettingSwitchRow
                label="Informacje handlowe e-mailem"
                hint={data ? consentStatus(data) : undefined}
                checked={data?.granted}
                onChange={(next) => save.mutate(next)}
                disabled={save.isPending}
            />
        </Card>
    );
}
