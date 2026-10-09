// src/modules/vehicles/components/vin/VinCameraButton.tsx
//
// Ikona aparatu przy polu VIN - jeden klocek dla każdego miejsca, w którym wpisuje się
// VIN (przyjęcie pojazdu, karta pojazdu, wizyta, wpis zlecenia zbiorczego).
//
// Na komputerze pyta, skąd zdjęcie: telefonem przez kod QR (telefon nie musi być
// zalogowany) albo plik z dysku. Na telefonie od razu otwiera aparat - kod QR dla
// telefonu, który sam jest telefonem, nie ma sensu.
//
// Pole tekstowe zostaje u wywołującego: każdy formularz ma swój wygląd pól, a ten
// przycisk tylko oddaje odczytany VIN przez `onVin`.
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Camera, ImageUp, Loader2, QrCode } from 'lucide-react';
import { useMediaQuery } from '@/common/hooks';
import { ActionMenu, MenuItem, useActionMenu } from '@/common/components/ui';
import { VinQrModal } from './VinQrModal';
import { vehicleVinApi, type VinApi } from './vinApi';

const Btn = styled.button.attrs({ type: 'button' })`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0 12px;
    min-width: 40px;
    align-self: stretch;
    min-height: 36px;
    border: none;
    border-left: 1px solid #e2e8f0;
    border-radius: 0 10px 10px 0;
    background: none;
    color: var(--brand-primary, #0ea5e9);
    cursor: pointer;
    transition: background 0.15s ease;

    svg { width: 16px; height: 16px; }
    .spin { animation: vinSpin 0.9s linear infinite; }
    @keyframes vinSpin { to { transform: rotate(360deg); } }
    &:hover:not(:disabled) { background: #f0f9ff; }
    &:disabled { color: #94a3b8; cursor: not-allowed; }
    &:focus-visible { outline: 2px solid var(--brand-primary, #0ea5e9); outline-offset: -2px; }
`;

interface Props {
    onVin: (vin: string) => void;
    /** Zdjęcie z dysku, z którego nie dało się odczytać VIN, albo błąd odczytu. */
    onError?: (message: string) => void;
    /** Endpointy odczytu - domyślnie pojazdowe; zlecenia zbiorcze podają swoje. */
    api?: VinApi;
    disabled?: boolean;
    className?: string;
}

export function VinCameraButton({ onVin, onError, api = vehicleVinApi, disabled, className }: Props) {
    const isPhone = useMediaQuery('(max-width: 767px)');
    const menu = useActionMenu();
    const fileRef = useRef<HTMLInputElement>(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [reading, setReading] = useState(false);

    const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setReading(true);
        try {
            const vin = await api.extractVin(file);
            if (vin) onVin(vin);
            else onError?.('Nie udało się odczytać VIN ze zdjęcia. Spróbuj ponownie lub wpisz ręcznie.');
        } catch {
            onError?.('Błąd podczas analizy zdjęcia. Spróbuj ponownie.');
        } finally {
            setReading(false);
        }
    };

    return (
        <>
            <Btn
                className={className}
                title="Odczytaj VIN ze zdjęcia"
                aria-label="Odczytaj VIN ze zdjęcia"
                aria-haspopup={isPhone ? undefined : 'menu'}
                aria-expanded={isPhone ? undefined : menu.isOpen()}
                disabled={disabled || reading}
                onClick={(event) => (isPhone ? fileRef.current?.click() : menu.toggle(event, null))}
            >
                {reading ? <Loader2 className="spin" /> : <Camera />}
            </Btn>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={readFile}
            />
            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Skąd zdjęcie VIN">
                <MenuItem icon={<QrCode />} onClick={() => { menu.close(); setQrOpen(true); }}>
                    Telefonem (kod QR)
                </MenuItem>
                <MenuItem icon={<ImageUp />} onClick={() => { menu.close(); fileRef.current?.click(); }}>
                    Zdjęcie z komputera
                </MenuItem>
            </ActionMenu>
            {qrOpen && (
                <VinQrModal
                    api={api}
                    onClose={() => setQrOpen(false)}
                    onVin={(vin) => {
                        setQrOpen(false);
                        onVin(vin);
                    }}
                />
            )}
        </>
    );
}
