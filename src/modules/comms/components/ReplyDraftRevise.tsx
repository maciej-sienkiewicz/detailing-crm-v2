// src/modules/comms/components/ReplyDraftRevise.tsx
// „Popraw" pod szkicem AI: pracownik pisze, co zmienić, a asystent poprawia to, co jest
// TERAZ w edytorze - razem z ręcznymi zmianami, które zdążył wprowadzić. Styl (flaga
// useSentStyle) zostaje ten sam co przy szkicu, żeby poprawka nie zmieniała tonu po cichu.
//
// Szybkie podpowiedzi dopisują gotowe polecenie do pola, ale nie wysyłają go same -
// „krócej" zwykle idzie w parze z czymś jeszcze („krócej i zaproponuj wtorek").
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import styled from 'styled-components';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { useDraftReply } from '../hooks/useReplyDraft';
import type { ReplyDraft } from '../types';
import { MAX_DRAFT_INSTRUCTIONS } from '../utils/replyDraft';
import { problemDetail } from '@/core/problem';
import { useCapabilityGate } from '@/modules/subscription/hooks/useCapabilityGate';

const QUICK_INSTRUCTIONS = ['Krócej', 'Bardziej formalnie', 'Cieplej w tonie', 'Zaproponuj oględziny auta'];

const Toggle = styled.button<{ $plain?: boolean }>`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${p => (p.$plain ? '13px' : '12.5px')};
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => (p.$plain ? '#0e6fa0' : p.theme.colors.primary)};
    cursor: pointer;

    &:hover { text-decoration: underline; }
    &:disabled { opacity: 0.55; cursor: default; text-decoration: none; }
`;

/**
 * Bez własnego pudełka (display: contents): odnośnik i okno są wprost elementami
 * rzędu notki o szkicu, który się zawija. Odnośnik stoi w pierwszym wierszu, okno
 * zawija się pod spodem na całą szerokość (order + flex-basis 100%).
 */
const Anchor = styled.span`
    display: contents;
`;

/*
 * Okno poprawki W TREŚCI, między notką a edytorem - nie dymek. Dymek nad odnośnikiem
 * zasłaniał rozmowę i nagłówek sprawy, a na telefonie (pełnoekranowy edytor, nad
 * notką tylko pasek „Wróć") wychodził poza górną krawędź ekranu razem z polem do
 * pisania. Jeszcze wcześniej formularz stał w wąskiej kolumnie obok notki i zgniatał
 * jej tekst. Edytora pod spodem nie zasłania - przesuwa go niżej.
 */
const Form = styled.div`
    order: 10;
    flex: 1 0 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 2px;
    padding: 12px 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    background: #f8fafc;
    text-align: left;

    .title { margin: 0; font-size: 13px; font-weight: ${p => p.theme.fontWeights.semibold}; color: ${p => p.theme.colors.text}; }

    textarea {
        width: 100%;
        min-height: 56px;
        resize: vertical;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.45;
        color: ${p => p.theme.colors.text};
        background: #ffffff;
        outline: none;
        box-sizing: border-box;

        &::placeholder { color: ${p => p.theme.colors.textMuted}; }
        &:focus { border-color: ${p => p.theme.colors.primary}; }
        &:disabled { opacity: 0.6; }
    }
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const Chip = styled.button`
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 3px 10px;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;

    &:hover:not(:disabled) { border-color: ${p => p.theme.colors.textMuted}; color: ${p => p.theme.colors.text}; }
    &:disabled { opacity: 0.55; cursor: default; }
`;

const FormActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
`;

/** Tło i obwódka marki zamiast wypełnienia - jedynym wypełnionym przyciskiem kompozytora jest „Wyślij". */
const SubmitButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.primary};
    background: #f0f6f9;
    color: ${p => p.theme.colors.primary};
    border-radius: ${p => p.theme.radii.full};
    padding: 5px 12px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;

    &:disabled { opacity: 0.55; cursor: default; }

    .spin { animation: reviseSpin 900ms linear infinite; }
    @keyframes reviseSpin { to { transform: rotate(360deg); } }
`;

const CancelButton = styled.button`
    border: none;
    background: none;
    padding: 5px 4px;
    font-family: inherit;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;

    &:hover:not(:disabled) { color: ${p => p.theme.colors.textSecondary}; }
    &:disabled { opacity: 0.55; cursor: default; }
