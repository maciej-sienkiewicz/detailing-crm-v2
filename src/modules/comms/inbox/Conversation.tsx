// src/modules/comms/inbox/Conversation.tsx
// Wspólne części rozmowy w skrzynce „Zapytania": nagłówek, dymki i załączniki.
//
// Rozmowa w sprawie czyta się jak komunikator (dymki, „Ty" po prawej), bo to jest
// wymiana zdań z jedną osobą. Poczta (faktura, dostawca) czyta się jak list -
// tam stoi MailReader w MailDetail. Obie drogi biorą treść z MessageBody: ta sama
// sanityzacja, ten sam podział na treść i doklejoną historię.
import { useEffect, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ChevronLeft, Paperclip } from 'lucide-react';
import type { CommAttachment, CommMessage } from '../types';
import { MessageBody } from '../components/MessageBody';
import { messageMoment } from './messageFormat';
import { ix } from './tokens';

const Header = styled.header<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: ${p => (p.$phone ? 4 : 12)}px;
    flex-shrink: 0;
    padding: ${p => (p.$phone ? 'calc(12px + env(safe-area-inset-top, 0px)) 8px 12px' : '20px 28px')};
    border-bottom: 1px solid ${ix.lineSoft};

    .titles { flex: 1; min-width: 0; }
    h2 {
        margin: 0;
        font-size: ${p => (p.$phone ? 17 : 20)}px;
        font-weight: 700;
        letter-spacing: ${p => (p.$phone ? 0 : '-0.02em')};
        color: ${ix.ink};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    p {
        margin: ${p => (p.$phone ? 0 : '2px 0 0')};
        font-size: ${p => (p.$phone ? 13 : 14)}px;
        color: ${ix.text2};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .actions { display: flex; align-items: center; gap: 8px; flex: none; }
`;

const Back = styled.button.attrs({ type: 'button' })`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: ${ix.inkSoft};
    cursor: pointer;

    svg { width: 22px; height: 22px; }
    &:hover { background: ${ix.surfaceAlt}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

interface ConversationHeaderProps {
    title: string;
    subtitle?: string;
    phone: boolean;
    onBack?: () => void;
    children?: ReactNode;
    titleId?: string;
}

export function ConversationHeader({ title, subtitle, phone, onBack, children, titleId }: ConversationHeaderProps) {
    return (
        <Header $phone={phone}>
            {onBack && (
                <Back aria-label="Wróć do listy" onClick={onBack}>
                    {phone ? <ChevronLeft /> : <ArrowLeft />}
                </Back>
            )}
            <div className="titles">
                <h2 id={titleId} title={title}>{title}</h2>
                {subtitle && <p title={subtitle}>{subtitle}</p>}
            </div>
            {children && <div className="actions">{children}</div>}
        </Header>
    );
}

/** Przewijana część rozmowy. Treść dosuwa się do dołu, gdy jest jej mało (makieta). */
export const ConversationScroll = styled.div<{ $phone: boolean; $bottom?: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: ${p => (p.$phone ? 18 : 20)}px;
    padding: ${p => (p.$phone ? '20px 16px' : '28px')};

    /* Zamiast justify-content: flex-end - ten przy przepełnieniu odcina górę rozmowy
       poza zasięg przewijania. Margines u pierwszego dziecka dosuwa krótką rozmowę
       do dołu, a długą zostawia w całości do przewinięcia. */
    > :first-child { margin-top: ${p => (p.$bottom === false ? '0' : 'auto')}; }
`;

const Bubble = styled.div<{ $out: boolean; $phone: boolean }>`
    align-self: ${p => (p.$out ? 'flex-end' : 'flex-start')};
    max-width: ${p => (p.$phone ? '80%' : '70%')};
    min-width: 0;

    .label {
        margin: 0 0 6px;
        font-size: 12px;
        color: ${ix.muted};
        text-align: ${p => (p.$out ? 'right' : 'left')};
    }
    .body {
        padding: 12px 16px;
        border: 1px solid ${p => (p.$out ? ix.surfaceAlt : ix.line)};
        border-radius: ${p => (p.$phone ? 18 : 16)}px;
        background: ${p => (p.$out ? ix.surfaceAlt : '#ffffff')};
        color: ${ix.ink};
        overflow-wrap: anywhere;
    }
    .failed { margin-top: 4px; font-size: 12px; color: ${ix.late}; text-align: right; }
`;

const Files = styled.div<{ $out: boolean }>`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    justify-content: ${p => (p.$out ? 'flex-end' : 'flex-start')};
`;

/** Załącznik jak w makiecie poczty: kafelek typu i nazwa z „Otwórz podgląd". */
const FileCard = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 280px;
    padding: 10px 16px 10px 10px;
    border: 1px solid ${ix.line};
    border-radius: 14px;
    background: #ffffff;
    color: ${ix.ink};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    .kind {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 44px;
        height: 56px;
        border-radius: 6px;
        background: ${ix.surfaceAlt};
        color: ${ix.late};
        font-size: 10px;
        font-weight: 700;
        svg { width: 16px; height: 16px; color: ${ix.muted}; }
    }
    .name {
        display: block;
        font-size: 14px;
        line-height: 24px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .hint { display: block; font-size: 12px; line-height: 24px; color: ${ix.muted}; }
    &:hover { background: ${ix.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

const kindLabel = (attachment: CommAttachment): string | null => {
    const extension = attachment.fileName.split('.').pop()?.toUpperCase() ?? '';
    if (attachment.contentType === 'application/pdf' || extension === 'PDF') return 'PDF';
    if (extension && extension.length <= 4) return extension;
    return null;
};

/** PDF i obrazek da się obejrzeć w przeglądarce - reszta się pobiera. */
const previewable = (attachment: CommAttachment): boolean =>
    attachment.contentType === 'application/pdf' || attachment.contentType.startsWith('image/');

export function AttachmentCards({
    attachments,
    outbound = false,
    onDownload,
    onPreview,
}: {
    attachments: CommAttachment[];
    outbound?: boolean;
    onDownload: (attachmentId: string, fileName: string) => void;
    /** Podgląd w nowej karcie (PDF, obrazek); bez niego wszystko się pobiera. */
    onPreview?: (attachment: CommAttachment) => void;
}) {
    if (attachments.length === 0) return null;
    return (
        <Files $out={outbound}>
            {attachments.map((attachment) => {
                const kind = kindLabel(attachment);
                return (
                    <FileCard
                        key={attachment.id}
                        type="button"
                        onClick={() => (onPreview && previewable(attachment) ? onPreview(attachment) : onDownload(attachment.id, attachment.fileName))}
                        title={attachment.fileName}
                    >
                        <span className="kind" aria-hidden="true">{kind ?? <Paperclip />}</span>
                        <span style={{ minWidth: 0 }}>
                            <span className="name">{attachment.fileName}</span>
                            <span className="hint">{onPreview && previewable(attachment) ? 'Otwórz podgląd' : 'Pobierz'}</span>
                        </span>
                    </FileCard>
                );
            })}
        </Files>
    );
}

interface BubblesProps {
    messages: CommMessage[];
    phone: boolean;
    onDownload: (attachmentId: string, fileName: string) => void;
    onOpenFull: (messageId: string) => void;
    /** Coś nad rozmową (pasek wizyty, zgłoszenie z formularza). */
    before?: ReactNode;
    loading?: boolean;
    /**
     * Krótka rozmowa przy dolnej krawędzi, tuż nad odpowiedzią (makieta „klient
     * odpisał"). Przy rozwiniętym kompozytorze - od góry (makieta „nowe zapytanie").
     */
    alignBottom?: boolean;
}

/** Rozmowa jako dymki: klient po lewej z datą, „Ty" po prawej. Otwiera się na końcu. */
export function Bubbles({ messages, phone, onDownload, onOpenFull, before, loading, alignBottom = true }: BubblesProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastId = messages[messages.length - 1]?.id;

    // Nowa wiadomość albo otwarcie rozmowy - na dół, tam jest to, na co się odpowiada.
    useEffect(() => {
        const element = scrollRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [lastId]);

    return (
        <ConversationScroll ref={scrollRef} $phone={phone} $bottom={alignBottom}>
            {before}
            {loading && messages.length === 0 && <p style={{ margin: 'auto', color: ix.muted, fontSize: 14 }}>Wczytywanie rozmowy…</p>}
            {messages.map((message) => {
                const out = message.direction === 'OUTBOUND';
                return (
                    <Bubble key={message.id} $out={out} $phone={phone}>
                        <p className="label">{out ? 'Ty' : messageMoment(message.sentAt)}</p>
                        <div className="body">
                            <MessageBody
                                html={message.bodyHtml ?? ''}
                                cacheKey={message.id}
                                size="bubble"
                                maxHeight={420}
                                compactGraphical
                                onOpenFull={() => onOpenFull(message.id)}
                            />
                        </div>
                        <AttachmentCards attachments={message.attachments} outbound={out} onDownload={onDownload} />
                        {out && message.sendStatus === 'FAILED' && <p className="failed">Nie wysłano - spróbuj ponownie</p>}
                    </Bubble>
                );
            })}
        </ConversationScroll>
    );
}
