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
//
// Koniec jest zawsze jasny: „Zakończ skanowanie" tutaj albo zamknięte okno na komputerze
// (telefon sprawdza to co kilka sekund i wyłącza aparat), albo nieważny link.

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { isAxiosError } from 'axios';
import {
    PhonePage, PhoneHeader, PhoneCard, PhoneNote, PhonePrimaryButton, PhoneSecondaryButton,
    PhoneEndScreen, PhoneLoading,
} from '@/common/components/PhonePage';
import { ui } from '@/common/components/ui/tokens';
import { mobileScanApi } from '../api/productsApi';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { normalizeGtin } from '../utils/gtin';
import { fileToCanvas, canvasToJpegFile } from '../utils/imageTools';
import { pluralPl } from '@/common/utils/plural';

/** Co ile telefon sprawdza, czy okno na komputerze jest jeszcze otwarte. */
const SESSION_POLL_MS = 5_000;

// Kadr aparatu z ramką celowniczą pośrodku — czytelny sygnał „tu ustaw kod".
const Viewport = styled.div`
    position: relative; width: 100%; aspect-ratio: 3/4; max-height: 52vh;
    border-radius: 14px; overflow: hidden; background: #0f172a;
`;
const Video = styled.video` width: 100%; height: 100%; object-fit: cover; display: block; `;
const Reticle = styled.div`
    position: absolute; inset: 18% 12%;
    border: 2px solid rgba(255,255,255,0.9); border-radius: 12px;
    box-shadow: 0 0 0 100vmax rgba(0,0,0,0.35);
    pointer-events: none;
`;
const Overlay = styled.div`
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: #e2e8f0; background: rgba(15,23,42,0.6);
`;
const HiddenFile = styled.input` display: none; `;
const Counter = styled.div`
    font-size: 14px; font-weight: 600; color: ${ui.textSecondary}; text-align: center;
`;

type Phase = 'loading' | 'active' | 'finished' | 'closed' | 'expired';

/** Odpowiedź serwera (sesja zamknięta, link nieważny) - w odróżnieniu od braku sieci. */
const isServerAnswer = (err: unknown) => isAxiosError(err) && !!err.response;

export function MobileProductScanView() {
    const [params] = useSearchParams();
    const token = params.get('s') ?? '';
    const { videoRef, active, error, startContinuous, stop, decodeImageFile } = useBarcodeScanner();
    const [phase, setPhase] = useState<Phase>('loading');
    const [count, setCount] = useState(0);
    const [lastCode, setLastCode] = useState('');
    const [msg, setMsg] = useState('');
    const [photoBusy, setPhotoBusy] = useState(false);
    const sendingRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Stan sesji z serwera: otwarta, zamknięta na komputerze albo nieważna. */
    const checkSession = useCallback(async () => {
        try {
            const ctx = await mobileScanApi.context(token);
            setCount(ctx.scannedCount);
            setPhase(ctx.status === 'OPEN' ? 'active' : 'closed');
        } catch (err) {
            // Brak sieci w warsztacie nie unieważnia linku - sprawdzimy przy następnym razie.
            if (isServerAnswer(err)) setPhase('expired');
            else setPhase(prev => (prev === 'loading' ? 'expired' : prev));
        }
    }, [token]);

    useEffect(() => {
        if (!token) { setPhase('expired'); return; }
        void checkSession();
    }, [token, checkSession]);

    // Okno na komputerze zamknięte = koniec. Telefon ma to zobaczyć sam, nie dopiero
    // przy następnym zeskanowanym kodzie.
    useEffect(() => {
        if (phase !== 'active') return;
        const id = window.setInterval(() => { void checkSession(); }, SESSION_POLL_MS);
        return () => window.clearInterval(id);
    }, [phase, checkSession]);

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
        } catch (err) {
            if (isServerAnswer(err)) await checkSession();
            else setMsg('Brak połączenia. Spróbuj jeszcze raz za chwilę.');
        } finally {
            sendingRef.current = false;
        }
    }, [token, checkSession]);

    // Skan ciągły tylko w otwartej sesji - po końcu aparat gaśnie.
    useEffect(() => {
        if (!token || phase !== 'active') return;
        startContinuous(submitCode);
        return () => stop();
    }, [token, phase, startContinuous, submitCode, stop]);

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
        } catch (err) {
            if (isServerAnswer(err)) await checkSession();
            else setMsg('Nie udało się wysłać zdjęcia. Sprawdź połączenie.');
        } finally {
            setPhotoBusy(false);
        }
    };

    const codes = `${count} ${pluralPl(count, 'kod', 'kody', 'kodów')}`;

    if (phase === 'loading') {
        return <PhonePage><PhoneLoading>Sprawdzanie linku…</PhoneLoading></PhonePage>;
    }
    if (phase === 'expired') {
        return (
            <PhonePage>
                <PhoneEndScreen tone="danger" title="Link wygasł">
                    Wróć do komputera i kliknij „Zeskanuj telefonem”, żeby dostać nowy kod QR.
                </PhoneEndScreen>
            </PhonePage>
        );
    }
    if (phase === 'closed') {
        return (
            <PhonePage>
                <PhoneEndScreen tone="ok" title="Zakończono na komputerze">
                    {count > 0 ? `Okno dodawania produktu jest zamknięte, przesłano ${codes}. ` : 'Okno dodawania produktu jest zamknięte. '}
                    Możesz zamknąć tę stronę.
                </PhoneEndScreen>
            </PhonePage>
        );
    }
    if (phase === 'finished') {
        return (
            <PhonePage>
                <PhoneEndScreen
                    tone="ok"
                    title="Gotowe"
                    actions={<PhoneSecondaryButton type="button" onClick={() => setPhase('active')}>Skanuj dalej</PhoneSecondaryButton>}
                >
                    {count > 0 ? `Przesłano ${codes} - są już w oknie na komputerze. ` : ''}
                    Możesz zamknąć tę stronę.
                </PhoneEndScreen>
            </PhonePage>
        );
    }

    return (
        <PhonePage>
            <PhoneHeader title="Skanuj produkt">
                {error ? 'Aparat się nie uruchomił. Zrób zdjęcie kodu.' : 'Skieruj aparat na kod kreskowy — złapiemy go automatycznie.'}
            </PhoneHeader>
            <PhoneCard>
                {!error && (
                    <Viewport>
                        <Video ref={videoRef} playsInline muted />
                        <Reticle />
                        {!active && <Overlay>Uruchamiam aparat…</Overlay>}
                    </Viewport>
                )}

                <PhoneSecondaryButton type="button" disabled={photoBusy} onClick={() => fileInputRef.current?.click()}>
                    {photoBusy ? 'Odczytuję zdjęcie…' : error ? 'Zrób zdjęcie kodu' : 'Nie łapie? Zrób zdjęcie kodu'}
                </PhoneSecondaryButton>
                <HiddenFile ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoFile} />

                {msg && <PhoneNote $tone="danger" role="alert">{msg}</PhoneNote>}
                {lastCode && !msg && <PhoneNote $tone="ok" role="status">Wysłano ✓ — ostatni kod: {lastCode}</PhoneNote>}
                {count > 1 && <Counter>Przesłano {codes}</Counter>}
            </PhoneCard>
            <PhonePrimaryButton type="button" onClick={() => { stop(); setPhase('finished'); }}>
                Zakończ skanowanie
            </PhonePrimaryButton>
        </PhonePage>
    );
}