`;

interface ReplyDraftReviseProps {
    threadId: string;
    /** Szkic, który poprawiamy - z niego bierzemy tryb stylu. */
    draft: ReplyDraft;
    /** Bieżąca treść edytora jako czysty tekst - z ręcznymi zmianami pracownika. */
    currentText: string;
    signatureAppended: boolean;
    disabled?: boolean;
    onDraft: (draft: ReplyDraft) => void;
    /**
     * Podpis odnośnika otwierającego poprawkę. Skrzynka „Zapytania" mówi „Napisz
     * inaczej" (makieta) - wtedy bez ikony, jak zwykły odnośnik w linii szkicu.
     */
    label?: string;
}

export function ReplyDraftRevise({ threadId, draft, currentText, signatureAppended, disabled, onDraft, label }: ReplyDraftReviseProps) {
    const [open, setOpen] = useState(false);
    const [instructions, setInstructions] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const draftReply = useDraftReply();
    const aiGate = useCapabilityGate('AI_LEAD_ASSIST');
    const { showError } = useToast();
    const busy = draftReply.isPending;
    const trimmed = instructions.trim();
    const canSubmit = !busy && !disabled && trimmed.length > 0 && currentText.trim().length > 0;

    const close = () => {
        setOpen(false);
        setInstructions('');
    };

    // Klik obok zamyka puste okno. Z wpisanymi uwagami zostaje: okno stoi nad edytorem
    // i klik w treść szkicu („jeszcze tu poprawię") nie może zgubić tego, co napisano.
    const anchorRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (!open || busy || trimmed) return;
        const onDown = (event: MouseEvent) => {
            if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
                setOpen(false);
                setInstructions('');
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open, busy, trimmed]);

    const submit = () => {
        if (!canSubmit) return;
        draftReply.mutate(
            {
                threadId,
                useSentStyle: draft.useSentStyle,
                signatureAppended,
                currentDraft: currentText,
                instructions: trimmed,
                offer: draft.offer,
            },
            {
                onSuccess: (revised) => {
                    close();
                    onDraft(draft.offer ? { ...revised, offer: draft.offer } : revised);
                },
                onError: (error) => {
                    const message =
                        problemDetail(error);
                    showError('Nie udało się poprawić szkicu', message ?? 'Spróbuj ponownie za chwilę');
                },
            }
        );
    };

    const addQuick = (text: string) => {
        setInstructions((current) => {
            const base = current.trim();
            if (!base) return text;
            return `${base.replace(/[.,;\s]+$/, '')}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
        });
        textareaRef.current?.focus();
    };

    // Enter wysyła, Shift+Enter łamie wiersz - tak jak w polu czatu; Escape zwija bez zmian.
    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    };

    return (
        <Anchor ref={anchorRef}>
            {aiGate.upsell}
            <Toggle
                type="button"
                onClick={() => (open ? close() : aiGate.run(() => setOpen(true)))}
                disabled={disabled}
                $plain={Boolean(label)}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                {label ?? <><Wand2 size={13} /> Popraw szkic</>}
            </Toggle>
            {open && (
        <Form role="dialog" aria-label="Poprawka szkicu">
            <p className="title">Co zmienić w szkicu?</p>
            <textarea
                ref={textareaRef}
                autoFocus
                aria-label="Co poprawić w szkicu"
                placeholder="Np. krócej, zaproponuj wtorek o 10:00, zapytaj o rocznik auta"
                value={instructions}
                maxLength={MAX_DRAFT_INSTRUCTIONS}
                onChange={(event) => setInstructions(event.target.value)}
                onKeyDown={onKeyDown}
                disabled={busy}
            />
            <Chips aria-label="Szybkie poprawki">
                {QUICK_INSTRUCTIONS.map((text) => (
                    <Chip key={text} type="button" onClick={() => addQuick(text)} disabled={busy}>
                        {text}
                    </Chip>
                ))}
            </Chips>
            <FormActions>
                <CancelButton type="button" onClick={close} disabled={busy}>
                    Anuluj
                </CancelButton>
                <SubmitButton type="button" onClick={submit} disabled={!canSubmit}>
                    {busy
                        ? <><Loader2 size={13} className="spin" /> Poprawiam…</>
                        : <><Wand2 size={13} /> Popraw szkic</>}
                </SubmitButton>
            </FormActions>
        </Form>
            )}
        </Anchor>
    );
}
