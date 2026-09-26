// src/modules/settings/components/ContactsSyncSection.tsx
//
// „Kontakty na telefonie" - automatyczna konfiguracja CardDAV na iPhonie.
//
// Strona WWW nie może założyć konta systemowego, więc maksimum automatyzacji
// na iOS to podpisany profil konfiguracyjny (.mobileconfig) z kompletem danych:
// adresem serwera, loginem i hasłem aplikacyjnym. Użytkownik niczego nie
// przepisuje - od dotknięcia przycisku do działających kontaktów zostają dwa
// dotknięcia w Ustawieniach (Zainstaluj → Zainstaluj), których Apple nie
// pozwala pominąć.
//
// Trzy drogi do pobrania profilu, zależnie od tego, gdzie stoi użytkownik:
//  1. iPhone, Safari      → nawigacja wprost na jednorazowy link instalacyjny;
//                           iOS przechwytuje profil i pokazuje „Pobrano profil".
//  2. iPhone, PWA/Chrome  → tylko Safari uruchamia instalację profilu, więc
//                           kopiujemy link i prosimy o wklejenie w Safari.
//  3. Komputer            → kod QR z linkiem; aparat iPhone'a otwiera Safari
//                           prosto w pobranie profilu.
//
// Przycisk konfiguracji stoi w nagłówku ramy ustawień (jedyne wypełnienie okna).
// Odwołanie dostępu pytało wklejonym w wiersz „Potwierdź / Anuluj", a jego błąd
// kończył się ciszą - teraz ConfirmationModal i dymek.

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, Notice, Panel, SectionTitle, StatusPill, ui, type PillTone } from '@/common/components/ui';
import {
    carddavApi, CARDDAV_ACCOUNTS_KEY, useCreateProvisioning, useRevokeCarddavAccount,
} from '@/modules/carddav';
import type { CarddavAccountDto, CarddavProvisioningDto } from '@/modules/carddav';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import { serverMessage, toastedGlobally } from './errorToast';
import {
    DeviceMain, DeviceRow, DeviceSide, DeviceText, EmptyState, Intro, ListCard, ListHead, ListNotice,
    PHONE, SkeletonLine, View, formatDate, phonesWord,
} from './devicesLayout';

type InstallPath = 'ios-safari' | 'ios-other' | 'desktop';

/** Gdzie stoi użytkownik - od tego zależy, jak podać mu profil. */
function detectInstallPath(): InstallPath {
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    if (!isIos) return 'desktop';
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true;
    // Chrome/Firefox/Edge na iOS nie uruchamiają instalacji profilu - robi to
    // wyłącznie Safari. PWA (standalone) też nie: pobranie utknęłoby w aplikacji.
    const isSafari = !isStandalone && !/crios|fxios|edgios/i.test(ua);
    return isSafari ? 'ios-safari' : 'ios-other';
}

/** Synchronizacja idzie z telefonu, więc jej świeżość mówi, czy profil żyje. */
function syncLabel(lastSyncAt: string | null): { text: string; tone: PillTone } {
    if (!lastSyncAt) return { text: 'Oczekuje na instalację', tone: 'neutral' };
    const hours = (Date.now() - new Date(lastSyncAt).getTime()) / 3_600_000;
    if (hours < 24) return { text: 'Synchronizuje się', tone: 'ok' };
    return { text: `Ostatnia synchronizacja ${formatDate(lastSyncAt)}`, tone: 'warn' };
}

