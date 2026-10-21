// src/modules/calendar/components/QuickEventModal/SmsOptionsSheet.tsx
//
// Trzy powiadomienia SMS jako trzy niezależne przełączniki: każda kombinacja
// jest poprawna - sama karta wizyty, samo potwierdzenie, wszystko naraz albo nic.
// Wcześniej siedziały jako kwadraciki 15 px pod sekcją „Notatka, SMS, door to
// door", więc podczas rozmowy z klientem nikt do nich nie docierał.
//
// Lista [SmsOptionsList] jest jedna dla telefonu (w arkuszu) i komputera (w sekcji
// formularza). Wcześniej komputer miał własne checkboksy, które chowały kartę wizyty,
// gdy była wyłączona, i nie wiedziały nic o numerze klienta - ten sam formularz mówił
// na dwóch ekranach dwie różne rzeczy.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useVisualViewportSheet } from '@/common/hooks';
import { Toggle } from '@/common/components/Toggle';
import { Button, ui } from '@/common/components/ui';
import * as S from '../QuickEventModalStyles';
import { IconX } from './icons';

export interface SmsOption {
    key: 'confirmation' | 'reminder' | 'visitCard';
    label: string;
    description: string;
    checked: boolean;
    /** Wyłączone globalnie w konfiguracji studia - przełącznik nieaktywny. */
    disabledReason?: string;
    onChange: (checked: boolean) => void;
}

interface ListProps {
    options: SmsOption[];
    /** Numer, na który pójdą wiadomości; brak = nie ma jak wysłać. */
    phone?: string | null;
    /** Większy przełącznik pod palec. */
    touch?: boolean;
}

export const SmsOptionsList = ({ options, phone, touch }: ListProps) => {
    const idBase = useId();
    return (
        <>
            {phone
                ? <Recipient>Wiadomości pójdą na <strong>{phone}</strong></Recipient>
                : <Recipient $warn>Klient nie ma numeru telefonu, więc nie wyślemy żadnej wiadomości.</Recipient>
            }
            {options.map(opt => {
                const blocked = !!opt.disabledReason || !phone;
                const inputId = `${idBase}-${opt.key}`;
                return (
                    <OptionRow key={opt.key} $disabled={blocked}>
                        <OptionText htmlFor={inputId}>
                            <OptionLabel>{opt.label}</OptionLabel>
                            <OptionDesc>{opt.disabledReason ?? opt.description}</OptionDesc>
                        </OptionText>
                        <Toggle
                            inputId={inputId}
                            ariaLabel={opt.label}
                            checked={opt.checked && !blocked}
                            disabled={blocked}
                            onChange={opt.onChange}
                            size={touch ? 'lg' : 'md'}
                        />
                    </OptionRow>
                );
            })}
        </>
    );
};

interface Props {
    isMobile: boolean;
    options: SmsOption[];
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
                    <SmsOptionsList options={options} phone={phone} touch={isMobile} />
                </Body>

                <Footer>
                    <Button variant="primary" size="lg" block onClick={onClose}>Gotowe</Button>
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
    color: ${p => (p.$warn ? ui.warnInk : ui.textMuted)};

    strong { color: ${ui.ink}; font-variant-numeric: tabular-nums; }
`;

const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 8px 2px;
    border-top: 1px solid ${ui.lineFaint};
    opacity: ${p => (p.$disabled ? 0.5 : 1)};

    &:first-of-type { border-top: none; }
`;

const OptionText = styled.label`
    flex: 1;
    min-width: 0;
    cursor: pointer;
`;

const OptionLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

const OptionDesc = styled.div`
    margin-top: 2px;
    font-size: 12.5px;
    line-height: 1.4;
    color: ${ui.textMuted};
`;

const Footer = styled.div`
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid ${ui.lineFaint};
    background: ${ui.surface};
    flex-shrink: 0;
`;
