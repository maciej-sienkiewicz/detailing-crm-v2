// src/modules/products/views/MobileProductScanView.tsx
// Trasa PUBLICZNA, bez logowania. Adres: /m/scan?s=<handoffToken>
//
// Ekran, który widzi telefon po zeskanowaniu kodu QR z komputera — wzorzec z
// MobileContactsImportView. Aparat celuje w kod kreskowy; wykryty kod leci do sesji na
// komputerze. Gdzie BarcodeDetector jest niedostępny (starsze iOS), mówimy to wprost
// i zostaje wpisanie ręczne — martwy przycisk byłby gorszy niż uczciwy komunikat.

import { useEffect, useRef, useState } from 'react';
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
const Video = styled.video`
    width: 100%; aspect-ratio: 3/4; max-height: 46vh; object-fit: cover;
    background: #000; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
`;
const Btn = styled.button<{ $primary?: boolean }>`
    padding: 14px 18px; font-family: inherit; font-size: 15px; font-weight: 700;
    border-radius: 12px; cursor: pointer; border: none;
    background: ${p => (p.$primary ? '#3b82f6' : 'rgba(255,255,255,0.08)')};
    color: #fff;
    &:disabled { opacity: 0.5; }
`;
const Field = styled.input`
    padding: 13px 14px; font-family: inherit; font-size: 16px;
    border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.06); color: #fff;
    &::placeholder { color: #64748b; }
`;
const Counter = styled.div` font-size: 14px; font-weight: 600; color: #34d399; `;
const Toast = styled.div` font-size: 13px; color: #fca5a5; min-height: 18px; `;

export function MobileProductScanView() {
    const [params] = useSearchParams();
    const token = params.get('s') ?? '';
    const { videoRef, active, error, supported, start, capture } = useBarcodeScanner();
    const [count, setCount] = useState(0);
    const [expired, setExpired] = useState(false);
    const [manual, setManual] = useState('');
    const [msg, setMsg] = useState('');
    const busyRef = useRef(false);

    useEffect(() => {
        if (!token) { setExpired(true); return; }
        mobileScanApi.context(token)
            .then(ctx => { setCount(ctx.scannedCount); if (ctx.status !== 'OPEN') setExpired(true); })
            .catch(() => setExpired(true));
    }, [token]);

    const submitCode = async (raw: string) => {
        const normalized = normalizeGtin(raw);
        if (!normalized) { setMsg('Niepoprawny kod — spróbuj jeszcze raz.'); return; }
        setMsg('');
        try {
            const ctx = await mobileScanApi.submit(token, [normalized]);
            setCount(ctx.scannedCount);
            setMsg('Wysłano ✓ — kod pojawił się na komputerze.');
        } catch {
            setMsg('Nie udało się wysłać. Sesja mogła wygasnąć.');
            setExpired(true);
        }
    };

    const onCapture = async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        try {
            const code = await capture();
            if (code) await submitCode(code);
            else setMsg('Nie wykryto kodu — ustaw go w kadrze i spróbuj ponownie.');
        } finally {
            busyRef.current = false;
        }
    };

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
                    <>
                        <Sub>
                            Ta przeglądarka nie odczyta kodu z aparatu. Wpisz kod kreskowy ręcznie —
                            trafi na komputer tak samo jak zeskanowany.
                        </Sub>
                        <Field
                            inputMode="numeric"
                            placeholder="Kod kreskowy z opakowania"
                            value={manual}
                            onChange={e => setManual(e.target.value)}
                        />
                        <Btn $primary onClick={() => submitCode(manual)} disabled={!manual.trim()}>Wyślij kod</Btn>
                    </>
                ) : !active ? (
                    <>
                        <Sub>Włącz aparat i skieruj go na kod kreskowy produktu.</Sub>
                        <Btn $primary onClick={start}>Włącz aparat</Btn>
                    </>
                ) : (
                    <>
                        <Video ref={videoRef} playsInline muted />
                        <Btn $primary onClick={onCapture}>Zeskanuj kod</Btn>
                    </>
                )}
                {error && <Toast>{error}</Toast>}
                <Toast>{msg}</Toast>
                {count > 0 && <Counter>Wysłano kodów: {count}</Counter>}
            </Card>
        </Page>
    );
}
