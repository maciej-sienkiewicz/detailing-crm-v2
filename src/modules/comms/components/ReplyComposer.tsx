// src/modules/comms/components/ReplyComposer.tsx
// Odpowiedź w wątku lub nowa wiadomość.
//
// Treść pisze się w uproszczonym edytorze (RichTextEditor): pogrubienie, kursywa,
// podkreślenie, listy, odnośniki. HTML z edytora jest sprowadzany do ustalonego
// dialektu (normalizeComposerHtml) przed wysyłką i przed korektą - backend i tak
// sanityzuje, ale ma dostać coś już czystego.
//
// Załączniki: spinacz w pasku edytora, upuszczenie pliku na kompozytor albo
// wklejenie. Limity są sprawdzane tu, zanim plik poleci na serwer (OUTGOING_ATTACHMENT_LIMITS
// to lustro OutgoingAttachmentPolicy z backendu) - błąd o 15 MB ma się pojawić w chwili
// wyboru pliku, a nie po minucie wysyłania.
//
// Szkic AI (tylko w wątku): asystent pisze projekt odpowiedzi, który zastępuje treść
// edytora - z „Cofnij", jak po korekcie. Znaczniki do uzupełnienia („[proponowany
// termin]") blokują wysyłkę, dopóki stoją w treści: klient nie może dostać nawiasu.
//
// Odpowiadając w wątku nie powtarzamy adresu odbiorcy: rozmowa ma jednego
// uczestnika, wypisanego już w nagłówku i w panelu klienta. Pole „Do" jest
// schowane pod dyskretnym przełącznikiem - na wypadek, gdy ktoś chce je sprawdzić.
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import styled from 'styled-components';
import {
    AtSign,
    FileImage,
    FileText,
    File as FileIcon,
    Loader2,
    Paperclip,
    PenLine,
    Send,
    Settings2,
    Sparkles,
    SpellCheck,
    Undo2,
    X,
} from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { useMailSignature, useProofread, useSendMail } from '../hooks/useComms';
import { OUTGOING_ATTACHMENT_LIMITS, type ReplyDraft } from '../types';
import {
    composerHtmlToText,
    isComposerHtmlEmpty,
    normalizeComposerHtml,
    textToComposerHtml,
} from '../utils/composerHtml';
import { draftOriginLabel, pendingPlaceholders as findPendingPlaceholders } from '../utils/replyDraft';
import { ReplyDraftButton } from './ReplyDraftButton';
import { RichTextEditor } from './RichTextEditor';
import { SignatureSettingsModal } from './SignatureSettingsModal';
import { PrimaryButton } from './shared';

const Composer = styled.div<{ $dragging: boolean }>`
    position: relative;
    border-top: 1px solid #e5e7eb;
    background: #ffffff;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    /* Cały kompozytor jest strefą zrzutu - nie trzeba celować w edytor. */
    ${({ $dragging, theme }) =>
        $dragging &&
        `
        &::after {
            content: 'Upuść, żeby dołączyć plik';
            position: absolute;
            inset: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed ${theme.colors.primary};
            border-radius: ${theme.radii.md};
            background: rgba(255, 255, 255, 0.92);
            color: ${theme.colors.primary};
            font-size: 14px;
            font-weight: ${theme.fontWeights.medium};
            pointer-events: none;
            z-index: 1;
        }
    `}
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6b7280;

    input {
        flex: 1;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        outline: none;
        font-family: inherit;

        &:focus { border-color: #9ca3af; }
    }
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

const LeftActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

/**
 * Przełącznik stopki. Stan „włączony/wyłączony" musi być widoczny bez klikania -
 * decyzja o tym, co dokleimy do cudzej skrzynki, nie może wymagać sprawdzania.
 */
const SignatureToggle = styled.button<{ $on: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.border)};
    background: ${({ $on, theme }) => ($on ? '#f0f9ff' : theme.colors.surface)};
    color: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.full};
    padding: 6px 12px 6px 8px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.primary}; }

    .track {
        position: relative;
        width: 26px;
        height: 15px;
        flex-shrink: 0;
        border-radius: 999px;
        background: ${({ $on, theme }) => ($on ? theme.colors.primary : '#cbd5e1')};
        transition: background ${p => p.theme.transitions.fast};
    }
    .knob {
        position: absolute;
        top: 2px;
        left: ${({ $on }) => ($on ? '13px' : '2px')};
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: #ffffff;
        transition: left ${p => p.theme.transitions.fast};
    }
`;

const ConfigureButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;

    &:hover { color: ${p => p.theme.colors.textSecondary}; }
