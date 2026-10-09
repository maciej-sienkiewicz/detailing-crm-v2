// src/modules/comms/components/ReplyComposer.tsx
// Odpowiedź w wątku lub nowa wiadomość - wygląd z makiet skrzynki „Zapytania".
//
// Trzy postacie tej samej odpowiedzi:
//  - KARTA (poczta): edytor w karcie z obwódką, pod treścią podgląd stopki, w dolnym
//    rzędzie „Aa", zdjęcie z galerii i spinacz, a po prawej „Napisz z AI" i „Wyślij";
//  - ZWINIĘTA (sprawa): pole „Odpowiedz…", „Napisz z AI" i „Wyślij" w jednym rzędzie -
//    gdy krokiem następnym jest rezerwacja, odpowiedź nie zabiera rozmowie miejsca;
//    kliknięcie w pole rozwija kartę;
//  - TELEFON: rząd z polem i dwoma okrągłymi przyciskami, a pisanie na cały ekran.
//
// Treść pisze się w uproszczonym edytorze (RichTextEditor). HTML z edytora jest
// sprowadzany do ustalonego dialektu (normalizeComposerHtml) przed wysyłką i przed
// korektą - backend i tak sanityzuje, ale ma dostać coś już czystego.
//
// Załączniki: spinacz w dolnym rzędzie, upuszczenie pliku na kompozytor albo
// wklejenie. Limity są sprawdzane tu, zanim plik poleci na serwer (OUTGOING_ATTACHMENT_LIMITS
// to lustro OutgoingAttachmentPolicy z backendu) - błąd o 15 MB ma się pojawić w chwili
// wyboru pliku, a nie po minucie wysyłania. Zdjęcia z galerii wybiera się w okienku
// nad kompozytorem (GalleryPhotoPicker), a do serwera idą same wskazania - pliki
// dokłada backend. Liczą się do tego samego limitu plików co załączniki z dysku.
//
// Szkic AI (tylko w wątku): asystent pisze projekt odpowiedzi, który zastępuje treść
// edytora - z „Cofnij", jak po korekcie. Znaczniki do uzupełnienia („[proponowany
// termin]") blokują wysyłkę, dopóki stoją w treści: klient nie może dostać nawiasu.
// „Napisz inaczej" oddaje asystentowi bieżącą treść edytora razem z uwagami pracownika.
//
// Odpowiadając w wątku nie powtarzamy adresu odbiorcy: rozmowa ma jednego
// uczestnika, wypisanego już w nagłówku. Adres pokazujemy tylko wtedy, gdy jest
// o nim coś do powiedzenia (formularz, nieznany klient).
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
    ArrowLeft,
    AtSign,
    FileImage,
    FileText,
    File as FileIcon,
    Reply,
    ImagePlus,
    Loader2,
    Paperclip,
    Send,
    Sparkle,
    SpellCheck,
    Undo2,
    X,
} from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import type { GalleryPhoto } from '@/modules/gallery/types';
import { useMailSignature, useProofread, useSendMail } from '../hooks/useComms';
import { OUTGOING_ATTACHMENT_LIMITS, type ReplyDraft } from '../types';
import {
    composerHtmlToText,
    isComposerHtmlEmpty,
    normalizeComposerHtml,
    textToComposerHtml,
} from '../utils/composerHtml';
import { draftOriginLabel, pendingPlaceholders as findPendingPlaceholders } from '../utils/replyDraft';
import { QUICK_REPLIES, type QuickReply } from '../utils/quickReplies';
import { signatureHtmlToText } from '../utils/signatureText';
import { useChangeLeadStatus } from '../hooks/useLeads';
import { ReplyDraftButton } from './ReplyDraftButton';
import { ReplyDraftRevise } from './ReplyDraftRevise';
import { RichTextEditor } from './RichTextEditor';
import { GalleryPhotoPicker, type GalleryPickerContext } from './GalleryPhotoPicker';
import { galleryPhotoKey } from '../utils/galleryPhotoKey';
import { SignatureSettingsModal } from './SignatureSettingsModal';
import { PillPrimary, TintBtn, ToolBtn } from '../inbox/primitives';
import { ix } from '../inbox/tokens';

