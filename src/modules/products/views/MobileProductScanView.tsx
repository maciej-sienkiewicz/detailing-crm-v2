// src/modules/products/views/MobileProductScanView.tsx
// Trasa PUBLICZNA, bez logowania. Adres: /m/scan?s=<handoffToken>
//
// Ekran, który widzi telefon po zeskanowaniu kodu QR z komputera. Aparat celuje w kod
// kreskowy i łapie go SAM, w pętli — jak w MyFitnessPal: bez pola do wpisywania i bez
// przycisku migawki. Wykryty kod leci od razu do sesji na komputerze. Gdzie
// BarcodeDetector jest niedostępny (starsze iOS Safari), mówimy to wprost i odsyłamy do
// ręcznego wpisania NA KOMPUTERZE — pola tekstowego na telefonie świadomie tu nie ma.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { mobileScanApi } from '../api/productsApi';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { normalizeGtin } from '../utils/gtin';

const Page = styled.main`
    min-height: 100vh; background: #0f172a; color: #e2e8f0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px; text-align: center; gap: 18px;
`;
const Card = styled.section`
    width: 100%; max-width: 440px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 24px 20px;
    display: flex; flex-direction: column; gap: 16px;
`;
const Title = styled.h1` margin: 0; font-size: 20px; font-weight: 700; `;
const Sub = styled.p` margin: 0; font-size: 14px; line-height: 1.5; color: #94a3b8; `;

// Kadr aparatu z ramką celowniczą pośrodku — czytelny sygnał „tu ustaw kod".
const Viewport = styled.div`
    position: relative; width: 100%; aspect-ratio: 3/4; max-height: 52vh;
    border-radius: 14px; overflow: hidden; background: #000;
    border: 1px solid rgba(255,255,255,0.1);
`;
const Video = styled.video` width: 100%; height: 100%; object-fit: cover; `;
const Reticle = styled.div`
    position: absolute; inset: 18% 12%;
    border: 2px solid rgba(255,255,255,0.9); border-radius: 12px;
    box-shadow: 0 0 0 100vmax rgba(0,0,0,0.35);
    pointer-events: none;
`;
const Overlay = styled.div`
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: #cbd5e1; background: rgba(15,23,42,0.6);
`;
const Counter = styled.div` font-size: 14px; font-weight: 600; color: #34d399; `;
const Toast = styled.div` font-size: 13px; color: #fca5a5; min-height: 18px; `;
const Ok = styled.div` font-size: 13px; color: #34d399; min-height: 18px; `;

export function MobileProductScanView() {
    const [params] = useSearchParams();
    const token = params.get('s') ?? '';
    const { videoRef, active, error, supported, startContinuous, stop } = useBarcodeScanner();
    const [count, setCount] = useState(0);
    const [expired, setExpired] = useState(false);
    const [lastCode, setLastCode] = useState('');
    const [msg, setMsg] = useState('');
    const sendingRef = useRef(false);

    useEffect(() => {
        if (!token) { setExpired(true); return; }
        mobileScanApi.context(token)
            .then(ctx => { setCount(ctx.scannedCount); if (ctx.status !== 'OPEN') setExpired(true); })
            .catch(() => setExpired(true));
    }, [token]);

    const submitCode = useCallback(async (raw: string) => {
        const normalized = normalizeGtin(raw);
        if (!normalized) { setMsg('Niepoprawny kod — ustaw go w kadrze i przytrzymaj chwilę.'); return; }
        if (sendingRef.current) return;
        sendingRef.current = true;
        setMsg('');
        try {
            const ctx = await mobileScanApi.submit(token, [normalized]);
            setCount(ctx.scannedCount);
            setLastCode(normalized);
        } catch {
            setMsg('Nie udało się wysłać. Sesja mogła wygasnąć.');
            setExpired(true);
        } finally {
            sendingRef.current = false;
        }
    }, [token]);

    // Auto-start skanu ciągłego, gdy sesja żyje i przeglądarka umie czytać kody.
    useEffect(() => {
        if (!token || expired || !supported) return;
        startContinuous(submitCode);
        return () => stop();
    }, [token, expired, supported, startContinuous, submitCode, stop]);

    if (expired) {
        return (
            <Page>
                <Card>
                    <Title>Sesja skanowania wygasła</Title>
                    <Sub>Wróć do komputera i otwórz „Skanuj telefonem" ponownie, aby dostać świeży kod QR.</Sub>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            <Card>
                <Title>Skanuj produkt</Title>
                {!supported ? (
                    <Sub>
                        Ta przeglądarka nie odczyta kodu z aparatu. Wróć do komputera i wpisz kod
                        kreskowy ręcznie w oknie „Nowy produkt".
                    </Sub>
                ) : (
                    <>
                        <Sub>Skieruj aparat na kod kreskowy — złapiemy go automatycznie.</Sub>
                        <Viewport>
                            <Video ref={videoRef} playsInline muted />
                            <Reticle />
                            {!active && <Overlay>Uruchamiam aparat…</Overlay>}
                        </Viewport>
                    </>
                )}
                {error && <Toast>{error}</Toast>}
                {msg && <Toast>{msg}</Toast>}
                {lastCode && !msg && <Ok>Wysłano ✓ — ostatni kod: {lastCode}</Ok>}
                {count > 0 && <Counter>Wysłano kodów: {count}</Counter>}
            </Card>
        </Page>
    );
}
