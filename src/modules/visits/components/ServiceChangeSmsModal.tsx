// src/modules/visits/components/ServiceChangeSmsModal.tsx
//
// Modal potwierdzenia wysyłki SMS-a o zmianach w usługach.
//
// Po otwarciu odpytuje backend o propozycję treści (LLM podsumowuje co zostało
// dodane, usunięte, przecenione i jaka jest nowa cena końcowa brutto). Treść jest
// w pełni edytowalna, ale fraza z prośbą o odpowiedź "TAK" jest doklejana przy
// wysyłce po stronie serwera i użytkownik nie może jej zmienić ani usunąć.

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { formatCurrency } from '@/common/utils';
import type { ServicesChangesPayload } from '../types';
import { useServiceChangeSmsDraft } from '../hooks';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

/** Domyślna fraza, gdy backend nie zdążył jej podać (np. draft się nie wczytał). */
const DEFAULT_SUFFIX = 'Odpisz TAK aby zaakceptować.';

/* Polskie znaki wymuszają kodowanie UCS-2: 70 znaków w jednym SMS-ie,
   67 w każdej części wiadomości dzielonej. */
const SINGLE_SEGMENT = 70;
const MULTI_SEGMENT = 67;

/** Polska odmiana: 1 SMS, 2-4 SMS-y, 5+ SMS-ów. */
const smsWord = (count: number) => {
    if (count === 1) return 'SMS';
    const last = count % 10;
    const lastTwo = count % 100;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'SMS-y' : 'SMS-ów';
};

const segmentsFor = (length: number) =>
    length === 0 ? 1 : length <= SINGLE_SEGMENT ? 1 : Math.ceil(length / MULTI_SEGMENT);

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

const Textarea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    min-height: 110px;
    resize: vertical;
    padding: 10px 12px;
    border: 1.5px solid ${st.border};
    border-radius: 10px 10px 0 0;
    border-bottom: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus { border-color: ${BRAND}; }
    &::placeholder { color: ${st.textMuted}; }
    &:disabled { background: ${st.bg}; color: ${st.textMuted}; }
`;

const LockedSuffix = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1.5px solid ${st.border};
    border-radius: 0 0 10px 10px;
    background: ${st.bg};
    font-size: 14px;
    line-height: 1.5;
    color: ${st.textSecondary};

    svg { width: 13px; height: 13px; flex-shrink: 0; color: ${st.textMuted}; }
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

const Notice = styled.div<{ $variant?: 'info' | 'warn' }>`
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.45;
    color: ${p => p.$variant === 'warn' ? '#92400e' : st.textSecondary};
    background: ${p => p.$variant === 'warn' ? st.bgAccentAmber : st.bg};
    border: 1px solid ${p => p.$variant === 'warn' ? 'rgba(245, 158, 11, 0.35)' : st.border};
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

const Spinner = styled.span`
    display: inline-block;
    width: 13px;
    height: 13px;
    margin-right: 7px;
    vertical-align: -2px;
    border: 2px solid rgba(14, 165, 233, 0.25);
    border-top-color: ${BRAND};
    border-radius: 50%;
    animation: sms-spin 700ms linear infinite;

    @keyframes sms-spin { to { transform: rotate(360deg); } }
`;

interface Props {
    visitId: string;
    /** Payload zmian — na jego podstawie backend liczy ceny i redaguje treść. */
    payload: ServicesChangesPayload;
    /** true = klient ma potwierdzić zmiany odpowiedzią SMS. */
    requireConfirmation: boolean;
    isSaving: boolean;
    onCancel: () => void;
    onConfirm: (smsMessage: string) => void;
}

export const ServiceChangeSmsModal = ({
    visitId,
    payload,
    requireConfirmation,
    isSaving,
    onCancel,
    onConfirm,
}: Props) => {
    const { requestDraft, draft, isDrafting, isDraftError } = useServiceChangeSmsDraft(visitId);
    const [message, setMessage] = useState('');
    const [touched, setTouched] = useState(false);

    // Jedno odpytanie na otwarcie modala; payload jest zamrożony przez rodzica.
    useEffect(() => {
        requestDraft(payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Propozycja z serwera wchodzi do pola tylko dopóki użytkownik go nie tknął.
    useEffect(() => {
        if (draft && !touched) setMessage(draft.message);
    }, [draft, touched]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSaving) onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel, isSaving]);

    const suffix = draft?.fixedSuffix || DEFAULT_SUFFIX;
    const trimmed = message.trim();
    const fullLength = (trimmed ? trimmed.length + 1 : 0) + suffix.length;
    const segments = segmentsFor(fullLength);
    const canSend = trimmed.length > 0 && !isDrafting && !isSaving;

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
                    {draft && (
                        <TotalsBox>
                            <span>Cena końcowa brutto</span>
                            {draft.totalGrossBefore !== draft.totalGrossAfter && (
                                <>
                                    <TotalsOld>{formatCurrency(draft.totalGrossBefore / 100)}</TotalsOld>
                                    <span style={{ color: BRAND }}>→</span>
                                </>
                            )}
                            <TotalsNew>{formatCurrency(draft.totalGrossAfter / 100)}</TotalsNew>
                        </TotalsBox>
                    )}

                    {isDraftError && (
                        <Notice $variant="warn">
                            Nie udało się przygotować propozycji treści. Wpisz wiadomość samodzielnie —
                            zmiany zapiszą się normalnie.
                        </Notice>
                    )}
                    {draft && !draft.aiGenerated && !isDraftError && (
                        <Notice $variant="warn">
                            Propozycja pochodzi z szablonu — asystent nie odpowiedział. Sprawdź treść przed wysyłką.
                        </Notice>
                    )}

                    <div>
                        <SectionLabel>Treść wiadomości</SectionLabel>
                        <Textarea
                            value={message}
                            placeholder={isDrafting ? 'Przygotowuję podsumowanie zmian…' : 'Wpisz treść SMS-a…'}
                            disabled={isDrafting}
                            onChange={e => { setTouched(true); setMessage(e.target.value); }}
                            autoFocus
                        />
                        <LockedSuffix title="Tej frazy nie można edytować — dopisujemy ją zawsze na końcu">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            {suffix}
                        </LockedSuffix>
                    </div>

                    <HintRow>
                        <span>Fraza z prośbą o odpowiedź jest doklejana automatycznie.</span>
                        <Counter $warn={segments > 2}>
                            <span>{fullLength} znaków</span>
                            <span>{segments} {smsWord(segments)}</span>
                        </Counter>
                    </HintRow>
                </Body>

                <Footer>
                    <CancelBtn type="button" onClick={onCancel} disabled={isSaving}>Anuluj</CancelBtn>
                    <SendBtn type="button" onClick={() => onConfirm(trimmed)} disabled={!canSend}>
                        {isSaving && <Spinner />}
                        {isSaving ? 'Zapisywanie…' : 'Wyślij i zapisz'}
                    </SendBtn>
                </Footer>
            </Card>
        </Overlay>
    );
};
