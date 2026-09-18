import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import { authApi } from '@/modules/auth/api/authApi';
import { useIdleTimeoutSetting, useSetIdleTimeout } from '../hooks/useIdleTimeout';
import { ClearAccountModal } from './account/ClearAccountModal';
import { PinCard } from './security/PinCard';
import {
    Card, CardHead, CardHeadText, CardTitle, CardNote, CardActions, CardValue,
    OutlineBtn, DangerBtn, Select, StateTag,
} from './security/SecurityCard';

/** Zgodne z backendem (PasswordResetProperties): link żyje 30 minut, kolejny da się wysłać po minucie. */
const RESET_LINK_TTL_MINUTES = 30;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const TIMEOUT_OPTIONS = [
    { label: 'Wyłączona', value: 0 },
    { label: 'Po 1 minucie', value: 60 },
    { label: 'Po 5 minutach', value: 300 },
    { label: 'Po 10 minutach', value: 600 },
    { label: 'Po 15 minutach', value: 900 },
    { label: 'Po 30 minutach', value: 1800 },
    { label: 'Po 60 minutach', value: 3600 },
];

/**
 * Automatyczna blokada ekranu po bezczynności.
 *
 * Zapis idzie od razu po wyborze, bez przycisku „Zapisz": to jedno pole, a osobny przycisk
 * kazał wykonać drugi ruch po decyzji, która już zapadła. Potwierdzeniem jest stan przy
 * liście, nie komunikat do przeczytania.
 */
const IdleLockCard = () => {
    const { data, isLoading } = useIdleTimeoutSetting();
    const { mutate, isPending } = useSetIdleTimeout();
    const [value, setValue] = useState<number | null>(null);
    const [saved, setSaved] = useState(false);
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

    if (isLoading) return null;

    const current = value ?? data?.idleTimeoutSeconds ?? 0;

    const change = (next: number) => {
        setValue(next);
        setSaved(false);
        mutate(next, {
            onSuccess: () => {
                setSaved(true);
                if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
                savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
            },
        });
    };

    return (
        <Card>
            <CardHead>
                <CardHeadText>
                    <CardTitle>Blokada po bezczynności</CardTitle>
                    <CardNote>Dotyczy wszystkich kont w studiu. Odblokowanie kodem PIN lub hasłem.</CardNote>
                </CardHeadText>
                <CardActions>
                    {saved && <StateTag $on>Zapisano</StateTag>}
                    <Select
                        aria-label="Czas bezczynności do zablokowania ekranu"
                        value={current}
                        disabled={isPending}
                        onChange={e => change(Number(e.target.value))}
                    >
                        {TIMEOUT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                </CardActions>
            </CardHead>
        </Card>
    );
};

/**
 * Adres e-mail konta i reset hasła.
 *
 * Reset idzie tą samą drogą co „nie pamiętam hasła" z ekranu logowania: backend wysyła na
 * adres konta link ważny 30 minut. Świadomie nie robimy zmiany hasła na miejscu - nie ma
 * endpointu, który weryfikowałby stare hasło zalogowanego użytkownika, a zmiana bez tej
 * weryfikacji oznaczałaby, że porzucony na chwilę, odblokowany ekran wystarczy do przejęcia
 * konta. Link na skrzynkę wymaga dostępu do poczty, więc trzyma ten sam poziom.
 *
 * Szczegóły (ważność linku, jednorazowość) mówi potwierdzenie po wysłaniu — na karcie
 * byłyby instrukcją do czytania przed decyzją, której nikt jeszcze nie podjął.
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
            <CardHead>
                <CardHeadText>
                    <CardTitle>Konto</CardTitle>
                    <CardValue>{email || 'Brak adresu e-mail'}</CardValue>
                </CardHeadText>
                <CardActions>
                    <OutlineBtn onClick={handleReset} disabled={!email || isSending || cooldown > 0}>
                        {isSending
                            ? 'Wysyłanie…'
                            : cooldown > 0
                                ? `Ponownie za ${cooldown} s`
                                : 'Zmień hasło'}
                    </OutlineBtn>
                </CardActions>
            </CardHead>
        </Card>
    );
};

/**
 * Wyczyszczenie konta. Czerwień siedzi w przycisku, nie w ramce karty: kolor niesie
 * ZNACZENIE akcji, a nie osobny wygląd sekcji. Sam przycisk niczego nie kasuje — pełne
 * potwierdzenie (skutki, przepisanie nazwy firmy, hasło) zbiera ClearAccountModal.
 */
const ClearAccountCard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <Card>
            <CardHead>
                <CardHeadText>
                    <CardTitle>Wyczyszczenie konta</CardTitle>
                    <CardNote>
                        Bezpowrotnie usuwa klientów, wizyty, pliki i dokumenty. Zostają: Twoje konto,
                        plan i saldo SMS.
                    </CardNote>
                </CardHeadText>
                <CardActions>
                    <DangerBtn onClick={() => setIsModalOpen(true)}>Wyczyść konto…</DangerBtn>
                </CardActions>
            </CardHead>
            <ClearAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </Card>
    );
};

export const SecuritySection = () => {
    const { user } = useAuth();
    const isOwner = user?.role?.toLowerCase() === 'owner';

    // Bez tytułu sekcji: nagłówek strony niesie już ścieżkę „Konto / Bezpieczeństwo",
    // a na telefonie tę samą nazwę pokazuje przełącznik listy sekcji. Trzeci raz to samo
    // słowo nie niesie już informacji.
    return (
        <Wrap>
            <AccountCard />
            <PinCard />
            {isOwner && <IdleLockCard />}
            {isOwner && <ClearAccountCard />}
        </Wrap>
    );
};
