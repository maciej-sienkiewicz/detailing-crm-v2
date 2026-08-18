// src/modules/comms/components/MessageReaderOverlay.tsx
// Pełny podgląd jednej wiadomości: nakładka na całą szerokość obszaru skrzynki,
// z własnym scrollem. Newslettery i oferty potrafią mieć kilka ekranów treści —
// tu czyta się je bez walki z listą wątków obok.
import { useEffect } from 'react';
import styled from 'styled-components';
import { Download, X } from 'lucide-react';
import type { CommMessage } from '../types';
import { MessageBody } from './MessageBody';
import { IconButton, formatDateTime } from './shared';

const Overlay = styled.div`
    position: absolute;
    inset: 0;
    z-index: 40;
    background: ${p => p.theme.colors.surface};
    display: flex;
    flex-direction: column;
    min-height: 0;
`;

const Header = styled.header`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};

    .titles { flex: 1; min-width: 0; }
    h3 {
        margin: 0 0 2px;
        font-size: 16px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow-wrap: anywhere;
    }
    .sub {
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
        overflow-wrap: anywhere;
    }
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    justify-content: center;
`;

const Sheet = styled.div`
    width: 100%;
    max-width: 900px;
`;

const AttachmentRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px 20px;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const AttachmentChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

interface MessageReaderOverlayProps {
    message: CommMessage;
    onClose: () => void;
    onDownloadAttachment: (attachmentId: string, fileName: string) => void;
}

export function MessageReaderOverlay({
    message,
    onClose,
    onDownloadAttachment,
}: MessageReaderOverlayProps) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <Overlay role="dialog" aria-modal="true" aria-label="Pełny podgląd wiadomości">
            <Header>
                <div className="titles">
                    <h3>{message.subject ?? '(bez tematu)'}</h3>
                    <div className="sub">
                        {message.direction === 'OUTBOUND' ? 'Ty' : message.fromName ?? message.fromEmail}
                        {' · '}
                        {message.fromEmail}
                        {' · '}
                        {formatDateTime(message.sentAt)}
                    </div>
                </div>
                <IconButton onClick={onClose} aria-label="Zamknij podgląd" style={{ padding: 7 }}>
                    <X />
                </IconButton>
            </Header>

            <Body>
                <Sheet>
                    {message.bodyHtml && <MessageBody html={message.bodyHtml} />}
                </Sheet>
            </Body>

            {message.attachments.length > 0 && (
                <AttachmentRow>
                    {message.attachments.map((attachment) => (
                        <AttachmentChip
                            key={attachment.id}
                            onClick={() => onDownloadAttachment(attachment.id, attachment.fileName)}
                        >
                            <Download size={12} />
                            {attachment.fileName}
                        </AttachmentChip>
                    ))}
                </AttachmentRow>
            )}
        </Overlay>
    );
}