export function ContactsSyncSection() {
    // Ten sam klucz co useCarddavAccounts; tutaj potrzebny jest też stan błędu -
    // bez niego nieudane wczytanie wyglądało jak „żaden telefon nie synchronizuje".
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: CARDDAV_ACCOUNTS_KEY,
        queryFn: carddavApi.listAccounts,
        staleTime: 30_000,
    });
    const accounts = data ?? [];
    const createProvisioning = useCreateProvisioning();
    const revokeAccount = useRevokeCarddavAccount();
    const { showSuccess, showError } = useToast();

    const [installPath] = useState(detectInstallPath);
    const [provisioning, setProvisioning] = useState<CarddavProvisioningDto | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [toRevoke, setToRevoke] = useState<CarddavAccountDto | null>(null);

    // Link niesie dane logowania, więc żyje krótko; odliczanie mówi wprost,
    // kiedy QR/link przestanie działać, zamiast zostawiać martwy kod na ekranie.
    useEffect(() => {
        if (!provisioning) return;
        const id = setInterval(() => {
            setNow(Date.now());
            // Po wygaśnięciu chowamy kartę - martwy QR na ekranie tylko myli.
            if (Date.now() >= new Date(provisioning.expiresAt).getTime()) {
                setProvisioning(null);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [provisioning]);

    const secondsLeft = provisioning
        ? Math.max(0, Math.round((new Date(provisioning.expiresAt).getTime() - now) / 1000))
        : null;

    const startSetup = () => {
        createProvisioning.mutate(undefined, {
            onSuccess: result => {
                if (installPath === 'ios-safari') {
                    // Safari na iPhonie: wchodzimy wprost na link - iOS
                    // przechwytuje application/x-apple-aspen-config i pokazuje
                    // „Pobrano profil". Kartę z dalszymi krokami zostawiamy pod
                    // spodem, bo użytkownik wróci do niej z Ustawień.
                    setProvisioning(result);
                    window.location.assign(result.installUrl);
                } else {
                    setProvisioning(result);
                }
            },
            onError: (error) => {
                if (toastedGlobally(error)) return;
                showError('Nie udało się przygotować profilu', serverMessage(error) ?? 'Spróbuj ponownie.');
            },
        });
    };

    const copyLink = async () => {
        if (!provisioning) return;
        try {
            await navigator.clipboard.writeText(provisioning.installUrl);
            showSuccess('Link skopiowany', 'Otwórz Safari i wklej go w pasku adresu.');
        } catch {
            showError('Nie udało się skopiować linku.');
        }
    };

    const handleRevoke = (account: CarddavAccountDto) => {
        revokeAccount.mutate(account.accountId, {
            onSuccess: () => showSuccess('Dostęp odwołany', 'Telefon przestanie synchronizować kontakty studia.'),
            onError: (error) => {
                if (toastedGlobally(error)) return;
                showError('Nie udało się odwołać dostępu', serverMessage(error) ?? 'Spróbuj ponownie.');
            },
        });
    };

    const setupLabel = createProvisioning.isPending
        ? 'Przygotowuję…'
        : installPath === 'ios-safari'
            ? 'Skonfiguruj na tym iPhonie'
            : installPath === 'ios-other'
                ? 'Przygotuj profil dla iPhone’a'
                : 'Skonfiguruj iPhone’a';

    return (
        <View>
            <Intro>
                Klienci studia w kontaktach iPhone'a: przy połączeniu od razu widać, kto dzwoni.
                Konfiguracja jest automatyczna, profil sam wpisuje serwer i dane logowania.
            </Intro>

            <SettingsHeaderActions>
                <Button variant="primary" size="lg" onClick={startSetup} disabled={createProvisioning.isPending}>
                    <Smartphone aria-hidden="true" />{setupLabel}
                </Button>
            </SettingsHeaderActions>

            {provisioning && (
                <InstallPanel aria-label="Instalacja profilu">
                    {installPath === 'desktop' && (
                        <QrWrap>
                            <QRCodeSVG value={provisioning.installUrl} size={148} level="M" />
                        </QrWrap>
                    )}
                    <InstallSteps>
                        {installPath === 'desktop' && (
                            <Step><StepNo>1</StepNo><span>Zeskanuj kod aparatem iPhone'a: otworzy się Safari i pobierze profil.</span></Step>
                        )}
                        {installPath === 'ios-other' && (
                            <Step>
                                <StepNo>1</StepNo>
                                <span>
                                    Instalację profilu uruchamia wyłącznie Safari.{' '}
                                    <CopyLinkBtn type="button" onClick={copyLink}>Skopiuj link</CopyLinkBtn>{' '}
                                    i wklej go w Safari na tym iPhonie.
                                </span>
                            </Step>
                        )}
                        {installPath === 'ios-safari' && (
                            <Step><StepNo>1</StepNo><span>Safari zapyta o zgodę na pobranie profilu. Dotknij <strong>Pozwól</strong>, a potem <strong>Zamknij</strong>.</span></Step>
                        )}
                        <Step><StepNo>2</StepNo><span>Otwórz aplikację <strong>Ustawienia</strong>: na samej górze zobaczysz <strong>„Profil pobrany"</strong>. Dotknij tej pozycji.</span></Step>
                        <Step><StepNo>3</StepNo><span>Dotknij <strong>Zainstaluj</strong>, podaj kod telefonu i potwierdź. Ostrzeżenie „Niezweryfikowany" jest w porządku, kontynuuj.</span></Step>
                        <Step><StepNo>4</StepNo><span>Gotowe. Klienci pojawią się w Kontaktach w ciągu kilku minut, a lista sama będzie się odświeżać.</span></Step>
                        {secondsLeft !== null && (
                            <Expiry $urgent={secondsLeft < 60} role="timer">
                                Link wygaśnie za {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}, potem wygeneruj nowy.
                            </Expiry>
                        )}
                    </InstallSteps>
                </InstallPanel>
            )}

            <ListCard aria-label="Telefony z kontaktami">
                <ListHead>
                    <SectionTitle
                        as="h3"
                        count={data ? `${accounts.length} ${phonesWord(accounts.length)}` : undefined}
                    >
                        Telefony z kontaktami studia
                    </SectionTitle>
                </ListHead>

                {isError && !data ? (
                    <ListNotice>
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać telefonów"
                            action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
                        />
                    </ListNotice>
                ) : isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <DeviceRow key={i} aria-hidden="true">
                            <DeviceMain><SkeletonLine $w={`${50 + i * 15}%`} /></DeviceMain>
                            <DeviceSide><SkeletonLine $w="110px" /></DeviceSide>
                        </DeviceRow>
                    ))
                ) : accounts.length === 0 ? (
                    <EmptyState>
                        <strong>Żaden telefon nie synchronizuje jeszcze kontaktów</strong>
                        <p>„{setupLabel}" w nagłówku przygotuje profil. Zajmie to mniej niż minutę.</p>
                    </EmptyState>
                ) : (
                    accounts.map(account => {
                        const sync = syncLabel(account.lastSyncAt);
                        const revoking = revokeAccount.isPending && revokeAccount.variables === account.accountId;
                        return (
                            <DeviceRow key={account.accountId}>
                                <DeviceMain>
                                    <Smartphone aria-hidden="true" />
                                    <DeviceText>
                                        <strong>{account.deviceName}</strong>
                                        <span>Skonfigurowano {formatDate(account.createdAt)}</span>
                                    </DeviceText>
                                </DeviceMain>
                                <DeviceSide>
                                    <StatusPill $tone={sync.tone}>{sync.text}</StatusPill>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        disabled={revoking}
                                        onClick={() => setToRevoke(account)}
                                    >
                                        {revoking ? 'Odwołuję…' : 'Odwołaj'}
                                    </Button>
                                </DeviceSide>
                            </DeviceRow>
                        );
                    })
                )}
            </ListCard>

            <ConfirmationModal
                isOpen={toRevoke !== null}
                title="Odwołać dostęp do kontaktów?"
                message={toRevoke
                    ? `„${toRevoke.deviceName}” przestanie synchronizować kontakty studia. Żeby je przywrócić, trzeba od nowa zainstalować profil.`
                    : ''}
                variant="danger"
                confirmText="Odwołaj dostęp"
                cancelText="Anuluj"
                onConfirm={() => { if (toRevoke) handleRevoke(toRevoke); }}
                onCancel={() => setToRevoke(null)}
            />
        </View>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

/* Instrukcja instalacji: płaski panel z odcieniem marki - „przeczytaj i zrób",
   nie osobna wyniesiona karta (wyniesiona jest lista telefonów). */
const InstallPanel = styled(Panel)`
    display: flex;
    gap: 20px;
    padding: 16px;
    background: ${ui.brandTint};
    border-color: ${ui.brandLineSoft};

    @media ${PHONE} { flex-direction: column; align-items: center; }
`;

const QrWrap = styled.div`
    flex-shrink: 0;
    padding: 10px;
    background: #fff;
    border-radius: 10px;
    line-height: 0;
`;

const InstallSteps = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

const Step = styled.div`
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.inkSoft};
`;

const StepNo = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid ${ui.brandLine};
    background: ${ui.surface};
    color: ${ui.brandInk};
    font-size: 11.5px;
    font-weight: 700;
`;

const CopyLinkBtn = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: inherit;
    font-weight: 700;
    color: ${ui.brandInk};
    text-decoration: underline;
    cursor: pointer;
`;

const Expiry = styled.p<{ $urgent: boolean }>`
    margin: 4px 0 0 32px;
    font-size: 12.5px;
    color: ${p => (p.$urgent ? '#b45309' : ui.textMuted)};
    font-variant-numeric: tabular-nums;
`;
