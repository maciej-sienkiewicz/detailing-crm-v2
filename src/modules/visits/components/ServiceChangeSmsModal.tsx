// src/modules/visits/components/ServiceChangeSmsModal.tsx
//
// Modal potwierdzenia wysyłki SMS-a o zmianach w usługach.
//
// Treść składamy lokalnie z danych, które CRM już ma (nazwy usług + cena końcowa),
// więc pojawia się natychmiast. Użytkownik może ją dowolnie poprawić.
// Fraza z prośbą o odpowiedź "TAK" jest doklejana przy wysyłce po stronie serwera
// i nie da się jej zmienić ani usunąć.

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { formatCurrency } from '@/common/utils';
import {
    CONSENT_CALL_TO_ACTION,
    buildServiceChangeSmsMessage,
    hasPolishCharacters,
    toAscii,
} from '../utils/serviceChangeSms';
import type { ServiceChangeSummary } from '../utils/serviceChangeSms';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

/* Bez polskich znaków SMS mieści się w GSM-7 (160 znaków na segment, 153 przy
   dzieleniu). Z ogonkami operator przechodzi na UCS-2 i segment ma 70 znaków. */
const GSM_SINGLE = 160;
const GSM_MULTI = 153;
const UCS2_SINGLE = 70;
const UCS2_MULTI = 67;

const segmentsFor = (length: number, polish: boolean) => {
    const single = polish ? UCS2_SINGLE : GSM_SINGLE;
    const multi = polish ? UCS2_MULTI : GSM_MULTI;
    if (length === 0) return 1;
    return length <= single ? 1 : Math.ceil(length / multi);
};

/** Polska odmiana: 1 SMS, 2-4 SMS-y, 5+ SMS-ów. */
const smsWord = (count: number) => {
    if (count === 1) return 'SMS';
    const last = count % 10;
    const lastTwo = count % 100;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'SMS-y' : 'SMS-ów';
};

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 9999;
`;

const Card = styled.div`
    width: 100%;
    max-width: 520px;
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
`;

const Header = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${st.border};
`;

const Title = styled.h4`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${st.text};
`;

const Subtitle = styled.p`
    margin: 3px 0 0;
    font-size: 12px;
    color: ${st.textMuted};
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    padding: 5px;
    color: ${st.textMuted};
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    transition: all 150ms ease;

    &:hover { color: ${st.accentRed}; background: ${st.bgAccentRed}; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    svg { width: 15px; height: 15px; }
`;

const Body = styled.div`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
`;

const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
`;

const TotalsBox = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 10px 14px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: 10px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: ${st.textSecondary};
`;

const TotalsOld = styled.span`
    text-decoration: line-through;
    color: ${st.textMuted};
`;

const TotalsNew = styled.span`
    font-size: 15px;
    font-weight: 800;
    color: ${BRAND_DARK};
`;

/* Jedna wspólna ramka wokół pola tekstowego i doklejanej frazy — nic jej nie
   "przecina" niezależnie od długości tekstu ani liczby linii w polu. */
const FieldGroup = styled.div<{ $focused?: boolean }>`
    border: 1.5px solid ${p => p.$focused ? BRAND : st.border};
    border-radius: 10px;
    background: ${st.bgCard};
    overflow: hidden;
    transition: border-color 180ms;
    ${p => p.$focused && `box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);`}
`;

const Textarea = styled.textarea`
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 104px;
    resize: vertical;
    padding: 10px 12px;
    border: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: ${st.text};
    background: transparent;
    outline: none;

    &::placeholder { color: ${st.textMuted}; }
`;

const LockedSuffix = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1.5px solid ${st.border};
    background: ${st.bg};
    font-size: 14px;
    line-height: 1.5;
    color: ${st.textSecondary};

    svg { width: 13px; height: 13px; flex-shrink: 0; margin-top: 2px; color: ${st.textMuted}; }
`;

const LockedSuffixText = styled.span`
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;
`;

const HintRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 11px;
    color: ${st.textMuted};
`;

const Counter = styled.span<{ $warn?: boolean }>`
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$warn ? st.accentAmber : st.textMuted};
    font-weight: ${p => p.$warn ? 700 : 500};
`;

/* ── Przełącznik polskich znaków ── */

const ToggleRow = styled.label`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: 10px;
    cursor: pointer;
`;

const ToggleTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

const ToggleTitle = styled.span`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
`;

const ToggleHint = styled.span`
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: ${st.textMuted};
`;

const Switch = styled.span<{ $on?: boolean }>`
    flex-shrink: 0;
    position: relative;
    width: 40px;
    height: 22px;
    border-radius: 999px;
    background: ${p => p.$on ? BRAND : st.borderHover};
    transition: background 160ms ease;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => p.$on ? '21px' : '3px'};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        transition: left 160ms ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
`;

const HiddenCheckbox = styled.input`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
`;

