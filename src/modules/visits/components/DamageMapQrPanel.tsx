// src/modules/visits/components/DamageMapQrPanel.tsx
//
// „Kod QR" w oknie aktualizacji uszkodzeń: telefon jako narzędzie do mapy OTWARTEJ
// wizyty.
//
// Nie powstał tu drugi kanał mobilny. Sesja przyjęcia jest kluczowana opaque'owym
// `checkinId`, więc backend podstawia tam identyfikator WIZYTY — telefon dostaje
// dokładnie ten sam formularz co przy przyjęciu (`/m/upload?t=…`).
//
// Ten komponent wyłącznie POKAZUJE sesję. Samą sesję (token, gniazdo WebSocket,
// przenoszenie zdjęć) trzyma [useDamageMapMobileSession] w stanie okna, bo panel
// jest zakładką w oknie wyboru zdjęcia i znika, gdy operator je zamknie — a telefon
// ma działać właśnie wtedy, kiedy operator odchodzi od komputera.

import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { DamageMapMobileSession } from '../hooks/useDamageMapMobileSession';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const QrRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;

    @media (max-width: 520px) {
        flex-direction: column;
        text-align: center;
    }
`;

const QrBox = styled.div`
    flex-shrink: 0;
    width: 148px;
    height: 148px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: #ffffff;
    border: 1px solid ${st.border};
    border-radius: 12px;
`;

const QrPlaceholder = styled.span`
    font-size: 12px;
    text-align: center;
    color: ${st.textMuted};
    line-height: 1.5;
`;

const QrTexts = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const QrTitle = styled.p`
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: ${st.text};
`;

const QrSubtitle = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: ${st.textSecondary};
`;

const StatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const Pill = styled.span<{ $tone: 'muted' | 'live' | 'warn' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid
        ${p => (p.$tone === 'live' ? 'rgba(16, 185, 129, 0.4)'
        : p.$tone === 'warn' ? 'rgba(245, 158, 11, 0.4)'
        : st.border)};
    background: ${p => (p.$tone === 'live' ? st.bgAccentGreen
        : p.$tone === 'warn' ? st.bgAccentAmber
        : st.bg)};
    color: ${p => (p.$tone === 'live' ? '#047857' : p.$tone === 'warn' ? '#92400e' : st.textMuted)};

    svg { width: 11px; height: 11px; }
`;

const RotateBtn = styled.button`
    align-self: flex-start;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: ${st.textSecondary};
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: 999px;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover:not(:disabled) { background: ${st.bgCardAlt}; color: ${st.text}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${st.accentRed};
`;

const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

interface Props {
    session: DamageMapMobileSession;
}

export const DamageMapQrPanel = ({ session }: Props) => {
    const { qrUrl, secondsLeft, isExpired, isStarting, error, phoneSeen, start } = session;

    /*
     * Kod zamawiamy przy pierwszym wejściu w zakładkę, nie przy otwarciu okna:
     * większość aktualizacji mapy nie potrzebuje telefonu, a każde wydanie tokena
     * zasiewa sesję i zajmuje klucz w Redisie. `rotate = false`, więc telefon, który
     * już zeskanował kod, nie wypada przy ponownym wejściu w zakładkę.
     */
    const requested = useRef(false);
    useEffect(() => {
        if (requested.current || qrUrl) return;
        requested.current = true;
        void start(false);
    }, [start, qrUrl]);

    return (
        <Wrap>
            <QrRow>
                <QrBox>
                    {isStarting && <QrPlaceholder>Generowanie kodu...</QrPlaceholder>}
                    {!isStarting && error && <QrPlaceholder>Błąd</QrPlaceholder>}
                    {!isStarting && !error && qrUrl && !isExpired && (
                        <QRCodeSVG value={qrUrl} size={130} level="M" />
                    )}
                    {!isStarting && !error && isExpired && <QrPlaceholder>Kod wygasł</QrPlaceholder>}
                </QrBox>

                <QrTexts>
                    <QrTitle>Zeskanuj telefonem i oznacz uszkodzenia na miejscu</QrTitle>
                    <QrSubtitle>
                        Telefon otwiera mapę uszkodzeń z aparatem. Zdjęcia i oznaczenia
                        wchodzą do tego okna na bieżąco — także po zamknięciu tego
                        wyboru zdjęcia. Zapisuje je dopiero „Zapisz mapę uszkodzeń".
                    </QrSubtitle>

                    <StatusRow>
                        {phoneSeen ? (
                            <Pill $tone="live">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Telefon podłączony
                            </Pill>
                        ) : (
                            <Pill $tone="muted">Czekam na telefon</Pill>
                        )}
                        {!isExpired && secondsLeft > 0 && (
                            <Pill $tone={secondsLeft < 300 ? 'warn' : 'muted'}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Ważny {formatCountdown(secondsLeft)}
                            </Pill>
                        )}
                    </StatusRow>
                </QrTexts>
            </QrRow>

            {error && <ErrorText>{error}</ErrorText>}

            <RotateBtn type="button" onClick={() => void start(true)} disabled={isStarting}>
                {isExpired ? 'Wygeneruj nowy kod' : 'Wygeneruj nowy kod (unieważnia poprzedni)'}
            </RotateBtn>
        </Wrap>
    );
};
