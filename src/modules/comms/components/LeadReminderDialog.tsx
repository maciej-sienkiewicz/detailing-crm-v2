// src/modules/comms/components/LeadReminderDialog.tsx
// „Przypomnij się" - z kolumny „Wymaga przypomnienia" (zbiorczo) albo z podglądu sprawy.
//
// Trzy kroki w jednym oknie:
//   1. komu - sprawy z kolumny, zaznaczone wszystkie, które da się przypomnieć mailem
//      (z jednej sprawy ten krok odpada),
//   2. co - asystent AI pisze osobne przypomnienie dla każdej sprawy na podstawie jej
//      rozmowy; każde można poprawić albo odznaczyć,
//   3. wysyłka - po kolei, każda w rozmowie klienta, z Twojej skrzynki i z Twoją stopką.
//
// Nic nie wychodzi bez kliknięcia „Wyślij": szkic AI czyta i zatwierdza człowiek. Szkic ze
// znacznikiem do uzupełnienia („[proponowany termin]") nie pójdzie, dopóki ktoś go nie
// wypełni - wysłany klientowi wyglądałby jak szablon, którym jest.
import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { AlertTriangle, BellRing, Check, RefreshCw } from 'lucide-react';
import { ModalContent, ModalFooter, ModalHeader, ModalShell, ModalSubtitle, ModalTitle, ModalTitleGroup, CloseBtn } from '@/common/components/ModalKit';
import { Button } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { commsApi } from '../api/commsApi';
import { useMailSignature } from '../hooks/useComms';
import { useSendLeadReminder, useStagnationThresholds } from '../hooks/useLeads';
import { useReplyDraftPreferences } from '../hooks/useReplyDraft';
import type { Lead } from '../types';
import { normalizeComposerHtml, textToComposerHtml } from '../utils/composerHtml';
import { canRemindByMail, silenceOf } from '../utils/leadBoard';
import { describeLeadUrgency } from '../utils/leadUrgency';
import { caseTitle, rowAge } from '../inbox/caseModel';
import { ix } from '../inbox/tokens';

/**
 * Uwagi dla asystenta. Prompt sam pisze przypomnienie, gdy ostatnie słowo należy do studia -
 * ale sprawa bywa w „Wymaga przypomnienia" z przeciągnięcia, a wtedy ostatnia wiadomość
 * może być klienta. Uwagi mówią to wprost w każdym przypadku.
 */
const REMINDER_INSTRUCTIONS =
    'To ma być przypomnienie: klient nie odpowiedział na naszą ostatnią wiadomość. ' +
    'Napisz krótko i uprzejmie, nawiąż do tego, co ostatnio zaproponowaliśmy, i ułatwij klientowi odpowiedź. ' +
    'Bez nacisku i bez nowych informacji, których nie ma w rozmowie.';

/** Ilu szkiców naraz prosimy asystenta - więcej nie przyspiesza, a potrafi trafić w limit. */
const DRAFT_CONCURRENCY = 3;
const PLACEHOLDER = /\[[^\]\n]{1,80}\]/g;

type Row =
    | { phase: 'drafting' }
    | { phase: 'ready'; text: string }
    | { phase: 'draftError'; message: string }
    | { phase: 'sending'; text: string }
    | { phase: 'sent' }
    | { phase: 'sendError'; text: string; message: string };

const messageOf = (error: unknown, fallback: string): string =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const remindersWord = (n: number) => pluralPl(n, 'przypomnienie', 'przypomnienia', 'przypomnień');

const shimmer = keyframes`
    from { background-position: -320px 0; }
    to { background-position: 320px 0; }
`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Item = styled.li<{ $muted?: boolean }>`
    border: 1px solid ${ix.line};
    border-radius: 14px;
    background: #ffffff;
    padding: 12px 14px;
    ${p => p.$muted && css`opacity: 0.55;`}

    header { display: flex; align-items: center; gap: 10px; }
    input[type='checkbox'] { flex: none; width: 16px; height: 16px; margin: 0; accent-color: ${ix.accentInk}; }
    .titles { flex: 1; min-width: 0; }
    .name { margin: 0; font-size: 14px; font-weight: 700; color: ${ix.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 2px 0 0; font-size: 12.5px; color: ${ix.muted}; }
    .why { color: ${ix.late}; }
`;

const StatusTag = styled.span<{ $tone: 'neutral' | 'ok' | 'warn' | 'bad' }>`
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    svg { width: 12px; height: 12px; }
    ${p => ({
        neutral: css`background: ${ix.surfaceAlt}; color: ${ix.inkSoft};`,
        ok: css`background: ${ix.okTint}; color: ${ix.ok};`,
        warn: css`background: #fef6e4; color: #b45309;`,
        bad: css`background: #fef2f2; color: ${ix.late};`,
    })[p.$tone]}
