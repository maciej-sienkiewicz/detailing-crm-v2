// src/modules/comms/components/InstagramConversation.tsx
// Rozmowa sprawy z Instagrama w skrzynce „Zapytania": dymki i pole odpowiedzi.
//
// Osobne od rozmowy mailowej (Bubbles + ReplyComposer), bo wiadomość prywatna nie
// jest listem: nie ma tematu, stopki, HTML-a ani załącznika do pobrania z naszej
// skrzynki - zdjęcie leży na serwerach Meta pod adresem, który po kilku dniach
// wygasa. Wygląd zostaje ten sam co w poczcie (klient po lewej, „Ty" po prawej),
// żeby sprawa czytała się tak samo niezależnie od kanału.
//
// Pole odpowiedzi stoi zawsze rozwinięte: wiadomość na Instagramie to jedno, dwa
// zdania, a zwinięcie dokładało kliknięcie do każdej z nich. Przycisk „Wyślij" ma
// wypełnienie tylko wtedy, gdy odpowiedź jest krokiem następnym sprawy - tak samo
// jak w kompozytorze poczty (CLAUDE.md §2).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { ExternalLink, Image as ImageIcon, Instagram, Send } from 'lucide-react';
import { ButtonLink, Notice } from '@/common/components/ui';
import type { InstagramDmConversation, InstagramDmMessage } from '../types';
import { useInstagramReply } from '../hooks/useInstagramDm';
import {
    INSTAGRAM_REPLY_MAX,
    describeAttachments,
    instagramChatUrl,
    replyDeadlineLabel,
} from '../utils/instagramDm';
import { ConversationScroll } from '../inbox/Conversation';
import { messageMoment } from '../inbox/messageFormat';
import { PillPrimary, TintBtn } from '../inbox/primitives';
import { ix } from '../inbox/tokens';

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
        font-size: 15px;
        line-height: 22px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .kind {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: ${ix.text2};
        svg { width: 15px; height: 15px; }
    }
`;

/** Zdjęcie od klienta: miniatura z odnośnikiem; po wygaśnięciu adresu zostaje sam opis. */
const Photo = styled.a`
    display: block;
    margin-top: 8px;
    max-width: 240px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid ${ix.line};

    img { display: block; width: 100%; height: auto; }
`;

const Channel = styled.p`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: center;
    margin: 0;
    font-size: 12px;
    color: ${ix.muted};

    svg { width: 14px; height: 14px; }
`;

const Muted = styled.p`
    margin: auto;
    font-size: 14px;
    color: ${ix.muted};
`;

function MessagePhotos({ message }: { message: InstagramDmMessage }) {
    const [broken, setBroken] = useState<Record<string, boolean>>({});
    const images = message.attachments.filter((item) => item.type === 'image' && item.url);
    return (
        <>
            {images.map((item) =>
                broken[item.url!] ? null : (
                    <Photo key={item.url} href={item.url!} target="_blank" rel="noopener noreferrer">
                        <img
                            src={item.url!}
                            alt="Zdjęcie od klienta"
                            loading="lazy"
                            onError={() => setBroken((current) => ({ ...current, [item.url!]: true }))}
                        />
                    </Photo>
                )
            )}
        </>
    );
}

interface BubblesProps {
    conversation: InstagramDmConversation | null | undefined;
    loading: boolean;
    phone: boolean;
}

/** Rozmowa jako dymki, otwiera się na ostatniej wiadomości - tej, na którą się odpowiada. */
export function InstagramBubbles({ conversation, loading, phone }: BubblesProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const messages = conversation?.messages ?? [];
    const lastId = messages[messages.length - 1]?.id;
    useEffect(() => {
        const element = scrollRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [lastId]);

    const who = conversation?.thread.username ? `@${conversation.thread.username}` : 'klientem';

    return (
        <ConversationScroll ref={scrollRef} $phone={phone}>
            {loading && messages.length === 0 && <Muted>Wczytywanie rozmowy…</Muted>}
            {!loading && messages.length === 0 && <Muted>Brak wiadomości w tej rozmowie.</Muted>}
            {messages.length > 0 && (
                <Channel><Instagram aria-hidden="true" /> Rozmowa z {who} na Instagramie</Channel>
            )}
            {messages.map((message) => {
                const out = message.direction === 'OUTBOUND';
                const text = message.text?.trim();
                return (
                    <Bubble key={message.id} $out={out} $phone={phone}>
                        <p className="label">
                            {out ? (message.sentByName ? `Ty (${message.sentByName})` : 'Ty, z aplikacji Instagram') : messageMoment(message.sentAt)}
                        </p>
                        <div className="body">
                            {text || (
                                <span className="kind">
                                    <ImageIcon aria-hidden="true" /> {describeAttachments(message.attachments)}
                                </span>
                            )}
                        </div>
                        <MessagePhotos message={message} />
                    </Bubble>
                );
            })}
        </ConversationScroll>
    );
}

const Box = styled.div<{ $phone: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
    padding: ${p => (p.$phone ? '12px 16px calc(16px + env(safe-area-inset-bottom, 0px))' : '16px 28px 24px')};
    border-top: 1px solid ${ix.lineSoft};
    background: #ffffff;
`;

