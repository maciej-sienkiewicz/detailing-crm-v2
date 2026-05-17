// src/modules/voice-commands/views/MobileShortcutsView.tsx

import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/core/context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() =>
        window.matchMedia('(max-width: 768px)').matches
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isMobile;
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    padding: 32px;
    max-width: 820px;

    @media (max-width: 600px) {
        padding: 20px 16px;
    }
`;

const PageTitle = styled.h1`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
`;

const PageSubtitle = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
`;

// ─── Main card ────────────────────────────────────────────────────────────────

const SectionCard = styled.div`
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
`;

const SectionLayout = styled.div`
    display: flex;
    align-items: stretch;

    @media (max-width: 640px) {
        flex-direction: column;
    }
`;

// ─── Left: QR panel ──────────────────────────────────────────────────────────

const QrPanel = styled.div`
    flex-shrink: 0;
    width: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 32px 24px;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;

    @media (max-width: 640px) {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
        padding: 24px 20px;
    }
`;

const QrBox = styled.div`
    padding: 14px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
`;

const QrLabel = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
`;

const InstallBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 16px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 10px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.22);
    transition: background 0.15s, box-shadow 0.15s, transform 0.1s;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
    &:hover { background: #0284c7; box-shadow: 0 4px 10px rgba(14, 165, 233, 0.32); transform: translateY(-1px); }
    &:active { transform: scale(0.98); }
`;

const InstalledBadge = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    color: #16a34a;
    font-size: 12px;
    font-weight: 600;
    width: 100%;

    svg { width: 14px; height: 14px; }
`;

// ─── Right: instructions panel ────────────────────────────────────────────────

const InstructionsPanel = styled.div`
    flex: 1;
    padding: 28px 28px 28px 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    @media (max-width: 640px) {
        padding: 20px;
    }
`;

const InstructionsHeading = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
`;

const InstructionsDesc = styled.p`
    margin: 3px 0 0;
    font-size: 13px;
    color: #64748b;
`;

const PlatformTabs = styled.div`
    display: flex;
    gap: 8px;
`;

