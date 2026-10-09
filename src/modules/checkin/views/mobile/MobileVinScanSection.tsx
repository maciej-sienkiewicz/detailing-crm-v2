// src/modules/checkin/views/mobile/MobileVinScanSection.tsx
//
// Telefon w sesji VIN_SCAN („VIN telefonem" w oknie wpisu zlecenia zbiorczego): jedno
// zdjęcie tabliczki VIN albo dowodu rejestracyjnego. Serwer odczytuje numer i oddaje go
// oknu na komputerze; tutaj pokazujemy wynik, żeby operator przy aucie wiedział, czy
// może iść dalej, czy powtórzyć zdjęcie.
//
// Bez kolejki offline z przyjęcia pojazdu: wynik jest potrzebny teraz, przy otwartym
// oknie na komputerze - zdjęcie wysłane za godzinę nikomu już nie pomoże.

import { useState } from 'react';
import { checkinApi } from '../../api/checkinApi';
import { prepareImageOrExplain } from '../../services/imageUploadPrep';
import { describeUploadError, isSessionGoneError } from './uploadErrors';
import {
    AllDoneCard,
    CameraBtn,
    CaptureRow,
    ErrorMsg,
    GalleryBtn,
    HiddenInput,
    InfoCard,
    PreparingLabel,
    Spinner,
} from './MobilePhotoUpload.styles';

type ScanState =
    | { kind: 'idle' }
    | { kind: 'reading' }
    | { kind: 'read'; vin: string }
    | { kind: 'unreadable' }
    | { kind: 'error'; message: string };

interface Props {
    token: string;
    onSessionGone: () => void;
}

export const MobileVinScanSection = ({ token, onSessionGone }: Props) => {
    const [state, setState] = useState<ScanState>({ kind: 'idle' });

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0];
        e.target.value = '';
        if (!picked) return;
        setState({ kind: 'reading' });
        // HEIC z iPhone'a i duże zdjęcia - ta sama obróbka co przy przyjęciu pojazdu.
        const prepared = await prepareImageOrExplain(picked);
        if (!prepared.file) {
            setState({ kind: 'error', message: prepared.error });
            return;
        }
        try {
            const vin = await checkinApi.scanMobileVin(prepared.file, token);
            setState(vin ? { kind: 'read', vin } : { kind: 'unreadable' });
        } catch (err) {
            if (isSessionGoneError(err)) {
                onSessionGone();
                return;
            }
            setState({ kind: 'error', message: describeUploadError(err) });
        }
    };

    const reading = state.kind === 'reading';
    const again = state.kind !== 'idle' && !reading;

    return (
        <>
            {state.kind === 'read' ? (
                <AllDoneCard role="status">
                    ✓ Odczytano VIN
                    <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.06em', color: '#ffffff' }}>
                        {state.vin}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                        Numer jest już w oknie na komputerze. Przy kolejnym aucie zrób następne zdjęcie.
                    </div>
                </AllDoneCard>
            ) : (
                <InfoCard>
                    Zrób zdjęcie tabliczki VIN (szyba, słupek drzwi) albo dowodu rejestracyjnego.
                    Odczytany numer sam wpisze się w okno na komputerze.
                </InfoCard>
            )}

            {state.kind === 'unreadable' && (
                <ErrorMsg role="alert" style={{ fontSize: 14, marginBottom: 12 }}>
                    Nie udało się odczytać VIN. Zrób zdjęcie jeszcze raz, bliżej i bez odblasków.
                </ErrorMsg>
            )}
            {state.kind === 'error' && (
                <ErrorMsg role="alert" style={{ fontSize: 14, marginBottom: 12 }}>{state.message}</ErrorMsg>
            )}

            {reading ? (
                <PreparingLabel role="status">
                    <Spinner style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Odczytuję VIN…
                </PreparingLabel>
            ) : (
                <CaptureRow>
                    <CameraBtn htmlFor="vin-camera-input">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        {again ? 'Zrób kolejne' : 'Zrób zdjęcie'}
                    </CameraBtn>
                    <GalleryBtn htmlFor="vin-gallery-input">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Z galerii
                    </GalleryBtn>
                </CaptureRow>
            )}
            {/* Dwa pola: `capture` wymusza aparat, więc galeria potrzebuje własnego. */}
            <HiddenInput id="vin-camera-input" type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={reading} />
            <HiddenInput id="vin-gallery-input" type="file" accept="image/*" onChange={handleFile} disabled={reading} />
        </>
    );
};
