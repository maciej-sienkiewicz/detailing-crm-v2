// src/modules/vehicles/components/vin/VinEditModal.tsx
//
// Wpisanie albo poprawka VIN z karty pojazdu i z „Przyjęcia pojazdu" na wizycie.
//
// Okno, a nie pole edytowane w miejscu - z tego samego powodu co przebieg (MileageModal):
// VIN przepisuje się z tabliczki albo dowodu, więc potrzebuje chwili uwagi i jawnego
// „Zapisz". W oknie jest też ikona aparatu: zdjęcie z dysku albo telefon przez kod QR.
import { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FieldLabel, FormErrorMsg, FormField } from '@/common/components/Form';
import { Button } from '@/common/components/ui';
import { VinInput } from './VinInput';

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

interface VinEditModalProps {
    vin: string | null | undefined;
    /** Pusty napis - usunięcie VIN. */
    onSave: (vin: string) => void;
    onClose: () => void;
    /** Np. „Audi A6, WZ 1054A" - którego auta dotyczy numer. */
    subtitle?: string;
    saving?: boolean;
}

export function VinEditModal({ vin, onSave, onClose, subtitle, saving }: VinEditModalProps) {
    // Okno montuje się przy otwarciu, więc stan startowy bierzemy z propsów raz.
    const [draft, setDraft] = useState(vin ?? '');
    const [scanError, setScanError] = useState<string | null>(null);
    const had = Boolean(vin);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (draft !== (vin ?? '')) onSave(draft);
        else onClose();
    };

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="460px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{had ? 'Popraw VIN' : 'Dodaj VIN'}</ModalTitle>
                    {subtitle && <ModalSubtitle>{subtitle}</ModalSubtitle>}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} aria-label="Zamknij" />
            </ModalHeader>
            <form onSubmit={submit}>
                <ModalContent>
                    <FormField>
                        <FieldLabel htmlFor="vin-edit-input">VIN</FieldLabel>
                        <VinInput
                            id="vin-edit-input"
                            value={draft}
                            autoFocus
                            onChange={(next) => { setDraft(next); setScanError(null); }}
                            onScanError={setScanError}
                        />
                        {scanError && <FormErrorMsg>{scanError}</FormErrorMsg>}
                    </FormField>
                    <Hint style={{ marginTop: 10 }}>
                        Wpisz numer z tabliczki albo dowodu rejestracyjnego, albo kliknij aparat
                        i zrób zdjęcie telefonem. Numer trafi do karty pojazdu.
                    </Hint>
                </ModalContent>
                <ModalFooter>
                    <Button onClick={onClose}>Anuluj</Button>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Zapisz'}
                    </Button>
                </ModalFooter>
            </form>
        </ModalShell>
    );
}