const PlatformTab = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1.5px solid ${p => p.$active ? '#0ea5e9' : '#e2e8f0'};
    background: ${p => p.$active ? '#f0f9ff' : '#f8fafc'};
    color: ${p => p.$active ? '#0284c7' : '#64748b'};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.$active ? 600 : 500};
    cursor: pointer;
    transition: all 0.15s;

    svg { width: 15px; height: 15px; }
    &:hover { border-color: #0ea5e9; color: #0284c7; }
`;

const InstructionList = styled.ol`
    margin: 0;
    padding: 0 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: decimal;

    li {
        font-size: 14px;
        color: #475569;
        line-height: 1.55;
        padding-left: 4px;
    }
    strong { color: #0f172a; font-weight: 600; }
    code {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 12px;
        background: #f1f5f9;
        padding: 2px 5px;
        border-radius: 4px;
        color: #0f172a;
    }
`;

// ─── No-token states ──────────────────────────────────────────────────────────

const MobileNoToken = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: 32px 24px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    text-align: center;
    gap: 16px;
`;

const MobileNoTokenIcon = styled.div`
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: rgba(234, 179, 8, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    svg { width: 32px; height: 32px; color: #fbbf24; }
`;

const MobileNoTokenTitle = styled.p`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #f1f5f9;
`;

const MobileNoTokenMsg = styled.p`
    margin: 0;
    font-size: 14px;
    color: rgba(255,255,255,0.55);
    line-height: 1.6;
    max-width: 300px;
`;

const NoTokenCard = styled.div`
    padding: 28px 24px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 14px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
`;

const NoTokenIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(234, 179, 8, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 20px; height: 20px; color: #d97706; }
`;

const NoTokenText = styled.div`
    flex: 1;
    p { margin: 0; font-size: 14px; line-height: 1.6; color: #92400e; }
    p:first-child { font-weight: 600; margin-bottom: 4px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const MobileShortcutsView = () => {
    const { user } = useAuth();
    const isMobile = useIsMobile();
    const pwa = usePWAInstall();
    const [platform, setPlatform] = useState<'android' | 'ios'>('android');

    const mobileToken = user?.mobileToken;
    const voiceUrl = mobileToken
        ? `${window.location.origin}/m/voice?token=${mobileToken}`
        : null;

    // ── Mobile branch ─────────────────────────────────────────────────────────
    if (isMobile) {
        if (!mobileToken) {
            return (
                <MobileNoToken>
                    <MobileNoTokenIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                    </MobileNoTokenIcon>
                    <MobileNoTokenTitle>Token mobilny nie jest skonfigurowany</MobileNoTokenTitle>
                    <MobileNoTokenMsg>
                        Skontaktuj się z administratorem lub wejdź w ustawienia konta, żeby wygenerować token dostępu.
                    </MobileNoTokenMsg>
                </MobileNoToken>
            );
        }
        return <Navigate to={`/m/voice?token=${mobileToken}`} replace />;
    }

    return (
        <Page>
            <PageTitle>Skróty mobilne</PageTitle>
            <PageSubtitle>
                Szybki dostęp do dodawania leadów i notatek głosowych z telefonu — bez logowania.
            </PageSubtitle>

            {!mobileToken ? (
                <NoTokenCard>
                    <NoTokenIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                    </NoTokenIcon>
                    <NoTokenText>
                        <p>Token mobilny nie jest skonfigurowany</p>
                        <p>
                            Administrator musi wygenerować token dostępu w ustawieniach konta.
                            Skontaktuj się z obsługą lub sprawdź ustawienia użytkownika w panelu administracyjnym.
                        </p>
                    </NoTokenText>
                </NoTokenCard>
            ) : (
                <SectionCard>
                    <SectionLayout>
                        {/* ── Left: QR code ──────────────────────────────── */}
                        <QrPanel>
                            <QrBox>
                                <QRCodeSVG
                                    value={voiceUrl!}
                                    size={160}
                                    fgColor="#0f172a"
                                    bgColor="#ffffff"
                                    level="M"
                                />
                            </QrBox>
                            <QrLabel>Zeskanuj aparatem</QrLabel>
                            {pwa.isInstalled ? (
                                <InstalledBadge>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    Aplikacja zainstalowana
                                </InstalledBadge>
                            ) : pwa.canInstall ? (
                                <InstallBtn onClick={pwa.install} type="button">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Zainstaluj jako PWA
                                </InstallBtn>
                            ) : null}
                        </QrPanel>

                        {/* ── Right: instructions ─────────────────────────── */}
                        <InstructionsPanel>
                            <div>
                                <InstructionsHeading>Jak dodać do ekranu głównego?</InstructionsHeading>
                                <InstructionsDesc>Działa jak aplikacja — bez otwierania przeglądarki</InstructionsDesc>
                            </div>

                            <PlatformTabs>
                                <PlatformTab
                                    $active={platform === 'android'}
                                    onClick={() => setPlatform('android')}
                                    type="button"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 16.5C5 19 6.5 21 12 21s7-2 7-4.5V10H5v6.5zM12 3a3.5 3.5 0 0 0-3.5 3.5H15.5A3.5 3.5 0 0 0 12 3zM8.5 3 7 1.5M15.5 3 17 1.5M9 14h6"/>
                                    </svg>
                                    Android
                                </PlatformTab>
                                <PlatformTab
                                    $active={platform === 'ios'}
                                    onClick={() => setPlatform('ios')}
                                    type="button"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                    iPhone / iPad
                                </PlatformTab>
                            </PlatformTabs>

                            {platform === 'android' ? (
                                <InstructionList>
                                    <li>Zeskanuj QR kod telefonem lub otwórz link ręcznie w <strong>Chrome</strong></li>
                                    <li>Dotknij ikony <strong>⋮</strong> (menu) w prawym górnym rogu</li>
                                    <li>Wybierz <strong>„Dodaj do ekranu głównego"</strong> lub <strong>„Zainstaluj aplikację"</strong></li>
                                    <li>Potwierdź — ikona pojawi się na ekranie głównym</li>
                                </InstructionList>
                            ) : (
                                <InstructionList>
                                    <li>Zeskanuj QR kod lub otwórz link w <strong>Safari</strong> (inne przeglądarki nie obsługują tej funkcji na iOS)</li>
                                    <li>Dotknij ikony <strong>Udostępnij</strong> <code>⎋</code> na dole ekranu</li>
                                    <li>Przewiń w dół i wybierz <strong>„Dodaj do ekranu głównego"</strong></li>
                                    <li>Nadaj nazwę i zatwierdź — aplikacja pojawi się na pulpicie</li>
                                </InstructionList>
                            )}
                        </InstructionsPanel>
                    </SectionLayout>
                </SectionCard>
            )}
        </Page>
    );
};
