import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { PinSetupSection } from '@/modules/pin-switcher';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import { authApi } from '@/modules/auth/api/authApi';
import { useIdleTimeoutSetting, useSetIdleTimeout } from '../hooks/useIdleTimeout';
import { DangerZoneCard } from './account/DangerZoneCard';

/** Zgodne z backendem (PasswordResetProperties): link żyje 30 minut, kolejny da się wysłać po minucie. */
const RESET_LINK_TTL_MINUTES = 30;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const SectionHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
`;

const SectionDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
`;

const Card = styled.div`
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const CardDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    flex-wrap: wrap;
`;

const Select = styled.select`
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    background: #fff;
    cursor: pointer;
    min-width: 160px;

    &:focus { outline: none; border-color: #6366f1; }
`;

const SaveBtn = styled.button<{ $loading?: boolean }>`
    padding: 8px 18px;
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    opacity: ${({ $loading }) => ($loading ? 0.7 : 1)};
    transition: opacity 150ms, background 150ms;

    &:hover:not(:disabled) { background: #4f46e5; }
    &:disabled { cursor: not-allowed; }
`;

const SavedMsg = styled.span`
    font-size: 13px;
    color: #16a34a;
    font-weight: 500;
`;

const TIMEOUT_OPTIONS = [
    { label: 'Wyłączone', value: 0 },
    { label: '10 sekund (test)', value: 10 },
    { label: '1 minuta', value: 60 },
    { label: '5 minut', value: 300 },
    { label: '10 minut', value: 600 },
    { label: '15 minut', value: 900 },
    { label: '30 minut', value: 1800 },
    { label: '60 minut', value: 3600 },
];

const IdleTimeoutCard = () => {
    const { data, isLoading } = useIdleTimeoutSetting();
    const { mutate, isPending } = useSetIdleTimeout();
    const [value, setValue] = useState<number | null>(null);
    const [saved, setSaved] = useState(false);

    const current = value ?? data?.idleTimeoutSeconds ?? 0;

    const handleSave = () => {
        mutate(current, {
            onSuccess: () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            },
        });
    };

    if (isLoading) return null;

    return (
        <Card>
            <CardTitle>Automatyczne blokowanie sesji</CardTitle>
            <CardDesc>
                Jeśli użytkownik nie wykona żadnej akcji przez wybrany czas, aplikacja wyświetli ekran
                blokady i zażąda kodu PIN lub hasła przed wznowieniem. Ustawienie dotyczy wszystkich
                kont w ramach Twojego studia.
            </CardDesc>
            <Row>
                <Select
                    value={current}
                    onChange={e => { setValue(Number(e.target.value)); setSaved(false); }}
                >
                    {TIMEOUT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </Select>
                <SaveBtn onClick={handleSave} disabled={isPending} $loading={isPending}>
                    {isPending ? 'Zapisywanie...' : 'Zapisz'}
                </SaveBtn>
                {saved && <SavedMsg>Zapisano</SavedMsg>}
            </Row>
        </Card>
    );
};

const FieldLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #94a3b8;
`;

const FieldValue = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    word-break: break-all;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.5;
`;

/**
 * Adres e-mail konta i reset hasła.
 *
 * Reset idzie tą samą drogą co „nie pamiętam hasła" z ekranu logowania:
 * backend wysyła na adres konta link ważny 30 minut. Świadomie nie robimy
 * zmiany hasła na miejscu — nie ma endpointu, który weryfikowałby stare hasło
 * zalogowanego użytkownika, a zmiana bez tej weryfikacji oznaczałaby, że
 * porzucony na chwilę, odblokowany ekran wystarczy do przejęcia konta.
 * Link na skrzynkę wymaga dostępu do poczty, więc trzyma ten sam poziom.
 */
const AccountCard = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [isSending, setIsSending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const startCooldown = () => {
        setCooldown(RESET_REQUEST_COOLDOWN_SECONDS);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCooldown(seconds => {
                if (seconds <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return seconds - 1;
            });
        }, 1000);
    };

    const email = user?.email ?? '';

    const handleReset = async () => {
        if (!email) return;
        setIsSending(true);
        try {
            await authApi.forgotPassword({ email });
            showSuccess(
                'Link wysłany',
                `Sprawdź skrzynkę ${email}. Link do ustawienia nowego hasła jest ważny ${RESET_LINK_TTL_MINUTES} minut.`
            );
            startCooldown();
        } catch {
            showError('Nie udało się wysłać linku', 'Spróbuj ponownie za chwilę.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card>
            <CardTitle>Twoje konto</CardTitle>
            <Field>
                <FieldLabel>Adres e-mail</FieldLabel>
                <FieldValue>{email || 'Brak adresu e-mail'}</FieldValue>
            </Field>
            <CardDesc>
                Tym adresem logujesz się do systemu i na niego wysyłamy link do zmiany hasła.
                Zmianę adresu zgłoś administratorowi studia.
            </CardDesc>
            <Row>
                <SaveBtn
                    onClick={handleReset}
                    disabled={!email || isSending || cooldown > 0}
                    $loading={isSending}
                >
                    {isSending
                        ? 'Wysyłanie...'
                        : cooldown > 0
                            ? `Wyślij ponownie za ${cooldown} s`
                            : 'Wyślij link do zmiany hasła'}
                </SaveBtn>
            </Row>
            <Hint>
                Link jest ważny {RESET_LINK_TTL_MINUTES} minut i można go użyć raz. Po ustawieniu
                nowego hasła zaloguj się nim ponownie na pozostałych urządzeniach.
            </Hint>
        </Card>
    );
};

export const SecuritySection = () => {
    const { user } = useAuth();
    const isOwner = user?.role?.toLowerCase() === 'owner';

    return (
        <Wrap>
            <SectionHeader>
                <SectionTitle>Bezpieczeństwo</SectionTitle>
                <SectionDesc>Zarządzaj ustawieniami bezpieczeństwa konta.</SectionDesc>
            </SectionHeader>
            <AccountCard />
            <PinSetupSection />
            {isOwner && <IdleTimeoutCard />}
            {isOwner && <DangerZoneCard />}
        </Wrap>
    );
};
