// src/modules/calendar/components/QuickEventModal/NewCustomerSheet.tsx
//
// „Dodaj nowego klienta" zapisywało klienta od razu, z samym imieniem wpisanym
// w wyszukiwarkę — bez telefonu i maila, czyli bez czegokolwiek, czym można go
// później zawiadomić o wizycie. Zamiast tego pokazujemy krótki formularz:
// cztery pola, „Zatwierdź" i „X" na wycofanie się z operacji.
// Na telefonie to arkusz przy dolnej krawędzi, na komputerze okno na środku.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useVisualViewportSheet } from '@/common/hooks';
import * as S from '../QuickEventModalStyles';
import { IconX } from './icons';

export interface NewCustomerDraft {
    firstName: string;
    lastName: string;
    phonePrefix: string;
    phone: string;
    email: string;
}

interface Props {
    /** Telefon dostaje arkusz przyklejony do klawiatury, komputer zwykłe okno. */
    isMobile: boolean;
    initial: NewCustomerDraft;
    onCancel: () => void;
    onConfirm: (draft: NewCustomerDraft) => void;
}

export const NewCustomerSheet = ({ isMobile, initial, onCancel, onConfirm }: Props) => {
    const [firstName, setFirstName] = useState(initial.firstName);
    const [lastName, setLastName] = useState(initial.lastName);
    const [phonePrefix, setPhonePrefix] = useState(initial.phonePrefix || '+48');
    const [phone, setPhone] = useState(initial.phone);
    const [email, setEmail] = useState(initial.email);
    const [touched, setTouched] = useState(false);

    const sheetRef = useRef<HTMLDivElement>(null);
    // Hak przykleja arkusz do widocznego pasa nad klawiaturą — na komputerze
    // nadpisywałby wyśrodkowanie okna i wypychał nagłówek poza ekran.
    useVisualViewportSheet(isMobile, sheetRef);

    // Escape zamyka arkusz tak samo jak „X" — na tablecie z klawiaturą to odruch.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);

    // Bez telefonu ani maila klient jest bezużyteczny: nie ma jak wysłać
    // przypomnienia ani karty wizyty, więc zapis jest zablokowany.
    const hasContact = phone.trim().length > 0 || email.trim().length > 0;
    const emailLooksWrong = email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const canSubmit = hasContact && !emailLooksWrong;

    const submit = () => {
        setTouched(true);
        if (!canSubmit) return;
        onConfirm({ firstName: firstName.trim(), lastName: lastName.trim(), phonePrefix, phone: phone.trim(), email: email.trim() });
    };

    return createPortal(
        <>
            <Backdrop onClick={onCancel} />
            <Sheet ref={sheetRef} role="dialog" aria-label="Nowy klient">
                <SheetHandle />
                <S.MobileSheetTitle>
                    <span>Nowy klient</span>
                    <S.MobileSheetClose type="button" aria-label="Anuluj dodawanie klienta" onClick={onCancel}>
                        <IconX />
                    </S.MobileSheetClose>
                </S.MobileSheetTitle>

                <Body>
                    <Field>
                        <FieldLabel htmlFor="qe-new-cust-first">Imię</FieldLabel>
                        <Input
                            id="qe-new-cust-first"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            autoCapitalize="words"
                            autoComplete="off"
                            enterKeyHint="next"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="qe-new-cust-last">Nazwisko</FieldLabel>
                        <Input
                            id="qe-new-cust-last"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            autoCapitalize="words"
                            autoComplete="off"
                            enterKeyHint="next"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="qe-new-cust-phone">Numer telefonu</FieldLabel>
                        <PhoneRow $error={touched && !hasContact}>
                            <PrefixInput
                                value={phonePrefix}
                                onChange={e => setPhonePrefix(e.target.value)}
                                inputMode="tel"
                                aria-label="Kierunkowy"
                            />
                            <PhoneInput
                                id="qe-new-cust-phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                inputMode="tel"
                                autoComplete="off"
                                enterKeyHint="next"
                                placeholder="600 100 200"
                            />
                        </PhoneRow>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="qe-new-cust-email">Adres e-mail</FieldLabel>
                        <Input
                            id="qe-new-cust-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            inputMode="email"
                            autoCapitalize="none"
                            autoComplete="off"
                            enterKeyHint="done"
                            placeholder="jan@example.com"
                            $error={(touched && !hasContact) || emailLooksWrong}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                        />
                    </Field>

                    {emailLooksWrong ? (
                        <Hint $error>Adres e-mail wygląda na niepełny.</Hint>
                    ) : touched && !hasContact ? (
                        <Hint $error>Podaj numer telefonu albo adres e-mail — bez tego nie zapiszemy klienta.</Hint>
                    ) : (
                        <Hint>Wystarczy jedno: numer telefonu albo adres e-mail.</Hint>
                    )}
                </Body>

                <Footer>
                    <GhostBtn type="button" onClick={onCancel}>Anuluj</GhostBtn>
                    <PrimaryBtn type="button" onClick={submit} disabled={!canSubmit}>Zatwierdź</PrimaryBtn>
                </Footer>
            </Sheet>
        </>,
        document.body,
    );
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const Backdrop = styled(S.MobileSheetBackdrop)`
    @media (min-width: 640px) {
        background: rgba(15, 23, 42, 0.35);
    }
`;

/* Na komputerze arkusz przestaje być arkuszem: zwykłe okno na środku, szerokie
   na tyle, żeby cztery pola nie rozjechały się przez pół ekranu. */
const Sheet = styled(S.MobileBottomSheet)`
    @media (min-width: 640px) {
        top: 50%;
        left: 50%;
        right: auto;
        bottom: auto;
        transform: translate(-50%, -50%);
        width: 420px;
        max-height: min(560px, 90vh);
        border-radius: 16px;
        padding-top: 0;
        overflow: hidden;
        animation: none;
    }
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 14px 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SheetHandle = styled(S.MobileSheetHandle)`
    @media (min-width: 640px) { display: none; }
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const FieldLabel = styled.label`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const inputBase = `
    width: 100%;
    box-sizing: border-box;
    height: 46px;
    padding: 0 14px;
    border-radius: 12px;
    font-family: inherit;
    font-size: 16px; /* < 16px każe iOS-owi przybliżyć ekran przy focusie */
    color: #0f172a;
    background: #fff;
    outline: none;
`;

const Input = styled.input<{ $error?: boolean }>`
    ${inputBase}
    border: 1.5px solid ${p => (p.$error ? '#fca5a5' : '#e2e8f0')};

    &:focus { border-color: ${p => (p.$error ? '#ef4444' : '#0ea5e9')}; }
    &::placeholder { color: #cbd5e1; }
`;

const PhoneRow = styled.div<{ $error?: boolean }>`
    display: flex;
    gap: 8px;

    input { border-color: ${p => (p.$error ? '#fca5a5' : '#e2e8f0')}; }
`;

const PrefixInput = styled.input`
    ${inputBase}
    width: 74px;
    flex-shrink: 0;
    text-align: center;
    border: 1.5px solid #e2e8f0;

    &:focus { border-color: #0ea5e9; }
`;

const PhoneInput = styled.input`
    ${inputBase}
    border: 1.5px solid #e2e8f0;

    &:focus { border-color: #0ea5e9; }
    &::placeholder { color: #cbd5e1; }
`;

const Hint = styled.p<{ $error?: boolean }>`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => (p.$error ? '#b91c1c' : '#94a3b8')};
`;

const Footer = styled.div`
    display: flex;
    gap: 10px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid #f1f5f9;
    background: #fff;
    flex-shrink: 0;
`;

const GhostBtn = styled.button`
    flex: 1;
    height: 48px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;

    &:active { background: #f8fafc; }
`;

const PrimaryBtn = styled.button`
    flex: 1.4;
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
    &:disabled { background: #cbd5e1; cursor: default; }
`;
