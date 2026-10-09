// src/modules/vehicles/components/vin/VinQrModal.tsx
//
// „VIN telefonem" przy polu VIN (wpis zlecenia zbiorczego, pojazd): kod QR otwiera na telefonie tę samą
// stronę co przy przyjęciu pojazdu i plikach wizyty (`/m/upload?t=…`), w trybie samego
// zdjęcia VIN. Telefon nie musi być zalogowany. Serwer odczytuje VIN ze zdjęcia,
// a to okno odbiera wynik i wpisuje go w pole.
//
// Wynik odpytujemy co 2 s zamiast słuchać WebSocketu: okno jest otwarte tylko na
// czas jednego zdjęcia, a odczyt przez AI i tak trwa kilka sekund.

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SUBMODAL_Z_INDEX } from '@/common/styles/sharedModalStyles';
import type { VinApi, VinScanSession } from './vinApi';

const POLL_MS = 2000;

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
    border: 1px solid #e2e8f0;
    border-radius: 14px;
`;

const Placeholder = styled.span`
    font-size: 12.5px;
    line-height: 1.5;
    color: #94a3b8;
`;

const Hint = styled.p`
    margin: 0;
    max-width: 380px;
    font-size: 13px;
    line-height: 1.55;
    color: #475569;
`;

const Status = styled.p<{ $tone: 'wait' | 'error' }>`
    margin: 0;
    max-width: 380px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    color: ${p => (p.$tone === 'error' ? '#b91c1c' : '#64748b')};
`;

interface Props {
    api: VinApi;
    onVin: (vin: string) => void;
    onClose: () => void;
}

export const VinQrModal = ({ api, onVin, onClose }: Props) => {
    const [session, setSession] = useState<VinScanSession | null>(null);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState(false);
    const [unreadable, setUnreadable] = useState(false);
    const [expired, setExpired] = useState(false);
    const onVinRef = useRef(onVin);
    const apiRef = useRef(api);
    useEffect(() => { onVinRef.current = onVin; apiRef.current = api; });

    const start = useCallback(async (rotate: boolean) => {
        setStarting(true);
        setStartError(false);
        setUnreadable(false);
        setExpired(false);
        try {
            setSession(await apiRef.current.startVinScanSession(rotate));
        } catch {
            setStartError(true);
        } finally {
            setStarting(false);
        }
    }, []);

    /*
     * Kod przy otwarciu okna, bez rotacji: telefon, który zeskanował go przy poprzednim
     * aucie, robi kolejne zdjęcie bez skanowania od nowa. Serwer czyści przy tym
     * poprzedni wynik, więc nie wpadnie tu VIN poprzedniego auta.
     */
    const requested = useRef(false);
    useEffect(() => {
        if (requested.current) return;
        requested.current = true;
        void start(false);
    }, [start]);

    useEffect(() => {
        if (!session) return;
        const expiresAt = new Date(session.expiresAt).getTime();
        let lastSeen: string | null = null;
        const id = window.setInterval(async () => {
            if (Date.now() > expiresAt) {
                setExpired(true);
                window.clearInterval(id);
                return;
            }
            try {
                const result = await apiRef.current.getVinScanResult();
                if (!result || result.scannedAt === lastSeen) return;
                lastSeen = result.scannedAt;
                if (result.vin) {
                    window.clearInterval(id);
                    onVinRef.current(result.vin);
                } else {
                    setUnreadable(true);
                }
            } catch { /* chwilowy brak sieci - następne odpytanie spróbuje znowu */ }
        }, POLL_MS);
        return () => window.clearInterval(id);
    }, [session]);

    const qrUrl = session ? `${window.location.origin}/m/upload?t=${session.token}` : null;

    return (
        <ModalShell isOpen onClose={onClose} size="sm" zIndex={SUBMODAL_Z_INDEX}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>VIN telefonem</ModalTitle>
                    <ModalSubtitle>Telefon nie musi być zalogowany do DetailBoost</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>
            <ModalContent>
                <Body>
                    <QrBox>
                        {starting && <Placeholder>Generowanie kodu…</Placeholder>}
                        {!starting && startError && <Placeholder>Nie udało się wygenerować kodu</Placeholder>}
                        {!starting && !startError && expired && <Placeholder>Kod wygasł</Placeholder>}
                        {!starting && !startError && !expired && qrUrl && <QRCodeSVG value={qrUrl} size={190} level="M" />}
                    </QrBox>
                    <Hint>
                        Zeskanuj kod aparatem telefonu i zrób zdjęcie tabliczki VIN albo dowodu
                        rejestracyjnego. Odczytany numer sam wpisze się w pole.
                    </Hint>
                    {session && !expired && (
                        <Status $tone={unreadable ? 'error' : 'wait'} role="status">
                            {unreadable
                                ? 'Nie udało się odczytać VIN z ostatniego zdjęcia. Zrób je jeszcze raz, bliżej i bez odblasków.'
                                : 'Czekam na zdjęcie z telefonu…'}
                        </Status>
                    )}
                </Body>
            </ModalContent>
            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={() => void start(true)} disabled={starting}>
                    {expired ? 'Wygeneruj nowy kod' : 'Nowy kod (unieważnia poprzedni)'}
                </SharedButton>
                <SharedButton type="button" $variant="secondary" onClick={onClose}>
                    Anuluj
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
