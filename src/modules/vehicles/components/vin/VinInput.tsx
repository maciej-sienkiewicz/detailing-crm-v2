// src/modules/vehicles/components/vin/VinInput.tsx
//
// Pole VIN pojazdu: wpisanie ręczne albo ikona aparatu (telefon przez kod QR, zdjęcie
// z dysku). Jedno pole dla przyjęcia pojazdu, karty pojazdu i „Przyjęcia pojazdu"
// na wizycie - te trzy miejsca mają wyglądać i zachowywać się tak samo.
//
// Wpisywany tekst porządkujemy od razu (wielkie litery, bez spacji i myślników), tak
// jak zapisze go serwer: inaczej „wba 3a5…" w polu i „WBA3A5…" po zapisie wyglądałyby
// na dwa różne numery.
import { forwardRef } from 'react';
import { BareInput, InputShell } from '@/common/components/Form';
import { VinCameraButton } from './VinCameraButton';
import type { VinApi } from './vinApi';
import { VIN_MAX_LENGTH, cleanVin } from './vinFormat';

interface VinInputProps {
    id?: string;
    value: string;
    onChange: (vin: string) => void;
    /** Wyjście z pola - formularze z odroczonym zapisem (przyjęcie pojazdu) pytają tu o zmianę. */
    onBlur?: () => void;
    /**
     * VIN odczytany ze zdjęcia. Bez tej funkcji trafia do `onChange` jak wpisany.
     * Osobno, bo formularz przyjęcia pyta o zmianę przy wyjściu z pola - a przy
     * odczycie ze zdjęcia z pola się nie wychodzi.
     */
    onScanned?: (vin: string) => void;
    /** Odczyt ze zdjęcia nie wyszedł - komunikat dla użytkownika. */
    onScanError?: (message: string) => void;
    hasError?: boolean;
    disabled?: boolean;
    compact?: boolean;
    api?: VinApi;
    autoFocus?: boolean;
}

export const VinInput = forwardRef<HTMLInputElement, VinInputProps>(function VinInput(
    { id, value, onChange, onBlur, onScanned, onScanError, hasError, disabled, compact, api, autoFocus },
    ref,
) {
    return (
        <InputShell $hasError={hasError} $compact={compact}>
            <BareInput
                ref={ref}
                id={id}
                value={value}
                onChange={(event) => onChange(cleanVin(event.target.value))}
                onBlur={onBlur}
                placeholder="np. WBA3A5G59DNP26082"
                maxLength={VIN_MAX_LENGTH + 4}
                autoComplete="off"
                spellCheck={false}
                disabled={disabled}
                autoFocus={autoFocus}
                $compact={compact}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.05em' }}
            />
            <VinCameraButton
                api={api}
                disabled={disabled}
                onVin={(vin) => (onScanned ? onScanned(cleanVin(vin)) : onChange(cleanVin(vin)))}
                onError={onScanError}
            />
        </InputShell>
    );
});