const Field = styled.textarea`
    width: 100%;
    min-height: 72px;
    max-height: 220px;
    resize: vertical;
    padding: 12px 16px;
    border: 1px solid ${ix.line};
    border-radius: 16px;
    background: #ffffff;
    color: ${ix.ink};
    font-family: inherit;
    font-size: 15px;
    line-height: 22px;
    box-sizing: border-box;

    &::placeholder { color: ${ix.faint}; }
    &:focus { outline: none; border-color: ${ix.accent}; }
    &:disabled { background: ${ix.surfaceSoft}; }
`;

const Bar = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px 12px;

    .deadline { margin-right: auto; font-size: 13px; color: ${ix.muted}; }
    .deadline[data-soon='true'] { color: ${ix.late}; font-weight: 600; }
    .count { font-size: 12px; color: ${ix.muted}; font-variant-numeric: tabular-nums; }
    .count[data-over='true'] { color: ${ix.late}; font-weight: 600; }
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ix.late};
`;

interface ReplyBoxProps {
    leadId: string;
    conversation: InstagramDmConversation;
    /** Odpowiedź jest krokiem następnym sprawy - jedyne wypełnienie w oknie. */
    emphasis: 'primary' | 'tint';
    phone: boolean;
    /** Krok następny nad polem na telefonie (gdy nim nie jest odpowiedź). */
    barExtra?: ReactNode;
    onSent?: () => void;
}

/** Ile znaków przed limitem zaczynamy pokazywać licznik - wcześniej to szum. */
const COUNTER_FROM = 800;

const errorMessage = (error: unknown): string =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Nie udało się wysłać. Spróbuj ponownie albo odpisz w aplikacji Instagram.';

export function InstagramReplyBox({ leadId, conversation, emphasis, phone, barExtra, onSent }: ReplyBoxProps) {
    const reply = useInstagramReply(leadId);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Termin liczony co pół minuty: w ostatniej godzinie mówimy „jeszcze przez 25 min",
    // a liczba stojąca w miejscu przez kwadrans byłaby kłamstwem.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const { thread } = conversation;
    const chatUrl = instagramChatUrl(thread.username, conversation.profileUrl);
    const deadline = replyDeadlineLabel(thread.replyDeadline, now);
    const open = conversation.canReply && deadline !== null;
    const soon = open && thread.replyDeadline !== null && new Date(thread.replyDeadline).getTime() - now.getTime() < 3 * 3_600_000;

    if (!open) {
        return (
            <Box $phone={phone}>
                {barExtra}
                <Notice
                    tone="info"
                    title="Z CRM nie da się już odpisać"
                    action={chatUrl ? (
                        <ButtonLink
                            href={chatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            $variant={emphasis === 'primary' ? 'primary' : 'tinted'}
                            $size="sm"
                        >
                            <ExternalLink /> Odpisz w aplikacji Instagram
                        </ButtonLink>
                    ) : undefined}
                >
                    Minęły 24 godziny od ostatniej wiadomości klienta. Instagram pozwala teraz odpowiedzieć tylko w aplikacji.
                </Notice>
            </Box>
        );
    }

    const trimmed = text.trim();
    const over = text.length > INSTAGRAM_REPLY_MAX;
    const disabled = reply.isPending || trimmed.length === 0 || over;

    const send = () => {
        if (disabled) return;
        setError(null);
        reply.mutate(
            { threadId: thread.id, text: trimmed },
            {
                onSuccess: () => {
                    setText('');
                    onSent?.();
                },
                onError: (failure) => setError(errorMessage(failure)),
            }
        );
    };

    const label = reply.isPending ? 'Wysyłanie…' : 'Wyślij';

    return (
        <Box $phone={phone}>
            {barExtra}
            <Field
                aria-label={thread.username ? `Odpowiedź do @${thread.username}` : 'Odpowiedź na Instagramie'}
                placeholder="Napisz odpowiedź na Instagramie…"
                value={text}
                disabled={reply.isPending}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    // Ctrl/Cmd+Enter jak w poczcie; sam Enter to nowa linia, nie wysyłka.
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        send();
                    }
                }}
            />
            {error && <ErrorText role="alert">{error}</ErrorText>}
            <Bar>
                <span className="deadline" data-soon={soon}>{deadline}</span>
                {text.length >= COUNTER_FROM && (
                    <span className="count" data-over={over}>{text.length} / {INSTAGRAM_REPLY_MAX}</span>
                )}
                {emphasis === 'primary' ? (
                    <PillPrimary onClick={send} disabled={disabled}><Send /> {label}</PillPrimary>
                ) : (
                    <TintBtn $h={40} onClick={send} disabled={disabled}><Send /> {label}</TintBtn>
                )}
            </Bar>
        </Box>
    );
}
