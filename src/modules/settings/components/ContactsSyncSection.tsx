// src/modules/settings/components/ContactsSyncSection.tsx
//
// „Kontakty na telefonie" — automatyczna konfiguracja CardDAV na iPhonie.
//
// Strona WWW nie może założyć konta systemowego, więc maksimum automatyzacji
// na iOS to podpisany profil konfiguracyjny (.mobileconfig) z kompletem danych:
// adresem serwera, loginem i hasłem aplikacyjnym. Użytkownik niczego nie
// przepisuje — od dotknięcia przycisku do działających kontaktów zostają dwa
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

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/common/components/Toast';
import {
    Card, ColLabel, EmptyWrap, EmptyTitle, EmptyDesc, SkeletonBox, Badge,
} from './rbacShared.styles';
import {
    useCarddavAccounts, useCreateProvisioning, useRevokeCarddavAccount,
} from '@/modules/carddav';
import type { CarddavProvisioningDto } from '@/modules/carddav';

type InstallPath = 'ios-safari' | 'ios-other' | 'desktop';

/** Gdzie stoi użytkownik — od tego zależy, jak podać mu profil. */
function detectInstallPath(): InstallPath {
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    if (!isIos) return 'desktop';
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true;
    // Chrome/Firefox/Edge na iOS nie uruchamiają instalacji profilu — robi to
    // wyłącznie Safari. PWA (standalone) też nie: pobranie utknęłoby w aplikacji.
    const isSafari = !isStandalone && !/crios|fxios|edgios/i.test(ua);
    return isSafari ? 'ios-safari' : 'ios-other';
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Synchronizacja idzie z telefonu, więc jej świeżość mówi, czy profil żyje. */
function syncLabel(lastSyncAt: string | null): { text: string; variant: 'green' | 'amber' | 'gray' } {
    if (!lastSyncAt) return { text: 'Oczekuje na instalację', variant: 'gray' };
    const hours = (Date.now() - new Date(lastSyncAt).getTime()) / 3_600_000;
    if (hours < 24) return { text: 'Synchronizuje się', variant: 'green' };
    return { text: `Ostatnia synchronizacja ${formatDate(lastSyncAt)}`, variant: 'amber' };
}

export function ContactsSyncSection() {
    const { accounts, isLoading } = useCarddavAccounts();
    const createProvisioning = useCreateProvisioning();
    const revokeAccount = useRevokeCarddavAccount();
    const { showSuccess, showError } = useToast();

    const [installPath] = useState(detectInstallPath);
    const [provisioning, setProvisioning] = useState<CarddavProvisioningDto | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

    // Link niesie dane logowania, więc żyje krótko; odliczanie mówi wprost,
    // kiedy QR/link przestanie działać, zamiast zostawiać martwy kod na ekranie.
    useEffect(() => {
        if (!provisioning) return;
        const id = setInterval(() => {
            setNow(Date.now());
            // Po wygaśnięciu chowamy kartę — martwy QR na ekranie tylko myli.
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
                    // Safari na iPhonie: wchodzimy wprost na link — iOS
                    // przechwytuje application/x-apple-aspen-config i pokazuje
                    // „Pobrano profil". Kartę z dalszymi krokami zostawiamy pod
                    // spodem, bo użytkownik wróci do niej z Ustawień.
                    setProvisioning(result);
                    window.location.assign(result.installUrl);
                } else {
                    setProvisioning(result);
                }
            },
            onError: () => showError('Nie udało się przygotować profilu. Spróbuj ponownie.'),
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

    const handleRevoke = (accountId: string) => {
        revokeAccount.mutate(accountId, {
            onSuccess: () => {
                showSuccess('Dostęp odwołany', 'Telefon przestanie synchronizować kontakty studia.');
                setConfirmRevokeId(null);
            },
        });
    };

    return (
        <Section>
            <SectionHeader>
                <div>
                    <SectionTitle>Kontakty na telefonie</SectionTitle>
                    <SectionDesc>
                        Klienci studia w kontaktach iPhone'a — przy połączeniu od razu widać, kto dzwoni.
                        Konfiguracja jest automatyczna: profil sam wpisuje serwer i dane logowania.
                    </SectionDesc>
                </div>
                <SetupBtn onClick={startSetup} disabled={createProvisioning.isPending}>
                    {createProvisioning.isPending
                        ? 'Przygotowuję…'
                        : installPath === 'ios-safari'
                            ? 'Skonfiguruj na tym iPhonie'
                            : installPath === 'ios-other'
                                ? 'Przygotuj profil dla iPhone’a'
                                : 'Skonfiguruj iPhone’a'}
                </SetupBtn>
            </SectionHeader>

            {provisioning && (
                <InstallCard>
                    {installPath === 'desktop' && (
                        <QrWrap>
                            <QRCodeSVG value={provisioning.installUrl} size={148} level="M" />
                        </QrWrap>
                    )}
                    <InstallSteps>
                        {installPath === 'desktop' && (
                            <Step><StepNo>1</StepNo>Zeskanuj kod aparatem iPhone'a — otworzy się Safari i pobierze profil.</Step>
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
                            <Step><StepNo>1</StepNo>Safari pokaże „Pobrano profil" — zatwierdź pobranie.</Step>
                        )}
                        <Step><StepNo>2</StepNo>Otwórz <strong>Ustawienia</strong> — u góry pojawi się <strong>„Pobrano profil"</strong>.</Step>
                        <Step><StepNo>3</StepNo>Dotknij <strong>Zainstaluj</strong> i potwierdź. Kontakty zaczną się synchronizować same.</Step>
                        {secondsLeft !== null && (
                            <Expiry $urgent={secondsLeft < 60}>
                                Link wygaśnie za {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} — potem wygeneruj nowy.
                            </Expiry>
                        )}
                    </InstallSteps>
                </InstallCard>
            )}

            <Card>
                <ListHeader>
                    <ColLabel>Telefon</ColLabel>
                    <ColLabel>Skonfigurowano</ColLabel>
                    <ColLabel>Stan</ColLabel>
                    <ColLabel />
                </ListHeader>

                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <ListRow key={i}>
                            <SkeletonBox $w={`${55 + (i % 2) * 15}%`} />
                            <SkeletonBox $w="80px" />
                            <SkeletonBox $w="110px" />
                            <SkeletonBox $w="60px" />
                        </ListRow>
                    ))
                ) : accounts.length === 0 ? (
                    <EmptyWrap>
                        <EmptyTitle>Żaden telefon nie synchronizuje jeszcze kontaktów</EmptyTitle>
                        <EmptyDesc>
                            Skonfiguruj iPhone'a powyżej — zajmie to mniej niż minutę.
                        </EmptyDesc>
                    </EmptyWrap>
                ) : (
                    accounts.map(account => {
                        const sync = syncLabel(account.lastSyncAt);
                        const isConfirming = confirmRevokeId === account.accountId;
                        const isRevoking = revokeAccount.isPending && isConfirming;
                        return (
                            <ListRow key={account.accountId}>
                                <DeviceName>{account.deviceName}</DeviceName>
                                <CellText>{formatDate(account.createdAt)}</CellText>
                                <div><Badge $variant={sync.variant}>{sync.text}</Badge></div>
                                <RowActions>
                                    {isConfirming ? (
                                        <>
                                            <ConfirmBtn onClick={() => handleRevoke(account.accountId)} disabled={isRevoking}>
                                                {isRevoking ? 'Odwołuję…' : 'Potwierdź'}
                                            </ConfirmBtn>
                                            <CancelBtn onClick={() => setConfirmRevokeId(null)}>Anuluj</CancelBtn>
                                        </>
                                    ) : (
                                        <RevokeBtn onClick={() => setConfirmRevokeId(account.accountId)}>
                                            Odwołaj
                                        </RevokeBtn>
                                    )}
                                </RowActions>
                            </ListRow>
                        );
                    })
                )}
            </Card>
        </Section>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 32px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;

    @media (max-width: 639px) { flex-direction: column; }
`;

const SectionTitle = styled.h3`
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const SectionDesc = styled.p`
    margin: 0;
    max-width: 560px;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

const SetupBtn = styled.button`
    flex-shrink: 0;
    min-height: 40px;
    padding: 0 16px;
    border: none;
    border-radius: 10px;
    background: #0ea5e9;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;

    &:hover { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: default; }

    @media (max-width: 639px) { width: 100%; min-height: 46px; }
`;

const InstallCard = styled.div`
    display: flex;
    gap: 20px;
    padding: 16px;
    background: rgba(14, 165, 233, 0.06);
    border: 1px solid rgba(14, 165, 233, 0.25);
    border-radius: 12px;

    @media (max-width: 639px) { flex-direction: column; align-items: center; }
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
    font-size: 13px;
    line-height: 1.5;
    color: #334155;
`;

const StepNo = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0ea5e9;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
`;

const CopyLinkBtn = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: inherit;
    font-weight: 700;
    color: #0284c7;
    text-decoration: underline;
    cursor: pointer;
`;

const Expiry = styled.p<{ $urgent: boolean }>`
    margin: 4px 0 0 30px;
    font-size: 12px;
    color: ${p => (p.$urgent ? '#b45309' : '#94a3b8')};
    font-variant-numeric: tabular-nums;
`;

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: 1.4fr 0.8fr 1.2fr 130px;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid #f1f5f9;

    @media (max-width: 639px) { display: none; }
`;

const ListRow = styled.div`
    display: grid;
    grid-template-columns: 1.4fr 0.8fr 1.2fr 130px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f8fafc;

    &:last-child { border-bottom: none; }

    @media (max-width: 639px) {
        grid-template-columns: 1fr auto;
        row-gap: 6px;
    }
`;

const DeviceName = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const CellText = styled.span`
    font-size: 13px;
    color: #64748b;

    @media (max-width: 639px) { display: none; }
`;

const RowActions = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
`;

const RevokeBtn = styled.button`
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;

    &:hover { border-color: #fca5a5; color: #dc2626; }
`;

const ConfirmBtn = styled(RevokeBtn)`
    border-color: #fca5a5;
    background: #fef2f2;
    color: #dc2626;
`;

const CancelBtn = styled(RevokeBtn)``;