`;

const Draft = styled.textarea`
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 140px;
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid ${ix.line};
    border-radius: 10px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: ${ix.ink};
    resize: vertical;
    &:focus { outline: none; border-color: ${ix.accentLine}; box-shadow: 0 0 0 3px ${ix.accentTint}; }
    &:disabled { background: ${ix.surfaceSoft}; color: ${ix.text2}; }
`;

const Writing = styled.div`
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    span {
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(90deg, ${ix.surfaceAlt} 0%, #ffffff 50%, ${ix.surfaceAlt} 100%);
        background-size: 640px 100%;
        animation: ${shimmer} 1.3s linear infinite;
        @media (prefers-reduced-motion: reduce) { animation: none; }
    }
    p { margin: 2px 0 0; font-size: 12.5px; color: ${ix.muted}; }
`;

const Note = styled.p<{ $tone?: 'warn' | 'bad' }>`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 8px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => (p.$tone === 'bad' ? ix.late : p.$tone === 'warn' ? '#b45309' : ix.muted)};
    svg { flex: none; width: 14px; height: 14px; margin-top: 1px; }
    button {
        margin-left: auto;
        border: none;
        background: none;
        padding: 0;
        font: inherit;
        font-weight: 600;
        color: ${ix.accentInk};
        cursor: pointer;
    }
`;

const Intro = styled.p`
    margin: 0 0 12px;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ix.text2};
`;

const SignatureToggle = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-right: auto;
    font-size: 13px;
    color: ${ix.text2};
    cursor: pointer;
    input { width: 16px; height: 16px; margin: 0; accent-color: ${ix.accentInk}; }
`;

interface LeadReminderDialogProps {
    /** Sprawy do przypomnienia; jedna - okno zaczyna od razu od szkicu. */
    leads: Lead[];
    onClose: () => void;
    /** Okno otwarte z innego okna (podgląd sprawy) - SUBMODAL_Z_INDEX. */
    zIndex?: number;
}

