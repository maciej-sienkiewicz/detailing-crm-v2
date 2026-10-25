// src/modules/comms/inbox/Conversation.tsx
// Wspólne części rozmowy w skrzynce „Zapytania": nagłówek, wątek maila i załączniki.
//
// Wątek maila (lead i Poczta) to sekcje na szerokość tekstu, nie dymki: mail jest
// listem - powitanie, akapity, pozdrowienia - i w dymku dosuniętym do prawej
// wyglądał jak ściana tekstu przesunięta w bok. Porównanie A/B z 25.10.2026: na
// telefonie sekcje mieszczą 44 znaki w wierszu zamiast 40 i rozmowa jest o 5%
// krótsza, na komputerze obie wersje miały tę samą długość. Dymki zostały tam,
// gdzie rozmowa jest czatem - na Instagramie (InstagramConversation).
// Treść zawsze z MessageBody: ta sama sanityzacja, ten sam podział na treść,
// stopkę i doklejoną historię.
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ChevronLeft, Paperclip } from 'lucide-react';
import type { CommAttachment, CommMessage } from '../types';
import { MessageBody } from '../components/MessageBody';
import { isPreviewableAttachment, messageMoment, withEvents, type ConversationEvent } from './messageFormat';

export type { ConversationEvent } from './messageFormat';
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
export const ConversationScroll = styled.div<{ $phone: boolean; $bottom?: boolean; $dense?: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    /* Sekcje wątku maila niosą nagłówek z nadawcą, więc stoją ciaśniej niż dymki. */
    gap: ${p => (p.$dense ? 12 : p.$phone ? 18 : 20)}px;
    padding: ${p => (p.$phone ? '20px 16px' : '28px')};

    /* Zamiast justify-content: flex-end - ten przy przepełnieniu odcina górę rozmowy
       poza zasięg przewijania. Margines u pierwszego dziecka dosuwa krótką rozmowę
       do dołu, a długą zostawia w całości do przewinięcia. */
    > :first-child { margin-top: ${p => (p.$bottom === false ? '0' : 'auto')}; }
`;

/**
 * Wiadomość wątku maila: sekcja z nagłówkiem (kto, kiedy) na delikatnym tle. Klient -
 * chłodna szarość, studio - jasny odcień marki.
 *
 * Stronę rozmowy niesie przede wszystkim pasek z lewej, a nie samo tło: u studia
 * nasycony kolor marki, u klienta jasna szarość. Różnią się jasnością, nie tylko
 * odcieniem, więc „kto pisał" widać także bez rozróżniania błękitu od szarości
 * i przy szybkim przewijaniu.
 *
 * Szerokość sekcji to szerokość tekstu (560 px, ok. 75 znaków Inter 15 px - górna
 * granica wygodnego wiersza) z odstępami. Sekcja na całą rozmowę zostawiała na
 * szerokim ekranie pusty pas zabarwionego tła po prawej. Mail projektowany (tabela,
 * newsletter) bierze całą szerokość - ma własny układ i 560 px by go ścisnęło.
 *
 * Bez cieni: to płaszczyzny, nie wyniesione karty (CLAUDE.md §2, wyniesienie niesie temat).
 */
const Section = styled.article<{ $out: boolean; $phone: boolean }>`
    min-width: 0;
    max-width: calc(560px + 44px);
    padding: ${p => (p.$phone ? '12px 14px 14px' : '14px 20px 16px')};
    border: 1px solid ${p => (p.$out ? '#d7ecf7' : ix.lineSoft)};
    border-left: 3px solid ${p => (p.$out ? ix.accent : '#cbd5e1')};
    border-radius: 12px;
    /* Studio: odcień marki ok. 5% (accentTint to 10% - na dużej płaszczyźnie za mocny). */
    background: ${p => (p.$out ? '#f3f9fd' : ix.surfaceSoft)};

    &:has(iframe) { max-width: none; }

    .head {
        display: flex;
        align-items: baseline;
        gap: 4px 12px;
        flex-wrap: wrap;
        margin: 0 0 8px;
    }
    .who { font-size: 13px; font-weight: 600; color: ${p => (p.$out ? ix.accentInk : ix.inkSoft)}; }
    .when { margin-left: auto; font-size: 12px; color: ${ix.muted}; font-variant-numeric: tabular-nums; }
    .text { color: ${ix.ink}; overflow-wrap: anywhere; }
    .failed { margin-top: 6px; font-size: 12px; color: ${ix.late}; }
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

const previewable = isPreviewableAttachment;

export function AttachmentCards({
    attachments,
    outbound = false,
    onDownload,
    onPreview,
}: {
    attachments: CommAttachment[];
    outbound?: boolean;
    onDownload: (attachmentId: string, fileName: string) => void;
    /** Podgląd w CRM-ie (PDF, obrazek, tekst) - z listą plików wiadomości do przechodzenia strzałkami; bez niego wszystko się pobiera. */
    onPreview?: (attachment: CommAttachment, attachments: CommAttachment[]) => void;
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
                        onClick={() => (onPreview && previewable(attachment) ? onPreview(attachment, attachments) : onDownload(attachment.id, attachment.fileName))}
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

interface MailThreadProps {
    messages: CommMessage[];
    phone: boolean;
    onDownload: (attachmentId: string, fileName: string) => void;
    /** Podgląd załącznika w CRM-ie; bez niego załączniki się pobiera. */
    onPreview?: (attachment: CommAttachment, attachments: CommAttachment[]) => void;
    onOpenFull: (messageId: string) => void;
    /** Coś nad rozmową (pasek wizyty, zgłoszenie z formularza). */
    before?: ReactNode;
    loading?: boolean;
    /**
     * Krótka rozmowa przy dolnej krawędzi, tuż nad odpowiedzią (makieta „klient
     * odpisał"). Przy rozwiniętym kompozytorze - od góry (makieta „nowe zapytanie").
     */
    alignBottom?: boolean;
    /**
     * Zdarzenia spoza poczty wpięte w rozmowę w swoim miejscu na osi czasu - np. pasek
     * rezerwacji. Wątek pokazuje wtedy całego leada, a nie tylko maile.
     */
    events?: ConversationEvent[];
}

/** Wątek maila jako sekcje: kto i kiedy w nagłówku, treść pod spodem. Otwiera się na końcu. */
export function MailThread({ messages, phone, onDownload, onPreview, onOpenFull, before, loading, alignBottom = true, events = [] }: MailThreadProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastId = messages[messages.length - 1]?.id;

    // Nowa wiadomość albo otwarcie rozmowy - na dół, tam jest to, na co się odpowiada.
    useEffect(() => {
        const element = scrollRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [lastId]);

    return (
        <ConversationScroll ref={scrollRef} $phone={phone} $bottom={alignBottom} $dense>
            {before}
            {loading && messages.length === 0 && <p style={{ margin: 'auto', color: ix.muted, fontSize: 14 }}>Wczytywanie rozmowy…</p>}
            {withEvents(messages, events).map((item) => {
                if ('node' in item) return <Fragment key={item.key}>{item.node}</Fragment>;
                const message = item;
                const out = message.direction === 'OUTBOUND';
                return (
                    <Section key={message.id} $out={out} $phone={phone} aria-label={out ? 'Wiadomość studia' : 'Wiadomość klienta'}>
                        {/* Data także przy własnej wiadomości: „kiedy odpisaliśmy?" to pierwsze
                            pytanie przy reklamacji, a sam podpis „Ty" na nie nie odpowiadał. */}
                        <p className="head">
                            <span className="who">{out ? 'Ty' : message.fromName ?? message.fromEmail}</span>
                            <span className="when">{messageMoment(message.sentAt)}</span>
                        </p>
                        <div className="text">
                            <MessageBody
                                html={message.bodyHtml ?? ''}
                                cacheKey={message.id}
                                size="bubble"
                                maxHeight={420}
                                compactGraphical
                                onOpenFull={() => onOpenFull(message.id)}
                            />
                        </div>
                        <AttachmentCards attachments={message.attachments} onDownload={onDownload} onPreview={onPreview} />
                        {out && message.sendStatus === 'FAILED' && <p className="failed">Nie wysłano - spróbuj ponownie</p>}
                    </Section>
                );
            })}
        </ConversationScroll>
    );
}
