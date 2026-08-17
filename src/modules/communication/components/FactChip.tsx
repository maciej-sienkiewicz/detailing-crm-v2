// src/modules/communication/components/FactChip.tsx
// Wzorzec "kropkowany fakt" (§2.4): przerywana ramka = niezweryfikowana ekstrakcja,
// klik → popover z edycją inline, Enter zatwierdza → ramka ciągła.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { Fact, FactKey } from '../types';

const ChipWrapper = styled.span`
    position: relative;
    display: inline-flex;
`;

const Chip = styled.button<{ $verified: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    font-size: 13px;
    color: #1a1a1a;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px ${({ $verified }) => ($verified ? 'solid #e5e7eb' : 'dashed #9ca3af')};
    border-radius: 6px;
    cursor: pointer;

    &:hover {
        background: #f8fafc;
    }

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

const KeyLabel = styled.span`
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const Popover = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
    width: 260px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Input = styled.input`
    height: 32px;
    padding: 0 8px;
    font-size: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

const Hint = styled.span`
    font-size: 12px;
    color: #6b7280;
`;

const SaveButton = styled.button`
    align-self: flex-end;
    height: 28px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: ${({ theme }) => theme.colors.primary};
    border: none;
    border-radius: 6px;
    cursor: pointer;
`;

const FACT_KEY_LABELS: Record<FactKey, string> = {
    VEHICLE: 'Pojazd',
    SERVICE: 'Usługa',
    PHONE: 'Telefon',
    PREFERRED_DATE: 'Termin',
};

interface FactChipProps {
    fact: Fact;
    onSave: (factId: number, value: string) => void;
}

export const FactChip = ({ fact, onSave }: FactChipProps) => {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(fact.value);
    const wrapperRef = useRef<HTMLSpanElement>(null);

    // Synchronizacja stanu z propsem podczas renderu (wzorzec "adjust state on prop change").
    const [prevFactValue, setPrevFactValue] = useState(fact.value);
    if (prevFactValue !== fact.value) {
        setPrevFactValue(fact.value);
        setValue(fact.value);
    }

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const save = () => {
        const trimmed = value.trim();
        if (trimmed) onSave(fact.id, trimmed);
        setOpen(false);
    };

    return (
        <ChipWrapper ref={wrapperRef}>
            <Chip
                $verified={fact.verified}
                onClick={() => setOpen((o) => !o)}
                title={fact.verified ? undefined : 'Do potwierdzenia — kliknij, aby sprawdzić'}
            >
                <KeyLabel>{FACT_KEY_LABELS[fact.key]}</KeyLabel>
                {fact.value}
            </Chip>
            {open && (
                <Popover onClick={(e) => e.stopPropagation()}>
                    <Input
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') save();
                            if (e.key === 'Escape') setOpen(false);
                        }}
                    />
                    {!fact.verified && <Hint>Enter zatwierdza wartość.</Hint>}
                    <SaveButton onClick={save}>Zatwierdź</SaveButton>
                </Popover>
            )}
        </ChipWrapper>
    );
};
