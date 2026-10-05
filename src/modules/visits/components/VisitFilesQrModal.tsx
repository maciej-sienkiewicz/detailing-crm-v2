// src/modules/visits/components/VisitFilesQrModal.tsx
//
// „Z telefonu" przy „Dodaj plik" na otwartej wizycie: kod QR, który otwiera na telefonie
// ten sam formularz co przy przyjęciu pojazdu (`/m/upload?t=…`), tylko w trybie samych
// zdjęć. Telefon nie musi być zalogowany do aplikacji.
//
// Okno wyłącznie POKAZUJE sesję - trzyma ją [useVisitFilesMobileSession] w widoku
// wizyty, żeby zdjęcia dalej wpadały do galerii po zamknięciu tego okna.

import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { VisitFilesMobileSession } from '../hooks/useVisitFilesMobileSession';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
`;

const QrBox = styled.div`
    width: 212px;
    height: 212px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background: #ffffff;
    border: 1px solid ${st.border};
    border-radius: 14px;
`;

const Placeholder = styled.span`
    font-size: 12.5px;
    line-height: 1.5;
    color: ${st.textMuted};
`;

const Hint = styled.p`
    margin: 0;
    max-width: 380px;
    font-size: 13px;
    line-height: 1.55;
    color: ${st.textSecondary};
`;

const Status = styled.p<{ $live: boolean }>`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${p => (p.$live ? '#047857' : st.textMuted)};
    font-variant-numeric: tabular-nums;
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${st.accentRed};
`;

const formatCountdown = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/** „1 zdjęcie", „3 zdjęcia", „5 zdjęć" (12-14 jak 5). */
const photosPhrase = (n: number): string => {
    if (n === 1) return '1 zdjęcie';
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
    return `${n} ${few ? 'zdjęcia' : 'zdjęć'}`;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    session: VisitFilesMobileSession;
}

export const VisitFilesQrModal = ({ isOpen, onClose, session }: Props) => {
    const { qrUrl, secondsLeft, isExpired, isStarting, error, received, start } = session;

    /*
     * Kod zamawiamy przy pierwszym otwarciu okna, nie przy wejściu na wizytę: większość
     * wizyt nie potrzebuje telefonu. `rotate = false`, więc telefon, który już zeskanował
     * kod, nie wypada przy ponownym otwarciu okna.
     */
    const requested = useRef(false);
    useEffect(() => {
        if (!isOpen || requested.current || qrUrl) return;
        requested.current = true;
        void start(false);
    }, [isOpen, start, qrUrl]);

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zdjęcia z telefonu</ModalTitle>
                    <ModalSubtitle>Telefon nie musi być zalogowany do DetailBoost</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>
            <ModalContent>
                <Body>
                    <QrBox>
                        {isStarting && <Placeholder>Generowanie kodu…</Placeholder>}
                        {!isStarting && error && <Placeholder>Nie udało się wygenerować kodu</Placeholder>}
                        {!isStarting && !error && qrUrl && !isExpired && (
                            <QRCodeSVG value={qrUrl} size={190} level="M" />
                        )}
                        {!isStarting && !error && isExpired && <Placeholder>Kod wygasł</Placeholder>}
                    </QrBox>
                    <Hint>
                        Zeskanuj kod aparatem telefonu. Możesz zrobić zdjęcia albo wybrać je z galerii -
                        trafią do tej wizyty od razu, także po zamknięciu tego okna.
                    </Hint>
                    <Status $live={received > 0} role="status">
                        {received > 0
                            ? `Odebrano ${photosPhrase(received)}`
                            : !isExpired && secondsLeft > 0
                                ? `Czekam na zdjęcia, kod ważny ${formatCountdown(secondsLeft)}`
                                : ''}
                    </Status>
                    {error && <ErrorText>{error}</ErrorText>}
                </Body>
            </ModalContent>
            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={() => void start(true)} disabled={isStarting}>
                    {isExpired ? 'Wygeneruj nowy kod' : 'Nowy kod (unieważnia poprzedni)'}
                </SharedButton>
                <SharedButton type="button" $variant="primary" onClick={onClose}>
                    Gotowe
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
