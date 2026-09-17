// src/modules/products/views/MobileProductScanView.tsx
// Trasa PUBLICZNA, bez logowania. Adres: /m/scan?s=<handoffToken>
//
// Ekran, który widzi telefon po zeskanowaniu kodu QR z komputera. Aparat celuje w kod
// kreskowy i łapie go SAM, w pętli — jak w MyFitnessPal: bez pola do wpisywania i bez
// przycisku migawki. Wykryty kod leci od razu do sesji na komputerze.
//
// Dekoder działa w KAŻDEJ przeglądarce (natywny albo ZXing w JS — patrz
// barcodeDecoder.ts), więc jedyny zapas to „aparat się nie uruchomił" albo „nie łapie
// z ręki": wtedy ZDJĘCIE. Zdjęcie najpierw czytamy tu, w przeglądarce (za darmo), a gdy
// i to zawiedzie — wysyłamy je do modelu wizyjnego, który czyta cyfry pod kreskami
// (dokładnie jak odczyt VIN ze zdjęcia). Pola tekstowego na telefonie świadomie nie ma.

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { mobileScanApi } from '../api/productsApi';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { normalizeGtin } from '../utils/gtin';
import { fileToCanvas, canvasToJpegFile } from '../utils/imageTools';

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
// Zapas „zrób zdjęcie" — akcja drugorzędna: obwódka i tło, bez wypełnienia.
const PhotoBtn = styled.button`
    padding: 13px 18px; font-family: inherit; font-size: 15px; font-weight: 700;
    border-radius: 12px; cursor: pointer;
    border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); color: #fff;
    &:disabled { opacity: 0.5; cursor: default; }
`;
const HiddenFile = styled.input` display: none; `;
const Counter = styled.div` font-size: 14px; font-weight: 600; color: #34d399; `;
const Toast = styled.div` font-size: 13px; color: #fca5a5; min-height: 18px; `;
const Ok = styled.div` font-size: 13px; color: #34d399; min-height: 18px; `;

export function MobileProductScanView() {
    const [params] = useSearchParams();
    const token = params.get('s') ?? '';
    const { videoRef, active, error, startContinuous, stop, decodeImageFile } = useBarcodeScanner();
    const [count, setCount] = useState(0);
    const [expired, setExpired] = useState(false);
    const [lastCode, setLastCode] = useState('');
    const [msg, setMsg] = useState('');
    const [photoBusy, setPhotoBusy] = useState(false);
    const sendingRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Auto-start skanu ciągłego, gdy sesja żyje.
    useEffect(() => {
        if (!token || expired) return;
        startContinuous(submitCode);
        return () => stop();
    }, [token, expired, startContinuous, submitCode, stop]);

    // Zapas: zdjęcie → najpierw dekoder w przeglądarce, potem model wizyjny na serwerze.
    const onPhotoFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // to samo zdjęcie drugi raz też ma odpalić onChange
        if (!file) return;
        setPhotoBusy(true);
        setMsg('');
        try {
            const local = await decodeImageFile(file);
            if (local) { await submitCode(local); return; }
            const jpeg = await canvasToJpegFile(await fileToCanvas(file, 1600));
            const res = await mobileScanApi.submitPhoto(token, jpeg);
            if (res.gtin) {
                setCount(res.scannedCount);
                setLastCode(res.gtin);
            } else {
                setMsg('Nie udało się odczytać kodu ze zdjęcia. Zrób je z bliska, ostro i w dobrym świetle.');
            }
        } catch {
            setMsg('Nie udało się wysłać zdjęcia. Sesja mogła wygasnąć.');
        } finally {
            setPhotoBusy(false);
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
                {error ? (
                    <Sub>{error}</Sub>
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

                <PhotoBtn type="button" disabled={photoBusy} onClick={() => fileInputRef.current?.click()}>
                    {photoBusy ? 'Odczytuję zdjęcie…' : error ? 'Zrób zdjęcie kodu' : 'Nie łapie? Zrób zdjęcie kodu'}
                </PhotoBtn>
                <HiddenFile ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoFile} />

                {msg && <Toast>{msg}</Toast>}
                {lastCode && !msg && <Ok>Wysłano ✓ — ostatni kod: {lastCode}</Ok>}
                {count > 0 && <Counter>Wysłano kodów: {count}</Counter>}
            </Card>
        </Page>
    );
}