/*
 * Rozsunięcie z przycisku „Odpisz": karta odsłania się od prawego dolnego rogu,
 * tam gdzie stał przycisk - oko widzi, skąd się wzięła. Przycinanie, a nie zmiana
 * wymiarów: układ rozmowy nad kompozytorem nie skacze w trakcie animacji.
 */
const grow = keyframes`
    from {
        opacity: 0.4;
        clip-path: inset(calc(100% - 64px) 28px 20px calc(100% - 180px) round 999px);
    }
    to {
        opacity: 1;
        clip-path: inset(0 0 0 0 round 0);
    }
`;

const Composer = styled.div<{ $dragging: boolean; $sheet?: boolean; $divider: boolean; $phone: boolean; $grow?: boolean }>`
    position: relative;
    ${p => p.$grow && css`
        animation: ${grow} 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
        @media (prefers-reduced-motion: reduce) { animation: none; }
    `}
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
    padding: ${p => (p.$phone ? '12px 16px 16px' : p.$divider ? '16px 28px 24px' : '0 28px 24px')};
    ${p => p.$divider && css`border-top: 1px solid ${ix.lineSoft};`}
    background: #ffffff;

    .spin { animation: composerSpin 900ms linear infinite; }
    @keyframes composerSpin { to { transform: rotate(360deg); } }

    /* Telefon: odpowiedź na cały ekran. Pisze się na całej wysokości, a wiadomość,
       na którą się odpowiada, wraca po „Wróć". */
    ${({ $sheet }) =>
        $sheet &&
        css`
        position: fixed;
        inset: 0;
        z-index: 1100;
        border-top: none;
        overflow-y: auto;
        padding: 0 14px calc(14px + env(safe-area-inset-bottom, 0px));
        > * { flex-shrink: 0; }
        `}

    /* Cały kompozytor jest strefą zrzutu - nie trzeba celować w edytor. */
    ${({ $dragging }) =>
        $dragging &&
        css`
        &::after {
            content: 'Upuść, żeby dołączyć plik';
            position: absolute;
            inset: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed ${ix.accent};
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.92);
            color: ${ix.accentInk};
            font-size: 14px;
            font-weight: 600;
            pointer-events: none;
            z-index: 1;
        }
    `}
`;