`;

const RecipientToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    color: #9ca3af;
    cursor: pointer;

    &:hover { color: #4b5563; }
`;

/**
 * Dopisek przy odbiorcy - dokąd naprawdę pójdzie odpowiedź. Przy zgłoszeniu z
 * formularza to informacja, której wcześniej brakowało: odpowiedź szła do robota
 * (czyli do studia), a nikt tego nie widział, bo „wysłało się".
 */
const RecipientHint = styled.span<{ $warn?: boolean }>`
    font-size: 12px;
    color: ${p => (p.$warn ? p.theme.colors.warning : p.theme.colors.textMuted)};
`;

/** Przycisk korekty - obok „Wyślij", ale wizualnie wtórny wobec niego. */
const ProofreadButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 14px;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: all ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.surfaceHover};
        border-color: ${p => p.theme.colors.textMuted};
    }
    &:disabled { opacity: 0.55; cursor: default; }

    .spin {
        animation: proofreadSpin 900ms linear infinite;
    }
    @keyframes proofreadSpin {
        to { transform: rotate(360deg); }
    }
`;

const SendGroup = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
`;

/** Spinacz w pasku edytora - tam, gdzie reszta narzędzi treści. */
const AttachButton = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 32px;
    min-width: 32px;
    padding: 0 8px;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    background: transparent;
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
    &:disabled { opacity: 0.4; cursor: default; }

    svg { width: 16px; height: 16px; }
`;

/**
 * Lista dołączonych plików. Każdy chip pokazuje nazwę i wagę - waga jest tu
 * ważniejsza niż zwykle, bo limit dotyczy sumy i użytkownik ma widzieć, ile zostało.
 */
const AttachmentList = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
`;

const AttachmentChip = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 4px 6px 4px 10px;
    font-size: 12px;

    svg { width: 13px; height: 13px; flex-shrink: 0; }

    .name {
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${p => p.theme.colors.text};
    }
    .size { color: ${p => p.theme.colors.textMuted}; white-space: nowrap; }

    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        &:hover { background: ${p => p.theme.colors.border}; color: ${p => p.theme.colors.text}; }
        svg { width: 12px; height: 12px; }
    }
`;

const AttachmentTotal = styled.span<{ $warn: boolean }>`
    font-size: 11px;
    color: ${({ $warn, theme }) => ($warn ? theme.colors.warning : theme.colors.textMuted)};
    white-space: nowrap;
`;

/**
 * Co wiadomo o szkicu: z czego powstał i co trzeba zrobić przed wysłaniem. Tło i obwódka
 * zamiast wypełnienia - to informacja, nie akcja.
 */
const DraftNote = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceHover};
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 10px 8px 12px;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};

    > svg { flex-shrink: 0; margin-top: 2px; color: ${p => p.theme.colors.primary}; }

    .lines { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .warn { color: ${p => p.theme.colors.warning}; }

    button {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        &:hover { background: ${p => p.theme.colors.border}; color: ${p => p.theme.colors.text}; }
    }
`;

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
};

const fileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage />;
    if (file.type === 'application/pdf' || /\.(pdf|docx?|xlsx?|txt)$/i.test(file.name)) return <FileText />;
    return <FileIcon />;
};

/** Ten sam plik wybrany dwa razy (np. z dwóch zrzutów) nie ma iść dwa razy. */
const sameFile = (a: File, b: File): boolean =>
    a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

interface ReplyComposerProps {
    /** Odpowiedź w istniejącym wątku… */
    threadId?: string;
    /** …albo nowa wiadomość (wymaga accountId + adresata + tematu). */
    accountId?: string;
    initialTo?: string;
    /** Nazwa odbiorcy do dyskretnej etykiety, gdy pole „Do" jest schowane. */
    recipientLabel?: string;
    /** Dopisek przy odbiorcy, np. „prosto do klienta, nie do formularza". */
    recipientHint?: string;
    /** Pierwsza wiadomość z leada bez wątku - wątek z tej wysyłki przypnie się do leada. */
    leadId?: string;
    requireSubject?: boolean;
    /** Wywołane po wysłaniu - z id wątku, w którym wylądowała wiadomość. */
    onSent?: (threadId: string) => void;
}

