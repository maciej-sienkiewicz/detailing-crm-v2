// src/modules/settings/components/AccountCards.tsx
//
// Karty dawnej sekcji „Bezpieczeństwo". Sekcja rozeszła się według tego, CZYJE jest
// ustawienie: konto, hasło i dane studia trafiły do „Moje konto" (MyAccountSection),
// a blokada po bezczynności - ustawienie urządzenia, nie osoby - do „Urządzenia
// w studiu → Ten komputer" (StudioDevicesSection).

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import { authApi } from '@/modules/auth/api/authApi';
import {
    effectiveIdleTimeoutSeconds, isPhone, setDeviceIdleTimeout, useDeviceIdleTimeout,
} from '@/core/deviceIdleLock';
import { ClearAccountModal } from './account/ClearAccountModal';
import { DeleteAccountModal } from './account/DeleteAccountModal';
import {
    Card, CardHead, CardHeadText, CardTitle, CardNote, CardActions, CardValue,
    OutlineBtn, DangerBtn, Select, StateTag,
} from './security/SecurityCard';

/** Zgodne z backendem (PasswordResetProperties): link żyje 30 minut, kolejny da się wysłać po minucie. */
const RESET_LINK_TTL_MINUTES = 30;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;

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
 * Automatyczna blokada ekranu po bezczynności - ustawienie TEGO urządzenia.
 *
 * Dawniej jedna wartość obowiązywała całe studio: komputer w recepcji na widoku klientów
 * i laptop w biurze blokowały się po tym samym czasie. Teraz każde stanowisko ma swoją
 * (src/core/deviceIdleLock.ts), wspólną dla wszystkich kont, które na nim pracują.
 * Dopóki na urządzeniu nic nie wybrano, lista pokazuje dotychczasową wartość studia -
 * tę, która naprawdę obowiązuje.
 *
 * Zapis idzie od razu po wyborze, bez przycisku „Zapisz": to jedno pole, a osobny przycisk
 * kazał wykonać drugi ruch po decyzji, która już zapadła. Potwierdzeniem jest stan przy
 * liście, nie komunikat do przeczytania.
 */
export const IdleLockCard = () => {
    const { user } = useAuth();
    const deviceSeconds = useDeviceIdleTimeout();
    const { showError } = useToast();
    const [saved, setSaved] = useState(false);
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

    // Lista pokazuje to, co naprawdę obowiązuje - na telefonie bez własnego ustawienia
    // to „Wyłączona", nie wartość studia.
    const current = effectiveIdleTimeoutSeconds(deviceSeconds, user?.idleTimeoutSeconds);
    const phoneDefault = deviceSeconds === null && isPhone();

    const change = (next: number) => {
        setSaved(false);
        if (!setDeviceIdleTimeout(next)) {
            showError(
                'Nie udało się zapisać blokady na tym urządzeniu',
                'Przeglądarka nie pozwala zapisywać ustawień (np. okno prywatne). Zostaje poprzednie ustawienie.',
            );
            return;
        }
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    };

    return (
        <Card>
            <CardHead>
                <CardHeadText>
                    <CardTitle>Blokada po bezczynności</CardTitle>
                    <CardNote>
                        Po tym czasie ekran prosi o PIN albo hasło. Każde stanowisko ustawiasz
                        osobno, więc komputer w recepcji może blokować się szybciej niż laptop w biurze.
                    </CardNote>
                    {phoneDefault && (
                        <CardNote>
                            Na telefonie blokada jest domyślnie wyłączona. Wybierz czas, jeśli
                            chcesz ją włączyć na tym telefonie.
                        </CardNote>
                    )}
                </CardHeadText>
                <CardActions>
                    {saved && <StateTag $on>Zapisano</StateTag>}
                    <Select
                        aria-label="Czas bezczynności do zablokowania ekranu na tym urządzeniu"
                        value={current}
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
export const AccountCard = () => {
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
export const ClearAccountCard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <Card>
            <CardHead>
                <CardHeadText>
                    <CardTitle>Wyczyść konto</CardTitle>
                    <CardNote>
                        Bezpowrotnie usuwa klientów, wizyty, pliki i dokumenty. Zostają: Twoje konto,
                        pakiet i saldo SMS.
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

/** Usunięcie konta firmy - na stałe, razem z kontami zespołu. */
export const DeleteAccountCard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <Card>
            <CardHead>
                <CardHeadText>
                    <CardTitle>Usuń konto</CardTitle>
                    <CardNote>
                        Usuwa firmę, wszystkie dane i konta zespołu. Nikt już się nie zaloguje.
                    </CardNote>
                </CardHeadText>
                <CardActions>
                    <DangerBtn onClick={() => setIsModalOpen(true)}>Usuń konto…</DangerBtn>
                </CardActions>
            </CardHead>
            <DeleteAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </Card>
    );
};