/** Zwinięta odpowiedź: pole „Odpowiedz…" i przyciski w jednym rzędzie. */
const CompactRow = styled.div<{ $end?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: ${p => (p.$end ? 'flex-end' : 'flex-start')};
    gap: 8px;
`;

/** Pole, które tylko wygląda jak pole - kliknięcie rozwija kartę z prawdziwym edytorem. */
const FakeInput = styled.button<{ $h: number }>`
    flex: 1;
    min-width: 0;
    height: ${p => p.$h}px;
    padding: 0 18px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    color: ${ix.muted};
    font-family: inherit;
    font-size: ${p => (p.$h >= 48 ? 16 : 14)}px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: text;

    &:hover { border-color: #cbd5e1; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

/** Okrągły „Wyślij" na telefonie - odcień, nie wypełnienie (wypełniony jest krok następny). */
const RoundSend = styled(TintBtn)`
    width: 48px;
    height: 48px;
    padding: 0;
    svg { width: 18px; height: 18px; }
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
    color: ${ix.muted};

    input {
        flex: 1;
        min-width: 180px;
        height: 36px;
        border: 1px solid ${ix.line};
        border-radius: 10px;
        padding: 0 12px;
        font-size: 14px;
        outline: none;
        font-family: inherit;
        color: ${ix.ink};

        &:focus { border-color: ${ix.faint}; }
        &:disabled { background: ${ix.surfaceSoft}; color: ${ix.text2}; }
    }
`;

const RecipientToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    color: ${ix.muted};
    cursor: pointer;

    &:hover { color: ${ix.inkSoft}; }
`;

/**
 * Dopisek przy odbiorcy - dokąd naprawdę pójdzie odpowiedź. Przy zgłoszeniu z
 * formularza to informacja, której wcześniej brakowało: odpowiedź szła do robota
 * (czyli do studia), a nikt tego nie widział, bo „wysłało się".
 */
const RecipientHint = styled.span<{ $warn?: boolean }>`
    font-size: 13px;
    color: ${p => (p.$warn ? '#b45309' : ix.muted)};
`;

/** Przycisk w pasku edytora (spinacz, zdjęcie) - z licznikiem, gdy coś dołączono. */
const AttachButton = styled(ToolBtn)`
    span { font-size: 12px; font-weight: 600; }
`;

/** Górny pasek odpowiedzi na pełnym ekranie: „Wróć" do wiadomości i do kogo piszemy. */
const SheetTop = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 -14px;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 10px;
    background: #ffffff;
    border-bottom: 1px solid ${ix.lineSoft};

    button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-height: 44px;
        border: none;
        background: none;
        padding: 0 4px;
        font: inherit;
        font-size: 15px;
        font-weight: 500;
        color: ${ix.inkSoft};
        cursor: pointer;
        svg { width: 20px; height: 20px; }
    }
    .who {
        flex: 1;
        min-width: 0;
        font-size: 15px;
        font-weight: 600;
        color: ${ix.ink};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/** Gotowe odpowiedzi - tylko przy pustym edytorze, ciche jak podpowiedź, nie jak akcja. */
const QuickReplies = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${ix.muted};

    button {
        border: 1px solid ${ix.line};
        background: #ffffff;
        color: ${ix.text2};
        border-radius: 999px;
        padding: 5px 12px;
        font: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: border-color 150ms ease, color 150ms ease;

        &:hover { border-color: #cbd5e1; color: ${ix.ink}; }
    }
`;

/** Podgląd stopki pod treścią - szary, jak w makiecie („Twoja stopka"). */
const SignatureLine = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 18px 0;
    font-size: 15px;
    line-height: 23px;
    color: ${ix.muted};

    .text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    button {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border: none;
        border-radius: 6px;
        background: none;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 500;
        color: ${ix.muted};
        cursor: pointer;
        &:hover { background: ${ix.surfaceAlt}; color: ${ix.ink}; }
    }
`;

const AttachmentList = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 8px 18px 0;
`;

const AttachmentChip = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    border: 1px solid ${ix.line};
    background: ${ix.surfaceSoft};
    color: ${ix.text2};
    border-radius: 999px;
    padding: 4px 6px 4px 10px;
    font-size: 12px;

    svg { width: 13px; height: 13px; flex-shrink: 0; }

    .name {
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${ix.ink};
    }
    .size { color: ${ix.muted}; white-space: nowrap; }

    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: ${ix.muted};
        cursor: pointer;
        &:hover { background: ${ix.line}; color: ${ix.ink}; }
        svg { width: 12px; height: 12px; }
    }
`;

/** Zdjęcie z galerii na liście załączników - miniatura zamiast ikony pliku. */
const GalleryChip = styled(AttachmentChip)`
    padding: 3px 6px 3px 3px;

    img {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }
`;

const AttachmentTotal = styled.span<{ $warn: boolean }>`
    font-size: 11px;
    color: ${({ $warn }) => ($warn ? '#b45309' : ix.muted)};
    white-space: nowrap;
`;

/**
 * Linia nad szkicem z makiety: „✦ Szkic napisany przez AI. Popraw go, jeśli trzeba."
 * i „Napisz inaczej" po prawej. Ostrzeżenia (znaczniki, kwoty spoza wyceny) stoją pod
 * spodem - to one niosą blokadę wysyłki.
 */
const DraftNote = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    line-height: 20px;
    color: ${ix.text2};

    > svg { flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px; color: ${ix.accentInk}; }
    .lines { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .warn { color: #b45309; }
    .side { flex: none; display: inline-flex; align-items: center; gap: 4px; }

    button.close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: ${ix.muted};
        cursor: pointer;
        &:hover { background: ${ix.line}; color: ${ix.ink}; }
    }
`;

/** Okienko wyboru zdjęć stoi nad kompozytorem, przy przycisku zdjęcia (makieta). */
const PickerAnchor = styled.div<{ $phone: boolean }>`
    position: absolute;
    z-index: 30;
    ${p => (p.$phone
        ? css`left: 12px; right: 12px; bottom: calc(100% + 8px);`
        : css`left: 28px; bottom: calc(100% + 8px); width: min(440px, calc(100% - 56px));`)}
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
    /** Lead przypięty do wątku odpowiedzi - „Napisz z AI" bierze z niego wycenę do oferty. */
    threadLeadId?: string | null;
    requireSubject?: boolean;
    /** Wywołane po wysłaniu - z id wątku, w którym wylądowała wiadomość. */
    onSent?: (threadId: string) => void;
    /**
     * Telefon: zamiast stale rozłożonego edytora rząd „Odpowiedz…", a edytor otwiera
     * się na cały ekran dopiero po dotknięciu. Treść czeka, gdy się wróci do wiadomości.
     */
    collapsible?: boolean;
    /** Krok następny nad zwiniętym rzędem na telefonie (np. „Umów wizytę"). */
    barExtra?: ReactNode;
    /**
     * Zdjęcia z galerii: co wiemy o kliencie i aucie (z tego biorą się zakładki
     * okienka wyboru). Brak = przycisk galerii się nie pokazuje - rodzic przekazuje to
     * tylko użytkownikom z dostępem do galerii, bo serwer i tak odrzuci wysyłkę.
     */
    galleryContext?: GalleryPickerContext;
    /**
     * Wygląd „Wyślij" (CLAUDE.md §2 - jedno wypełnienie w oknie):
     *  - 'pill' - wypełniona pigułka (odpowiedź jest krokiem następnym),
     *  - 'tint' - odcień z obwódką (krokiem jest coś innego, np. rezerwacja obok).
     */
    sendAppearance?: 'pill' | 'tint';
    /**
     * 'collapsed' - na komputerze najpierw sam wąski przycisk „Odpisz", a karta
     * z edytorem rozsuwa się dopiero po kliknięciu. Rozłożony edytor zabierał
     * rozmowie pół ekranu także wtedy, gdy nikt nie odpisywał.
     */
    layout?: 'card' | 'collapsed';
    /** Kreska nad kompozytorem - w poczcie oddziela odpowiedź od czytanej wiadomości. */
    divider?: boolean;
}

export function ReplyComposer({
    threadId,
    accountId,
    initialTo,
    recipientLabel,
    recipientHint,
    leadId,
    threadLeadId,
    requireSubject,
    onSent,
    collapsible = false,
    barExtra,
    galleryContext,
    sendAppearance = 'pill',
    layout = 'card',
    divider = false,
}: ReplyComposerProps) {
    const [expanded, setExpanded] = useState(false);
    const sheet = collapsible && expanded;
    // Pod kompozytorem na cały ekran wątek nie może się przewijać razem z palcem (CLAUDE.md §3).
    useEffect(() => (sheet ? acquireScrollLock() : undefined), [sheet]);
    const [to, setTo] = useState(initialTo ?? '');
    const [subject, setSubject] = useState('');
    // Surowy innerHTML edytora - normalizacja dopiero przy wysyłce i korekcie.
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
    const [galleryOpen, setGalleryOpen] = useState(false);
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
    // Gotowa odmowa zamyka zapytanie po wysłaniu - dopóki użytkownik tego nie odwoła.
    const [closeReason, setCloseReason] = useState<string | null>(null);
    const changeLeadStatus = useChangeLeadStatus();
    const contextLeadId = leadId ?? threadLeadId ?? null;
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
        const { maxFileBytes, maxTotalBytes, blockedExtensions } = OUTGOING_ATTACHMENT_LIMITS;
        // Zdjęcia z galerii zajmują miejsca w tym samym limicie plików.
        const maxFiles = OUTGOING_ATTACHMENT_LIMITS.maxFiles - galleryPhotos.length;
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
                    showError('Za dużo załączników', `Do jednej wiadomości można dołączyć najwyżej ${OUTGOING_ATTACHMENT_LIMITS.maxFiles} plików`);
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

    const applyQuickReply = (reply: QuickReply) => {
        setBody(textToComposerHtml(reply.text));
        setUndoSnapshot(null);
        setCloseReason(reply.closesWithReason ?? null);
        setExpanded(true);
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
                galleryPhotos: galleryPhotos.map((photo) => ({ source: photo.source, id: photo.id })),
                onUploadProgress: (fraction) => setUploadProgress(fraction),
            },
            {
                onSuccess: (result) => {
                    setBody('');
                    setAttachments([]);
                    setGalleryPhotos([]);
                    setUndoSnapshot(null);
                    setDraft(null);
                    if (closeReason && contextLeadId) {
                        changeLeadStatus.mutate(
                            { leadId: contextLeadId, status: 'LOST', lostReasonCode: closeReason },
                            {
                                onSuccess: () => showSuccess('Wysłano i zamknięto', 'Zapytanie trafiło do archiwum jako „Poza zakresem usług"'),
                                onError: () => showError('Wysłano, ale nie zamknięto zapytania', 'Zamknij je ręcznie w podglądzie leada'),
                            }
                        );
                    } else {
                        showSuccess('Wysłano', 'Wiadomość trafi też do folderu Wysłane na serwerze');
                    }
                    setCloseReason(null);
                    setExpanded(false);
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

    // Zwinięty przycisk rozsuwa się w kartę na żądanie i sam, gdy jest już co pokazać.
    const nothingWritten = bodyEmpty && !draft && attachments.length === 0 && galleryPhotos.length === 0 && !sendMail.isPending;
    const compactCollapsed = layout === 'collapsed' && !collapsible && !expanded && nothingWritten;
    const [focusOnOpen, setFocusOnOpen] = useState(false);
    const open = () => {
        setFocusOnOpen(true);
        setExpanded(true);
    };
    // Rozsunięta, a wciąż pusta karta da się zwinąć z powrotem do „Odpisz".
    const canFold = layout === 'collapsed' && !collapsible && expanded && nothingWritten;

    const draftButton = (height: number, iconOnly = false) =>
        threadId ? (
            <ReplyDraftButton
                threadId={threadId}
                signatureAppended={appendSignature}
                disabled={sendMail.isPending}
                leadId={threadLeadId ?? null}
                onDraft={(next) => { applyDraft(next); setExpanded(true); }}
                height={height}
                iconOnly={iconOnly}
                showStyleButton={false}
            />
        ) : null;

    const sendDisabled = sendMail.isPending || bodyEmpty || pendingPlaceholders.length > 0;
    const sendTitle = pendingPlaceholders.length > 0 ? 'Uzupełnij znaczniki w nawiasach kwadratowych' : undefined;

    if (collapsible && !expanded) {
        return (
            <Composer $dragging={false} $divider $phone>
                {barExtra}
                <CompactRow>
                    <FakeInput type="button" $h={48} onClick={open}>
                        {bodyEmpty ? 'Odpowiedz…' : composerHtmlToText(body)}
                    </FakeInput>
                    {draftButton(48, true)}
                    <RoundSend
                        aria-label={bodyEmpty ? 'Napisz odpowiedź' : 'Wróć do odpowiedzi'}
                        onClick={open}
                    >
                        <Send />
                    </RoundSend>
                </CompactRow>
            </Composer>
        );
    }

    if (compactCollapsed) {
        return (
            <Composer $dragging={false} $divider={divider} $phone={false} style={{ paddingTop: 16 }}>
                <CompactRow $end>
                    {sendAppearance === 'pill' ? (
                        <PillPrimary onClick={open}><Reply /> Odpisz</PillPrimary>
                    ) : (
                        <TintBtn $h={40} onClick={open}><Reply /> Odpisz</TintBtn>
                    )}
                </CompactRow>
            </Composer>
        );
    }

    const sendButton =
        sendAppearance === 'tint' ? (
            <TintBtn $h={40} onClick={submit} disabled={sendDisabled} title={sendTitle}>
                <Send /> {sendLabel}
            </TintBtn>
        ) : (
            <PillPrimary onClick={submit} disabled={sendDisabled} title={sendTitle}>
                <Send /> {sendLabel}
            </PillPrimary>
        );

    const signatureText = hasSignature ? signatureHtmlToText(signature?.bodyHtml ?? null).split('\n').find((line) => line.trim()) ?? 'Twoja stopka' : '';

    return (
        <Composer
            $sheet={sheet}
            $dragging={dragging}
            $divider={divider}
            $phone={collapsible}
            $grow={layout === 'collapsed' && !collapsible && focusOnOpen}
            onDragEnter={onDragEnter}
            onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onPaste={onPasteFiles}
        >
            {sheet && (
                <SheetTop>
                    <button type="button" onClick={() => setExpanded(false)} aria-label="Wróć do wiadomości">
                        <ArrowLeft /> Wróć
                    </button>
                    <span className="who">{recipientLabel ?? initialTo ?? 'Nowa wiadomość'}</span>
                </SheetTop>
            )}

            {draft && (
                <DraftNote role="status">
                    <Sparkle />
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
                    <span className="side">
                        {threadId && (
                            <ReplyDraftRevise
                                threadId={threadId}
                                draft={draft}
                                currentText={composerHtmlToText(body)}
                                signatureAppended={appendSignature}
                                disabled={sendMail.isPending}
                                onDraft={applyDraft}
                                label="Napisz inaczej"
                            />
                        )}
                        {/* Informację wolno schować dopiero po uzupełnieniu znaczników - to ona niesie blokadę wysyłki. */}
                        {pendingPlaceholders.length === 0 && (
                            <button type="button" className="close" onClick={() => setDraft(null)} aria-label="Ukryj informację o szkicu">
                                <X size={12} />
                            </button>
                        )}
                    </span>
                </DraftNote>
            )}

            {closeReason && !bodyEmpty && (
                <DraftNote role="status">
                    <div className="lines">
                        <span>Po wysłaniu zapytanie zamknie się jako „Poza zakresem usług" - nie liczy się jako strata.</span>
                    </div>
                    <span className="side">
                        <button type="button" className="close" onClick={() => setCloseReason(null)} aria-label="Nie zamykaj zapytania po wysłaniu">
                            <X size={12} />
                        </button>
                    </span>
                </DraftNote>
            )}

            {(recipientShown || (replyInThread && recipientHint)) && (
                <MetaRow>
                    {recipientShown ? (
                        <>
                            Do:
                            <input
                                value={to}
                                onChange={(event) => setTo(event.target.value)}
                                placeholder="adres@klienta.pl"
                                disabled={replyInThread}
                            />
                        </>
                    ) : (
                        <RecipientToggle type="button" onClick={() => setRecipientShown(true)} title="Pokaż pełny adres odbiorcy">
                            <AtSign size={12} /> Do: {recipientLabel ?? initialTo}
                        </RecipientToggle>
                    )}
                    {replyInThread && recipientHint && <RecipientHint>{recipientHint}</RecipientHint>}
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
                    if (isComposerHtmlEmpty(html)) setCloseReason(null);
                }}
                placeholder={threadId ? 'Napisz odpowiedź…' : 'Napisz wiadomość…'}
                tall={sheet}
                onSubmit={submit}
                disabled={sendMail.isPending}
                collapsibleToolbar
                autoFocus={focusOnOpen}
                afterContent={
                    <>
                        {(attachments.length > 0 || galleryPhotos.length > 0) && (
                            <AttachmentList aria-label="Załączniki">
                                {galleryPhotos.map((photo) => (
                                    <GalleryChip key={galleryPhotoKey(photo)} title={photo.description || photo.fileName}>
                                        <img src={photo.thumbnailUrl} alt="" />
                                        <span className="name">{photo.fileName}</span>
                                        <button
                                            type="button"
                                            onClick={() => setGalleryPhotos((current) => current.filter((item) => galleryPhotoKey(item) !== galleryPhotoKey(photo)))}
                                            aria-label={`Usuń zdjęcie ${photo.fileName}`}
                                            disabled={sendMail.isPending}
                                        >
                                            <X />
                                        </button>
                                    </GalleryChip>
                                ))}
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
                                {/* Wagi zdjęć z galerii nie znamy przed wysyłką - limit sumy sprawdzi serwer. */}
                                {attachments.length > 0 && (
                                    <AttachmentTotal $warn={totalAttachmentBytes > OUTGOING_ATTACHMENT_LIMITS.maxTotalBytes * 0.8}>
                                        {formatSize(totalAttachmentBytes)} z {formatSize(OUTGOING_ATTACHMENT_LIMITS.maxTotalBytes)}
                                    </AttachmentTotal>
                                )}
                            </AttachmentList>
                        )}
                        {/* Stopka: podgląd tego, co doklei się na końcu. Wyłączenie i ustawienia
                            obok - decyzja o tym, co trafi do cudzej skrzynki, ma być widoczna. */}
                        <SignatureLine>
                            {hasSignature && appendSignature ? (
                                <>
                                    <span className="text" title={signatureHtmlToText(signature?.bodyHtml ?? null)}>{signatureText}</span>
                                    <button type="button" onClick={() => setSignatureChoice(false)} aria-label="Wyślij bez stopki" title="Wyślij bez stopki">
                                        <X size={12} />
                                    </button>
                                </>
                            ) : hasSignature ? (
                                <button type="button" onClick={() => setSignatureChoice(true)}>+ Dodaj stopkę</button>
                            ) : (
                                <button type="button" onClick={() => setSignatureSettingsOpen(true)}>+ Ustaw stopkę</button>
                            )}
                        </SignatureLine>
                    </>
                }
                toolbarExtra={
                    <>
                        {galleryContext && (
                            <AttachButton
                                $on={galleryOpen}
                                aria-expanded={galleryOpen}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setGalleryOpen((value) => !value)}
                                disabled={sendMail.isPending}
                                aria-label="Dodaj zdjęcie z galerii"
                                title="Dodaj zdjęcie z galerii studia"
                            >
                                <ImagePlus />
                                {galleryPhotos.length > 0 && <span>{galleryPhotos.length}</span>}
                            </AttachButton>
                        )}
                        <AttachButton
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sendMail.isPending}
                            aria-label="Dodaj plik"
                            title={`Dodaj plik (do ${OUTGOING_ATTACHMENT_LIMITS.maxFiles} plików, łącznie ${formatSize(OUTGOING_ATTACHMENT_LIMITS.maxTotalBytes)})`}
                        >
                            <Paperclip />
                            {attachments.length > 0 && <span>{attachments.length}</span>}
                        </AttachButton>
                    </>
                }
                toolbarAppend={
                    <ToolBtn
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={runProofread}
                        disabled={proofread.isPending || bodyEmpty}
                        aria-label="Popraw błędy"
                        title="Popraw literówki, interpunkcję i odmianę - bez zmiany treści"
                    >
                        {proofread.isPending ? <Loader2 className="spin" /> : <SpellCheck />}
                    </ToolBtn>
                }
                actions={
                    <>
                        {canFold && (
                            <ToolBtn onClick={() => { setExpanded(false); setFocusOnOpen(false); }} aria-label="Zwiń odpowiedź" title="Zwiń odpowiedź">
                                Anuluj
                            </ToolBtn>
                        )}
                        {undoSnapshot !== null && (
                            <ToolBtn onClick={undo} title={undoSnapshot.title} aria-label="Cofnij">
                                <Undo2 /> Cofnij
                            </ToolBtn>
                        )}
                        {draftButton(40)}
                        {sendButton}
                    </>
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

            {contextLeadId && bodyEmpty && !sendMail.isPending && (
                <QuickReplies aria-label="Gotowe odpowiedzi">
                    Szybka odpowiedź:
                    {QUICK_REPLIES.map((reply) => (
                        <button key={reply.id} type="button" onClick={() => applyQuickReply(reply)}>
                            {reply.label}
                        </button>
                    ))}
                </QuickReplies>
            )}

            {galleryOpen && galleryContext && (
                <PickerAnchor $phone={collapsible}>
                    <GalleryPhotoPicker
                        onClose={() => setGalleryOpen(false)}
                        context={galleryContext}
                        initialSelection={galleryPhotos}
                        maxSelectable={Math.max(0, OUTGOING_ATTACHMENT_LIMITS.maxFiles - attachments.length)}
                        onConfirm={(photos) => {
                            setGalleryPhotos(photos);
                            setGalleryOpen(false);
                        }}
                        onPickFromDevice={() => {
                            setGalleryOpen(false);
                            fileInputRef.current?.click();
                        }}
                    />
                </PickerAnchor>
            )}

            {signatureSettingsOpen && (
                <SignatureSettingsModal
                    isOpen
                    onClose={() => setSignatureSettingsOpen(false)}
                />
            )}
        </Composer>
    );
}
