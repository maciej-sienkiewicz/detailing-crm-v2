// src/modules/push/components/PushPairingCard.tsx
//
// Parowanie TEGO urządzenia do powiadomień push - jeden komponent dla obu miejsc,
// w których się to robi: strony /call-device (otwieranej z kodu QR na telefonie)
// oraz Ustawień → Urządzenia mobilne → Powiadomienia.
//
// Wcześniej każde z tych miejsc miało własną wersję tej samej logiki i tylko strona
// /call-device pokazywała, co jest nie tak (brak PWA na iOS, zablokowane
// powiadomienia). Panel w ustawieniach po cichu chował przycisk i zostawiał sam kod
// QR - czyli na telefonie nie dawał się użyć w ogóle: nie da się zeskanować
// własnego ekranu.

import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { isIosDevice } from '../utils/webPush';
import type { usePushDevice } from '../hooks/usePushDevice';

type PushDevice = ReturnType<typeof usePushDevice>;

interface Props {
    push: PushDevice;
    /**
     * Napis na przycisku. Na telefonie „ten telefon", w ustawieniach na komputerze
     * neutralne „to urządzenie" - użytkownik i tak widzi, gdzie stoi.
     */
    actionLabel?: string;
}

/** Komunikat błędu parowania - po przyczynie, nie po ogólnym „spróbuj ponownie". */
function pairingErrorMessage(error: unknown): string {
    const code = error instanceof Error ? error.message : '';
    if (code === 'permission-denied') {
        return isIosDevice()
            ? 'Powiadomienia są zablokowane. Włącz je w Ustawieniach iPhone’a → Powiadomienia → ta aplikacja.'
            : 'Powiadomienia są zablokowane. Odblokuj je w ustawieniach przeglądarki dla tej strony.';
    }
    if (code === 'sw-unavailable') {
        return 'Nie udało się uruchomić tła aplikacji. Odśwież stronę i spróbuj ponownie - ' +
            'w trybie prywatnym przeglądarki powiadomienia nie działają.';
    }
    if (code === 'subscription-incomplete') {
        return 'Przeglądarka zwróciła niekompletną subskrypcję. Odśwież stronę i spróbuj ponownie.';
    }
    return 'Spróbuj ponownie.';
}

export function PushPairingCard({ push, actionLabel = 'Włącz powiadomienia na tym urządzeniu' }: Props) {
    const { showError, showSuccess } = useToast();

    const handleEnable = async () => {
        try {
            await push.enable();
            showSuccess('Powiadomienia włączone', 'To urządzenie będzie dostawać powiadomienia z CRM.');
        } catch (error) {
            showError('Nie udało się włączyć powiadomień', pairingErrorMessage(error));
        }
    };

    const handleDisable = async () => {
        try {
            await push.disable();
            showSuccess('Powiadomienia wyłączone', 'To urządzenie nie będzie już ich dostawać.');
        } catch {
            showError('Nie udało się wyłączyć', 'Spróbuj ponownie.');
        }
    };

    // Kolejność warunków ma znaczenie: iPhone poza PWA nie ma API push w ogóle,
    // więc bez tego sprawdzenia dostałby mylny komunikat „przeglądarka nie obsługuje".
    if (push.iosNeedsInstall) {
        return (
            <StatusBadge>
                <WarnIcon />
                <span>
                    Na iPhonie powiadomienia działają tylko w aplikacji dodanej do ekranu głównego.
                    W Safari dotknij <strong>Udostępnij</strong> → <strong>Dodaj do ekranu głównego</strong>,
                    otwórz aplikację z ikony i wróć w to miejsce.
                </span>
            </StatusBadge>
        );
    }

    if (push.support === 'unsupported') {
        return (
            <StatusBadge>
                <WarnIcon />
                <span>Ta przeglądarka nie obsługuje powiadomień push.</span>
            </StatusBadge>
        );
    }

    if (push.support === 'denied') {
        return (
            <StatusBadge>
                <WarnIcon />
                <span>
                    Powiadomienia są zablokowane dla tej aplikacji.{' '}
                    {isIosDevice()
                        ? 'Włącz je w Ustawieniach iPhone’a → Powiadomienia → ta aplikacja, potem odśwież.'
                        : 'Odblokuj je w ustawieniach przeglądarki dla tej strony i odśwież.'}
                </span>
            </StatusBadge>
        );
    }

    if (push.isSubscribedHere) {
        return (
            <Stack>
                <StatusBadge $ok>
                    <CheckIcon />
                    <span>To urządzenie odbiera powiadomienia z CRM.</span>
                </StatusBadge>
                <SecondaryBtn type="button" onClick={handleDisable} disabled={push.isDisabling}>
                    {push.isDisabling ? 'Wyłączam…' : 'Wyłącz na tym urządzeniu'}
                </SecondaryBtn>
            </Stack>
        );
    }

    return (
        <Stack>
            <PrimaryBtn type="button" onClick={handleEnable} disabled={push.isEnabling}>
                <BellIcon />
                {push.isEnabling ? 'Włączam…' : actionLabel}
            </PrimaryBtn>
            <Hint>
                Przeglądarka zapyta o zgodę - wybierz <strong>Zezwól</strong>.
                Powiadomienia przychodzą także przy zamkniętej aplikacji.
            </Hint>
        </Stack>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
`;

const StatusBadge = styled.div<{ $ok?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 11px 14px;
    border-radius: 10px;
    background: ${p => (p.$ok ? '#f0fdf4' : '#fffbeb')};
    border: 1px solid ${p => (p.$ok ? '#bbf7d0' : '#fde68a')};
    color: ${p => (p.$ok ? '#15803d' : '#92400e')};
    font-size: 13px;
    line-height: 1.55;
    font-weight: 500;

    strong { font-weight: 700; }
    svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
`;

const PrimaryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 18px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 10px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.22);
    transition: background 0.15s, transform 0.1s;

    svg { width: 16px; height: 16px; }
    &:hover:not(:disabled) { background: #0284c7; }
    &:active:not(:disabled) { transform: scale(0.98); }
    &:disabled { opacity: 0.6; cursor: default; }

    /* Na telefonie to jedyna akcja na ekranie - niech będzie na pełną szerokość. */
    @media (max-width: 600px) { width: 100%; }
`;

const SecondaryBtn = styled.button`
    padding: 8px 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;

    &:hover:not(:disabled) { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.3); color: #dc2626; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.55;

    strong { color: #0f172a; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const WarnIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const BellIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);