export function LeadReminderDialog({ leads, onClose, zIndex }: LeadReminderDialogProps) {
    const thresholds = useStagnationThresholds();
    const { data: signature } = useMailSignature();
    const { data: preferences } = useReplyDraftPreferences();
    const sendReminder = useSendLeadReminder();
    const alive = useRef(true);
    useEffect(() => () => { alive.current = false; }, []);

    const single = leads.length === 1;
    const remindable = useMemo(() => leads.filter(canRemindByMail), [leads]);
    const [step, setStep] = useState<'select' | 'review' | 'done'>(single ? 'review' : 'select');
    const [selected, setSelected] = useState<Set<string>>(() => new Set(remindable.map((lead) => lead.id)));
    const [rows, setRows] = useState<Record<string, Row>>({});
    const [signatureChoice, setSignatureChoice] = useState<boolean | null>(null);
    const hasSignature = Boolean(signature?.bodyHtml);
    const appendSignature = hasSignature && (signatureChoice ?? signature?.enabledByDefault ?? false);

    const setRow = (id: string, row: Row) => {
        if (alive.current) setRows((prev) => ({ ...prev, [id]: row }));
    };

    const draftOne = async (lead: Lead) => {
        setRow(lead.id, { phase: 'drafting' });
        try {
            const draft = await commsApi.draftReply(lead.threadId!, {
                useSentStyle: preferences?.useSentStyle ?? false,
                signatureAppended: appendSignature,
                instructions: REMINDER_INSTRUCTIONS,
            });
            setRow(lead.id, { phase: 'ready', text: draft.bodyText });
        } catch (error) {
            setRow(lead.id, { phase: 'draftError', message: messageOf(error, 'Asystent nie przygotował szkicu. Spróbuj ponownie.') });
        }
    };

    const draftAll = async (targets: Lead[]) => {
        const queue = [...targets];
        const worker = async () => {
            for (let lead = queue.shift(); lead && alive.current; lead = queue.shift()) await draftOne(lead);
        };
        await Promise.all(Array.from({ length: Math.min(DRAFT_CONCURRENCY, queue.length) }, worker));
    };

    // Jedna sprawa - szkic od razu po otwarciu, bez kroku „komu".
    const started = useRef(false);
    useEffect(() => {
        if (!single || started.current || remindable.length === 0 || preferences === undefined || signature === undefined) return;
        started.current = true;
        void draftAll(remindable);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [single, remindable, preferences, signature]);

    const chosen = remindable.filter((lead) => selected.has(lead.id));
    const toggle = (id: string) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const placeholdersOf = (text: string) => text.match(PLACEHOLDER) ?? [];
    const ready = chosen.filter((lead) => {
        const row = rows[lead.id];
        return row && (row.phase === 'ready' || row.phase === 'sendError') && row.text.trim() && placeholdersOf(row.text).length === 0;
    });
    const drafting = chosen.filter((lead) => rows[lead.id]?.phase === 'drafting').length;
    const sending = Object.values(rows).some((row) => row.phase === 'sending');
    const sentCount = Object.values(rows).filter((row) => row.phase === 'sent').length;

    const sendAll = async () => {
        for (const lead of ready) {
            if (!alive.current) return;
            const row = rows[lead.id] as { text: string };
            setRow(lead.id, { phase: 'sending', text: row.text });
            try {
                await sendReminder.mutateAsync({
                    leadId: lead.id,
                    bodyHtml: normalizeComposerHtml(textToComposerHtml(row.text.trim())),
                    appendSignature,
                });
                setRow(lead.id, { phase: 'sent' });
            } catch (error) {
                setRow(lead.id, { phase: 'sendError', text: row.text, message: messageOf(error, 'Nie udało się wysłać') });
            }
        }
        if (alive.current) setStep('done');
    };

    const silenceText = (lead: Lead) => {
        const silence = silenceOf(lead, describeLeadUrgency(lead, thresholds), Date.now());
        return silence ? `Cisza od ${rowAge(silence.ms)}` : null;
    };
    const whyNot = (lead: Lead) =>
        lead.source === 'INSTAGRAM' ? 'Instagram - przypomnij się w aplikacji' : 'Bez rozmowy mailowej - zadzwoń';

    const failed = chosen.filter((lead) => rows[lead.id]?.phase === 'sendError');

    // ── Treść kroków ──────────────────────────────────────────────────────────
    let body: React.ReactNode;
    if (step === 'select') {
        body = (
            <>
                <Intro>
                    Asystent napisze osobne przypomnienie dla każdej zaznaczonej sprawy, na podstawie jej rozmowy.
                    Przeczytasz je i poprawisz, zanim cokolwiek wyjdzie.
                </Intro>
                <List>
                    {leads.map((lead) => {
                        const possible = canRemindByMail(lead);
                        const silence = silenceText(lead);
                        return (
                            <Item key={lead.id} $muted={!possible}>
                                <header>
                                    <input
                                        type="checkbox"
                                        checked={possible && selected.has(lead.id)}
                                        disabled={!possible}
                                        aria-label={`Przypomnij: ${caseTitle(lead)}`}
                                        onChange={() => toggle(lead.id)}
                                    />
                                    <div className="titles">
                                        <p className="name">{caseTitle(lead)}</p>
                                        <p className="meta">
                                            {lead.vehicleBrand && lead.customerName && <span>{lead.customerName}</span>}
                                            {silence && <span>{silence}</span>}
                                            {!possible && <span className="why">{whyNot(lead)}</span>}
                                        </p>
                                    </div>
                                </header>
                            </Item>
                        );
                    })}
                </List>
            </>
        );
    } else {
        const shownLeads = step === 'done' ? chosen.filter((lead) => rows[lead.id]) : chosen;
        body = (
            <>
                {step === 'done' ? (
                    <Intro>
                        {sentCount > 0 ? `Wysłano ${sentCount} ${remindersWord(sentCount)}. ` : ''}
                        {failed.length > 0
                            ? `${failed.length} ${pluralPl(failed.length, 'nie wyszło', 'nie wyszły', 'nie wyszło')} - powód przy sprawie.`
                            : 'Karty wróciły do „Odpowiedzieliśmy" z plakietką przypomnienia.'}
                    </Intro>
                ) : single && remindable.length === 0 ? (
                    <Intro>{whyNot(leads[0])}. Przypomnienie mailem nie jest tu możliwe.</Intro>
                ) : (
                    <Intro>
                        {single
                            ? 'Przeczytaj i popraw, jeśli trzeba - wyjdzie w rozmowie z klientem.'
                            : 'Przeczytaj i popraw, jeśli trzeba. Odznaczone sprawy zostaną w „Wymaga przypomnienia”.'}
                    </Intro>
                )}
                <List>
                    {shownLeads.map((lead) => {
                        const row = rows[lead.id];
                        const text = row && 'text' in row ? row.text : '';
                        const missing = text ? placeholdersOf(text) : [];
                        const included = selected.has(lead.id);
                        return (
                            <Item key={lead.id} $muted={!included && step !== 'done'}>
                                <header>
                                    {!single && step !== 'done' && (
                                        <input
                                            type="checkbox"
                                            checked={included}
                                            disabled={sending}
                                            aria-label={`Wyślij przypomnienie: ${caseTitle(lead)}`}
                                            onChange={() => toggle(lead.id)}
                                        />
                                    )}
                                    <div className="titles">
                                        <p className="name">{caseTitle(lead)}</p>
                                        <p className="meta">
                                            {lead.vehicleBrand && lead.customerName && <span>{lead.customerName}</span>}
                                            {step !== 'done' && silenceText(lead) && <span>{silenceText(lead)}</span>}
                                        </p>
                                    </div>
                                    {row?.phase === 'sent' && <StatusTag $tone="ok"><Check aria-hidden="true" /> Wysłano</StatusTag>}
                                    {row?.phase === 'sending' && <StatusTag $tone="neutral">Wysyłanie…</StatusTag>}
                                    {row?.phase === 'sendError' && <StatusTag $tone="bad">Nie wysłano</StatusTag>}
                                    {missing.length > 0 && row?.phase === 'ready' && <StatusTag $tone="warn">Do uzupełnienia</StatusTag>}
                                </header>
                                {row?.phase === 'drafting' && (
                                    <Writing aria-live="polite">
                                        <span style={{ width: '92%' }} />
                                        <span style={{ width: '78%' }} />
                                        <span style={{ width: '64%' }} />
                                        <p>Asystent pisze przypomnienie na podstawie rozmowy…</p>
                                    </Writing>
                                )}
                                {row?.phase === 'draftError' && (
                                    <Note $tone="bad">
                                        <AlertTriangle aria-hidden="true" /> {row.message}
                                        <button type="button" onClick={() => void draftOne(lead)}><RefreshCw size={12} /> Spróbuj ponownie</button>
                                    </Note>
                                )}
                                {row && (row.phase === 'ready' || row.phase === 'sending' || row.phase === 'sendError') && step !== 'done' && (
                                    <Draft
                                        value={row.text}
                                        disabled={row.phase === 'sending' || !included}
                                        aria-label={`Treść przypomnienia: ${caseTitle(lead)}`}
                                        onChange={(event) => setRow(lead.id, { ...row, text: event.target.value } as Row)}
                                    />
                                )}
                                {missing.length > 0 && row?.phase === 'ready' && (
                                    <Note $tone="warn">
                                        <AlertTriangle aria-hidden="true" />
                                        Uzupełnij {missing.join(', ')} - inaczej przypomnienie nie wyjdzie.
                                    </Note>
                                )}
                                {row?.phase === 'sendError' && (
                                    <Note $tone="bad"><AlertTriangle aria-hidden="true" /> {row.message}</Note>
                                )}
                            </Item>
                        );
                    })}
                </List>
            </>
        );
    }

    // ── Stopka: jeden wypełniony przycisk - krok następny (CLAUDE.md §2) ─────
    let primary: React.ReactNode;
    if (step === 'select') {
        primary = (
            <Button variant="primary" disabled={chosen.length === 0 || preferences === undefined} onClick={() => { setStep('review'); void draftAll(chosen); }}>
                <BellRing aria-hidden="true" /> Przygotuj {chosen.length} {remindersWord(chosen.length)}
            </Button>
        );
    } else if (step === 'review') {
        primary = (
            <Button variant="primary" disabled={drafting > 0 || sending || ready.length === 0} onClick={() => void sendAll()}>
                {sending
                    ? `Wysyłanie… (${sentCount + 1} z ${ready.length + sentCount})`
                    : drafting > 0
                      ? `Asystent pisze… (${chosen.length - drafting} z ${chosen.length})`
                      : single ? 'Wyślij przypomnienie' : `Wyślij ${ready.length} ${remindersWord(ready.length)}`}
            </Button>
        );
    } else {
        primary = <Button variant="primary" onClick={onClose}>Gotowe</Button>;
    }

    return (
        <ModalShell isOpen onClose={onClose} size="lg" stableHeight dismissible={!sending} zIndex={zIndex} labelledBy="lead-reminder-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="lead-reminder-title">Przypomnij się</ModalTitle>
                    <ModalSubtitle>
                        {single ? caseTitle(leads[0]) : `${leads.length} ${pluralPl(leads.length, 'sprawa czeka', 'sprawy czekają', 'spraw czeka')} na przypomnienie`}
                    </ModalSubtitle>
                </ModalTitleGroup>
                {!sending && <CloseBtn onClick={onClose} />}
            </ModalHeader>
            <ModalContent>{body}</ModalContent>
            <ModalFooter>
                {hasSignature && step !== 'done' && (
                    <SignatureToggle>
                        <input
                            type="checkbox"
                            checked={appendSignature}
                            disabled={sending}
                            onChange={(event) => setSignatureChoice(event.target.checked)}
                        />
                        Dodaj moją stopkę
                    </SignatureToggle>
                )}
                {step !== 'done' && <Button variant="ghost" disabled={sending} onClick={onClose}>Anuluj</Button>}
                {primary}
            </ModalFooter>
        </ModalShell>
    );
}
