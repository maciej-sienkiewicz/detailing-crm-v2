/**
 * Przebieg przy przyjęciu, poprawiany z karty wizyty.
 *
 * Wcześniej było to pole edytowane w miejscu (Enter zapisuje, Escape porzuca).
 * Działało, ale było JEDYNYM takim miejscem w tej karcie: kontakt klienta
 * uzupełnia się oknem, więc dwa sąsiadujące pola uczyły dwóch różnych
 * odruchów. Okno wygrywa również dlatego, że przebieg to liczba przepisywana
 * z licznika - wymaga chwili uwagi i jawnego "Zapisz", a nie pola, z którego
 * można wyjść kliknięciem obok i nie wiedzieć, czy zapisało.
 */

import { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const LabelRow = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #374151;
`;

const LabelNote = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
`;

const InputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Input = styled.input`
    flex: 1;
    min-width: 0;
    padding: 10px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    color: #0f172a;
    background: #fff;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }

    &::placeholder { color: #94a3b8; }
`;

const Unit = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    flex-shrink: 0;
`;

const FieldError = styled.p`
    margin: 0;
    font-size: 12px;
    color: #dc2626;
`;

const BtnPrimary = styled.button`
    padding: 10px 20px;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 150ms ease;

    &:hover:not(:disabled) { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BtnGhost = styled.button`
    padding: 10px 20px;
    background: transparent;
    color: #64748b;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;

    &:hover { background: #f8fafc; border-color: #cbd5e1; }
`;

const Header = styled(ModalHeader)`
    align-items: center;
`;

/** Ponad milion km na liczniku to prawie zawsze literówka, a nie pojazd. */
const MAX_MILEAGE = 1_000_000;

interface MileageModalProps {
    isOpen: boolean;
    mileage?: number;
    onSave: (mileage: number) => void;
    onClose: () => void;
}

export const MileageModal = ({ isOpen, mileage, onSave, onClose }: MileageModalProps) => {
    const hasMileage = typeof mileage === 'number' && mileage > 0;
    /* Okno montuje się dopiero przy otwarciu (patrz InfoCards), więc stan
       startowy bierzemy z propsów przy pierwszym renderze. Efekt, który
       zerował pola po otwarciu, był tu zbędnym drugim renderem. */
    const [draft, setDraft] = useState(() => (hasMileage ? String(mileage) : ''));
    const [touched, setTouched] = useState(false);

    /* Ludzie przepisują z licznika ze spacjami ("124 000") - spacje lecą,
       zamiast krzyczeć o błąd. */
    const normalised = draft.replace(/\s/g, '');
    const isEmpty = normalised.length === 0;
    const isNumeric = /^\d+$/.test(normalised);
    const parsed = isNumeric ? Number(normalised) : NaN;
    const tooBig = isNumeric && parsed > MAX_MILEAGE;
    const valid = isNumeric && !tooBig;

    const error = isEmpty ? 'Podaj przebieg'
        : !isNumeric ? 'Przebieg to liczba kilometrów, bez liter'
        : tooBig ? 'Sprawdź wartość - to więcej niż milion kilometrów'
        : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!valid) return;
        onClose();
        if (parsed !== (mileage ?? 0)) onSave(parsed);
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="420px">
            <Header>
                <ModalTitleGroup>
                    <ModalTitle>{hasMileage ? 'Popraw przebieg' : 'Uzupełnij przebieg'}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} aria-label="Zamknij" />
            </Header>

            <form onSubmit={handleSubmit}>
                <ModalContent>
                    <Field>
                        <LabelRow>
                            <Label htmlFor="mileage-input">Przebieg przy przyjęciu</Label>
                            <LabelNote>Obowiązkowe</LabelNote>
                        </LabelRow>
                        <InputRow>
                            <Input
                                id="mileage-input"
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                placeholder="np. 124 000"
                            />
                            <Unit>km</Unit>
                        </InputRow>
                        {touched && error && <FieldError>{error}</FieldError>}
                    </Field>
                </ModalContent>

                <ModalFooter>
                    <BtnGhost type="button" onClick={onClose}>Anuluj</BtnGhost>
                    <BtnPrimary type="submit">Zapisz</BtnPrimary>
                </ModalFooter>
            </form>
        </ModalShell>
    );
};