const Footer = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};
`;

const CancelBtn = styled.button`
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: ${st.textSecondary};
    background: transparent;
    border: 1.5px solid ${st.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 150ms ease;
    &:hover { background: ${st.bgCardAlt}; }
`;

const SendBtn = styled.button`
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    color: #ffffff;
    background: ${BRAND};
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 150ms ease;
    &:hover { background: ${BRAND_DARK}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

interface Props {
    summary: ServiceChangeSummary;
    /** Cena końcowa brutto przed zmianami, w groszach. */
    totalGrossBefore: number;
    /** true = klient ma potwierdzić zmiany odpowiedzią SMS. */
    requireConfirmation: boolean;
    isSaving: boolean;
    onCancel: () => void;
    onConfirm: (smsMessage: string, usePolishCharacters: boolean) => void;
}

export const ServiceChangeSmsModal = ({
    summary,
    totalGrossBefore,
    requireConfirmation,
    isSaving,
    onCancel,
    onConfirm,
}: Props) => {
    // Wersja kanoniczna — z ogonkami. To, co widać w polu, zależy od przełącznika:
    // przy wyłączonych polskich znakach pokazujemy transliterację. Dzięki temu
    // przełączanie tam i z powrotem nie gubi treści.
    const initialMessage = useMemo(() => buildServiceChangeSmsMessage(summary), [summary]);
    const [message, setMessage] = useState(initialMessage);
    const [usePolish, setUsePolish] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSaving) onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel, isSaving]);

    const [fieldFocused, setFieldFocused] = useState(false);

    const displayed = usePolish ? message : toAscii(message);
    // Fraza o potwierdzeniu ma sens tylko wtedy, gdy klient faktycznie ma na co odpisać.
    const suffix = requireConfirmation
        ? (usePolish ? CONSENT_CALL_TO_ACTION : toAscii(CONSENT_CALL_TO_ACTION))
        : null;

    const handleChange = (value: string) => {
        // Ogonek wpisany przy wyłączonym przełączniku = użytkownik jednak ich chce.
        if (!usePolish && hasPolishCharacters(value)) {
            setUsePolish(true);
            setMessage(value);
            return;
        }
        // Bez realnej zmiany trzymamy wersję z ogonkami, żeby przełącznik ją odzyskał.
        if (!usePolish && value === toAscii(message)) return;
        setMessage(value);
    };

    const trimmed = displayed.trim();
    const fullLength = (trimmed ? trimmed.length : 0) + (suffix ? (trimmed ? 1 : 0) + suffix.length : 0);
    const segments = segmentsFor(fullLength, usePolish);
    const canSend = trimmed.length > 0 && !isSaving;

    return (
        <Overlay onClick={() => { if (!isSaving) onCancel(); }}>
            <Card onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Treść SMS-a do klienta">
                <Header>
                    <div>
                        <Title>SMS do klienta</Title>
                        <Subtitle>
                            {requireConfirmation
                                ? 'Klient potwierdzi zmiany, odpisując TAK'
                                : 'Klient dostanie informację o zmianach'}
                        </Subtitle>
                    </div>
                    <CloseBtn type="button" onClick={onCancel} disabled={isSaving} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </Header>

                <Body>
                    <TotalsBox>
                        <span>Cena końcowa brutto</span>
                        {totalGrossBefore !== summary.totalGrossAfter && (
                            <>
                                <TotalsOld>{formatCurrency(totalGrossBefore / 100)}</TotalsOld>
                                <span style={{ color: BRAND }}>→</span>
                            </>
                        )}
                        <TotalsNew>{formatCurrency(summary.totalGrossAfter / 100)}</TotalsNew>
                    </TotalsBox>

                    <div>
                        <SectionLabel>Treść wiadomości</SectionLabel>
                        <FieldGroup $focused={fieldFocused}>
                            <Textarea
                                value={displayed}
                                placeholder="Wpisz treść SMS-a…"
                                onChange={e => handleChange(e.target.value)}
                                onFocus={() => setFieldFocused(true)}
                                onBlur={() => setFieldFocused(false)}
                                autoFocus
                            />
                            {suffix && (
                                <LockedSuffix title="Tej frazy nie można edytować — dopisujemy ją zawsze na końcu">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <LockedSuffixText>{suffix}</LockedSuffixText>
                                </LockedSuffix>
                            )}
                        </FieldGroup>
                    </div>

                    <ToggleRow>
                        <ToggleTexts>
                            <ToggleTitle>Polskie znaki</ToggleTitle>
                            <ToggleHint>
                                {usePolish
                                    ? 'Wiadomość idzie w UCS-2 — 70 znaków na SMS'
                                    : 'Taniej: 160 znaków na SMS zamiast 70'}
                            </ToggleHint>
                        </ToggleTexts>
                        <HiddenCheckbox
                            type="checkbox"
                            checked={usePolish}
                            onChange={e => setUsePolish(e.target.checked)}
                        />
                        <Switch $on={usePolish} aria-hidden="true" />
                    </ToggleRow>

                    <HintRow>
                        <span>
                            {suffix
                                ? 'Fraza z prośbą o odpowiedź jest doklejana automatycznie.'
                                : 'Klient nie musi potwierdzać — SMS jest informacyjny.'}
                        </span>
                        <Counter $warn={segments > 2}>
                            <span>{fullLength} znaków</span>
                            <span>{segments} {smsWord(segments)}</span>
                        </Counter>
                    </HintRow>
                </Body>

                <Footer>
                    <CancelBtn type="button" onClick={onCancel} disabled={isSaving}>Anuluj</CancelBtn>
                    <SendBtn type="button" onClick={() => onConfirm(trimmed, usePolish)} disabled={!canSend}>
                        {isSaving ? 'Zapisywanie…' : 'Wyślij i zapisz'}
                    </SendBtn>
                </Footer>
            </Card>
        </Overlay>
    );
};
