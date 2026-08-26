// src/modules/calendar/components/QuickEventModal/SmsOptionsSheet.tsx
//
// Trzy powiadomienia SMS jako trzy niezależne przełączniki: każda kombinacja
// jest poprawna — sama karta wizyty, samo potwierdzenie, wszystko naraz albo nic.
// Wcześniej siedziały jako kwadraciki 15 px pod sekcją „Notatka, SMS, door to
// door", więc podczas rozmowy z klientem nikt do nich nie docierał.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useVisualViewportSheet } from '@/common/hooks';
import * as S from '../QuickEventModalStyles';
import { IconX } from './icons';

export interface SmsOption {
    key: 'confirmation' | 'reminder' | 'visitCard';
    label: string;
    description: string;
    checked: boolean;
    /** Wyłączone globalnie w konfiguracji studia — przełącznik nieaktywny. */
    disabledReason?: string;
    onChange: (checked: boolean) => void;
}

interface Props {
    isMobile: boolean;
    options: SmsOption[];
    /** Numer, na który pójdą wiadomości; brak = nie ma jak wysłać. */
    phone?: string | null;
    onClose: () => void;
}

export const SmsOptionsSheet = ({ isMobile, options, phone, onClose }: Props) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    useVisualViewportSheet(isMobile, sheetRef);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <>
            <Backdrop onClick={onClose} />
            <Sheet ref={sheetRef} role="dialog" aria-label="Powiadomienia SMS">
                <SheetHandle />
                <S.MobileSheetTitle>
                    <span>Powiadomienia SMS</span>
                    <S.MobileSheetClose type="button" aria-label="Zamknij" onClick={onClose}>
                        <IconX />
                    </S.MobileSheetClose>
                </S.MobileSheetTitle>

                <Body>
                    {phone
                        ? <Recipient>Wiadomości pójdą na <strong>{phone}</strong></Recipient>
                        : <Recipient $warn>Klient nie ma numeru telefonu — nie wyślemy żadnej wiadomości.</Recipient>
                    }

                    {options.map(opt => {
                        const blocked = !!opt.disabledReason || !phone;
                        return (
                            <OptionRow
                                key={opt.key}
                                $disabled={blocked}
                                onClick={() => { if (!blocked) opt.onChange(!opt.checked); }}
                            >
                                <OptionText>
                                    <OptionLabel>{opt.label}</OptionLabel>
                                    <OptionDesc>{opt.disabledReason ?? opt.description}</OptionDesc>
                                </OptionText>
                                <Switch
                                    type="button"
                                    role="switch"
                                    aria-checked={opt.checked && !blocked}
                                    aria-label={opt.label}
                                    disabled={blocked}
                                    $on={opt.checked && !blocked}
                                    onClick={(e) => { e.stopPropagation(); if (!blocked) opt.onChange(!opt.checked); }}
                                />
                            </OptionRow>
                        );
                    })}
                </Body>

                <Footer>
                    <DoneBtn type="button" onClick={onClose}>Gotowe</DoneBtn>
                </Footer>
            </Sheet>
        </>,
        document.body,
    );
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const Backdrop = styled(S.MobileSheetBackdrop)`
    @media (min-width: 640px) { background: rgba(15, 23, 42, 0.35); }
`;

const Sheet = styled(S.MobileBottomSheet)`
    @media (min-width: 640px) {
        top: 50%;
        left: 50%;
        right: auto;
        bottom: auto;
        transform: translate(-50%, -50%);
        width: 440px;
        max-height: min(560px, 90vh);
        border-radius: 16px;
        padding-top: 0;
        overflow: hidden;
        animation: none;
    }
`;

const SheetHandle = styled(S.MobileSheetHandle)`
    @media (min-width: 640px) { display: none; }
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 12px 16px 16px;
`;

const Recipient = styled.p<{ $warn?: boolean }>`
    margin: 0 0 10px;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => (p.$warn ? '#b45309' : '#94a3b8')};

    strong { color: #0f172a; font-variant-numeric: tabular-nums; }
`;

const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 10px 2px;
    border-top: 1px solid #f1f5f9;
    cursor: ${p => (p.$disabled ? 'default' : 'pointer')};
    opacity: ${p => (p.$disabled ? 0.5 : 1)};

    &:first-of-type { border-top: none; }
`;

const OptionText = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionLabel = styled.div`
    font-size: 14.5px;
    font-weight: 600;
    color: #0f172a;
`;

const OptionDesc = styled.div`
    margin-top: 2px;
    font-size: 12.5px;
    line-height: 1.4;
    color: #94a3b8;
`;

/** Przełącznik 52x32 — cel dotyku, nie kwadracik 15 px. */
const Switch = styled.button<{ $on: boolean }>`
    position: relative;
    flex-shrink: 0;
    width: 52px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${p => (p.$on ? '#0ea5e9' : '#cbd5e1')};
    cursor: inherit;
    transition: background 160ms ease;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => (p.$on ? '23px' : '3px')};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
        transition: left 160ms ease;
    }
`;

const Footer = styled.div`
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid #f1f5f9;
    background: #fff;
    flex-shrink: 0;
`;

const DoneBtn = styled.button`
    width: 100%;
    height: 48px;
    border: none;
    border-radius: 12px;
    background: #0ea5e9;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;

    &:active { background: #0284c7; }
`;