export function ReplyComposer({
    threadId,
    accountId,
    initialTo,
    recipientLabel,
    recipientHint,
    leadId,
    requireSubject,
    onSent,
}: ReplyComposerProps) {
    const [to, setTo] = useState(initialTo ?? '');
    const [subject, setSubject] = useState('');
    // Surowy innerHTML edytora - normalizacja dopiero przy wysyłce i korekcie.
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [dragging, setDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);
    const sendMail = useSendMail();
    const { data: signature } = useMailSignature();
    const { showSuccess, showError } = useToast();
    const [signatureSettingsOpen, setSignatureSettingsOpen] = useState(false);
    // Ręczna decyzja użytkownika wygrywa z ustawieniem domyślnym stopki; dopóki jej
    // nie podjął, przełącznik pokazuje to, co sam skonfigurował w ustawieniach.
    const [signatureChoice, setSignatureChoice] = useState<boolean | null>(null);
    // Treść sprzed korekty albo szkicu - dopóki użytkownik jej nie tknął, można wrócić
    // jednym kliknięciem.
    const [undoSnapshot, setUndoSnapshot] = useState<{ body: string; title: string } | null>(null);
    const [draft, setDraft] = useState<ReplyDraft | null>(null);
    const proofread = useProofread();
    const hasSignature = Boolean(signature?.bodyHtml);
    const appendSignature = hasSignature && (signatureChoice ?? signature?.enabledByDefault ?? false);
    // W wątku odbiorca jest oczywisty - pokazujemy go dopiero na żądanie.
    const replyInThread = Boolean(threadId) && Boolean(initialTo);
    const [recipientShown, setRecipientShown] = useState(!replyInThread);
    // Odpowiedź w wątku, dla którego serwer nie ustalił klienta (np. stary wątek
    // formularza) - zamiast podstawiać adres robota każemy go wpisać.
    const recipientUnknown = Boolean(threadId) && !initialTo;

    const bodyEmpty = isComposerHtmlEmpty(body);
    const pendingPlaceholders = findPendingPlaceholders(draft, draft ? composerHtmlToText(body) : '');
    const totalAttachmentBytes = attachments.reduce((sum, file) => sum + file.size, 0);

    /**
     * Dokłada pliki z dowolnego źródła (okno wyboru, upuszczenie, schowek),
     * odrzucając te, których i tak nie przyjmie backend - z tym samym komunikatem,
     * który dostałby użytkownik po wysyłce, tylko że od razu.
     */
    const addFiles = (incoming: File[]) => {
        if (incoming.length === 0) return;
        const { maxFiles, maxFileBytes, maxTotalBytes, blockedExtensions } = OUTGOING_ATTACHMENT_LIMITS;
        setAttachments((current) => {
            const accepted: File[] = [...current];
            let total = current.reduce((sum, file) => sum + file.size, 0);
            for (const file of incoming) {
                if (accepted.some((existing) => sameFile(existing, file))) continue;
                const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
                if (blockedExtensions.has(extension)) {
                    showError(`Nie dołączono „${file.name}"`, `Pliki .${extension} są odrzucane przez serwery pocztowe - spakuj plik do ZIP`);
                    continue;
                }
                if (file.size === 0) {
                    showError(`Nie dołączono „${file.name}"`, 'Plik jest pusty');
                    continue;
                }
                if (file.size > maxFileBytes) {
                    showError(`Nie dołączono „${file.name}"`, `Limit to ${formatSize(maxFileBytes)} na plik`);
                    continue;
                }
                if (accepted.length >= maxFiles) {
                    showError('Za dużo załączników', `Do jednej wiadomości można dołączyć najwyżej ${maxFiles} plików`);
                    break;
                }
                if (total + file.size > maxTotalBytes) {
                    showError(`Nie dołączono „${file.name}"`, `Załączniki mogą ważyć łącznie ${formatSize(maxTotalBytes)}`);
                    continue;
                }
                accepted.push(file);
                total += file.size;
            }
            return accepted;
        });
    };

    const removeFile = (index: number) =>
        setAttachments((current) => current.filter((_, position) => position !== index));

    // Licznik zagłębienia: dragenter/dragleave strzelają na każdym dziecku, a nakładka
    // ma zniknąć dopiero, gdy kursor opuści cały kompozytor.
    const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
    };
    const onDragLeave = () => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        dragDepth.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length === 0) return;
        event.preventDefault();
        addFiles(Array.from(event.dataTransfer.files));
    };

    /** Zrzut ekranu wklejony ze schowka - najczęstszy załącznik w rozmowie o aucie. */
    const onPasteFiles = (event: ClipboardEvent<HTMLDivElement>) => {
        const files = Array.from(event.clipboardData.files ?? []);
        if (files.length === 0) return;
        event.preventDefault();
        addFiles(files);
    };

    const runProofread = () => {
        const source = normalizeComposerHtml(body);
        if (!source || proofread.isPending) return;
        proofread.mutate({ text: source, format: 'html' }, {
            onSuccess: (corrected) => {
                const normalized = normalizeComposerHtml(corrected);
                if (!normalized || composerHtmlToText(normalized) === composerHtmlToText(source)) {
                    showSuccess('Bez zmian', 'Nie znaleźliśmy błędów w tej treści');
                    return;
                }
                setUndoSnapshot({ body, title: 'Przywróć treść sprzed korekty' });
                setBody(normalized);
                showSuccess('Poprawiono', 'Przejrzyj zmiany przed wysłaniem');
            },
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się poprawić treści', message ?? 'Spróbuj ponownie za chwilę');
            },
        });
    };

    const undo = () => {
        if (undoSnapshot === null) return;
        setBody(undoSnapshot.body);
        setUndoSnapshot(null);
    };

    const applyDraft = (next: ReplyDraft) => {
        setUndoSnapshot(bodyEmpty ? null : { body, title: 'Przywróć treść sprzed szkicu' });
        setBody(textToComposerHtml(next.bodyText));
        setDraft(next);
    };

    const submit = () => {
        const bodyHtml = normalizeComposerHtml(body);
        if (!bodyHtml || sendMail.isPending || pendingPlaceholders.length > 0) return;
        setUploadProgress(attachments.length > 0 ? 0 : null);
        sendMail.mutate(
            {
                threadId,
                accountId,
                leadId,
                to: to.split(',').map((address) => address.trim()).filter(Boolean),
                subject: subject.trim() || undefined,
                bodyHtml,
                appendSignature,
                attachments,
                onUploadProgress: (fraction) => setUploadProgress(fraction),
            },
            {
                onSuccess: (result) => {
                    setBody('');
                    setAttachments([]);
                    setUndoSnapshot(null);
                    setDraft(null);
                    showSuccess('Wysłano', 'Wiadomość trafi też do folderu Wysłane na serwerze');
                    onSent?.(result.threadId);
                },
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się wysłać', message ?? 'Spróbuj ponownie za chwilę');
                },
                onSettled: () => setUploadProgress(null),
            }
        );
    };

    const sendLabel = sendMail.isPending
        ? uploadProgress !== null && uploadProgress < 1
            ? `Wysyłanie… ${Math.round(uploadProgress * 100)}%`
            : 'Wysyłanie…'
        : 'Wyślij';

    return (
        <Composer
            $dragging={dragging}
            onDragEnter={onDragEnter}
            onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onPaste={onPasteFiles}
        >
            {recipientShown && (
                <MetaRow>
                    Do:
                    <input
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                        placeholder="adres@klienta.pl"
                        disabled={replyInThread}
                    />
                </MetaRow>
            )}
            {recipientUnknown && (
                <RecipientHint $warn>
                    Nie wiemy, kto jest klientem w tym wątku - wpisz jego adres. Adres studia
                    i formularza na stronie nie zostanie przyjęty.
                </RecipientHint>
            )}
            {requireSubject && (
                <MetaRow>
                    Temat:
                    <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Temat wiadomości"
                    />
                </MetaRow>
            )}

            <RichTextEditor
                value={body}
                onChange={(html) => {
                    setBody(html);
                    setUndoSnapshot(null);
                }}
                placeholder={threadId ? 'Napisz odpowiedź…' : 'Napisz wiadomość…'}
                onSubmit={submit}
                disabled={sendMail.isPending}
                toolbarExtra={
                    <AttachButton
                        type="button"
                        $active={attachments.length > 0}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sendMail.isPending}
                        aria-label="Dodaj załącznik"
                        title={`Dodaj załącznik (do ${OUTGOING_ATTACHMENT_LIMITS.maxFiles} plików, łącznie ${formatSize(OUTGOING_ATTACHMENT_LIMITS.maxTotalBytes)})`}
                    >
                        <Paperclip />
                        {attachments.length > 0 && <span>{attachments.length}</span>}
                    </AttachButton>
                }
            />
            <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    // Ten sam plik ma dać się wybrać ponownie po usunięciu z listy.
                    event.target.value = '';
                }}
            />

            {draft && (
                <DraftNote role="status">
                    <Sparkles size={14} />
                    <div className="lines">
                        <span title={draft.examples.map((example) => example.subject ?? '(bez tematu)').join('\n') || undefined}>
                            {draftOriginLabel(draft)}
                        </span>
                        {pendingPlaceholders.length > 0 && (
                            <span className="warn">
                                Uzupełnij przed wysłaniem: {pendingPlaceholders.join(', ')}
                            </span>
                        )}
                        {draft.unverifiedAmounts.length > 0 && (
                            <span className="warn">
                                Sprawdź kwoty, których nie ma w wycenie leada: {draft.unverifiedAmounts.join(', ')}
                            </span>
                        )}
                    </div>
                    {/* Informację wolno schować dopiero po uzupełnieniu znaczników - to ona niesie blokadę wysyłki. */}
                    {pendingPlaceholders.length === 0 && (
                        <button type="button" onClick={() => setDraft(null)} aria-label="Ukryj informację o szkicu">
                            <X size={12} />
                        </button>
                    )}
                </DraftNote>
            )}

            {attachments.length > 0 && (
                <AttachmentList aria-label="Załączniki">
                    {attachments.map((file, index) => (
                        <AttachmentChip key={`${file.name}-${file.size}-${file.lastModified}`} title={file.name}>
                            {fileIcon(file)}
                            <span className="name">{file.name}</span>
                            <span className="size">{formatSize(file.size)}</span>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                aria-label={`Usuń załącznik ${file.name}`}
                                disabled={sendMail.isPending}
                            >
                                <X />
                            </button>
                        </AttachmentChip>
                    ))}
                    <AttachmentTotal $warn={totalAttachmentBytes > OUTGOING_ATTACHMENT_LIMITS.maxTotalBytes * 0.8}>
                        {formatSize(totalAttachmentBytes)} z {formatSize(OUTGOING_ATTACHMENT_LIMITS.maxTotalBytes)}
                    </AttachmentTotal>
                </AttachmentList>
            )}

            <Actions>
                <LeftActions>
                    {replyInThread && !recipientShown && (
                        <RecipientToggle
                            onClick={() => setRecipientShown(true)}
                            title="Pokaż pełny adres odbiorcy"
                        >
                            <AtSign size={11} /> Do: {recipientLabel ?? initialTo}
                        </RecipientToggle>
                    )}
                    {replyInThread && recipientHint && <RecipientHint>{recipientHint}</RecipientHint>}

                    {hasSignature ? (
                        <SignatureToggle
                            $on={appendSignature}
                            onClick={() => setSignatureChoice(!appendSignature)}
                            role="switch"
                            aria-checked={appendSignature}
                            title={
                                appendSignature
                                    ? 'Stopka zostanie dołączona do tej wiadomości'
                                    : 'Wyślij bez stopki'
                            }
                        >
                            <span className="track"><span className="knob" /></span>
                            Dodaj stopkę
                        </SignatureToggle>
                    ) : (
                        <ConfigureButton onClick={() => setSignatureSettingsOpen(true)}>
                            <PenLine size={12} /> Ustaw stopkę
                        </ConfigureButton>
                    )}

                    {hasSignature && (
                        <ConfigureButton
                            onClick={() => setSignatureSettingsOpen(true)}
                            title="Zmień treść stopki"
                        >
                            <Settings2 size={12} /> Zmień
                        </ConfigureButton>
                    )}
                </LeftActions>

                <SendGroup>
                    {undoSnapshot !== null && (
                        <ProofreadButton onClick={undo} title={undoSnapshot.title}>
                            <Undo2 size={14} /> Cofnij
                        </ProofreadButton>
                    )}
                    {threadId && (
                        <ReplyDraftButton
                            threadId={threadId}
                            signatureAppended={appendSignature}
                            disabled={sendMail.isPending}
                            onDraft={applyDraft}
                        />
                    )}
                    <ProofreadButton
                        onClick={runProofread}
                        disabled={proofread.isPending || bodyEmpty}
                        title="Popraw literówki, interpunkcję i odmianę - bez zmiany treści"
                    >
                        {proofread.isPending
                            ? <><Loader2 size={14} className="spin" /> Poprawiam…</>
                            : <><SpellCheck size={14} /> Popraw błędy</>}
                    </ProofreadButton>
                    <PrimaryButton
                        onClick={submit}
                        disabled={sendMail.isPending || bodyEmpty || pendingPlaceholders.length > 0}
                        title={pendingPlaceholders.length > 0 ? 'Uzupełnij znaczniki w nawiasach kwadratowych' : undefined}
                    >
                        <Send size={14} />
                        {sendLabel}
                    </PrimaryButton>
                </SendGroup>
            </Actions>

            {signatureSettingsOpen && (
                <SignatureSettingsModal
                    isOpen
                    onClose={() => setSignatureSettingsOpen(false)}
                />
            )}
        </Composer>
    );
}
