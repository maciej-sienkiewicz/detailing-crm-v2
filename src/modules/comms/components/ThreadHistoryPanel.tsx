// src/modules/comms/components/ThreadHistoryPanel.tsx
// Panel boczny: pozostałe rozmowy z tym samym adresem.
//
// Wysuwa się ZAWSZE po kliknięciu plakietki — także wtedy, gdy innych rozmów nie ma.
// Plakietka, która raz reaguje na kliknięcie, a raz nie, uczy, że bywa zepsuta; pusty
// panel z jednym zdaniem jest odpowiedzią, brak reakcji nie jest żadną.
//
// Zamykanie: krzyżyk, Escape i kliknięcie w tło — trzy drogi, bo panel przykrywa
// treść, którą się właśnie czyta.
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Mail, Sparkles, X } from 'lucide-react';
import { useRelatedThreads } from '../hooks/useComms';
import { formatDateTime } from './shared';

const slideIn = keyframes`
    from { transform: translateX(16px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
`;

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(15, 23, 42, 0.18);
`;

const Panel = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 91;
    width: 380px;
    max-width: 100vw;
    background: ${p => p.theme.colors.surface};
    border-left: 1px solid ${p => p.theme.colors.border};
    box-shadow: -18px 0 48px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    animation: ${slideIn} 160ms ease-out;
`;

const Head = styled.header`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 18px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    .titles { flex: 1; min-width: 0; }
    h3 {
        margin: 0;
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .sub {
        margin-top: 2px;
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    button {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: ${p => p.theme.radii.full};
        background: ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.textMuted};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all ${p => p.theme.transitions.fast};

        &:hover { background: ${p => p.theme.colors.surfaceHover}; color: ${p => p.theme.colors.text}; }
    }
`;

const List = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px 12px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ThreadCard = styled.button`
    display: block;
    width: 100%;
    text-align: left;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    padding: 10px 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: ${p => p.theme.colors.textMuted};
        background: ${p => p.theme.colors.surfaceHover};
    }

    .top {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .subject {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .lead {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: #15803d;
        background: #f0fdf4;
        border-radius: ${p => p.theme.radii.full};
        padding: 1px 7px;
    }
    .snippet {
        margin-top: 4px;
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
        line-height: 1.45;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .meta {
        margin-top: 6px;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        display: flex;
        align-items: center;
        gap: 6px;
    }
`;

const Empty = styled.div`
    padding: 28px 16px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: 13px;
    line-height: 1.6;
`;

interface ThreadHistoryPanelProps {
    threadId: string;
    email: string;
    onClose: () => void;
}

export function ThreadHistoryPanel({ threadId, email, onClose }: ThreadHistoryPanelProps) {
    const [, setSearchParams] = useSearchParams();
    const { data: threads, isLoading } = useRelatedThreads(threadId);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const openThread = (id: string) => {
        setSearchParams({ thread: id }, { replace: false });
        onClose();
    };

    return (
        <>
            <Backdrop onClick={onClose} />
            <Panel role="dialog" aria-label="Historia korespondencji">
                <Head>
                    <div className="titles">
                        <h3>Historia korespondencji</h3>
                        <div className="sub" title={email}>{email}</div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Zamknij">
                        <X size={15} />
                    </button>
                </Head>

                <List>
                    {isLoading && <Empty>Wczytywanie…</Empty>}
                    {!isLoading && (threads ?? []).length === 0 && (
                        <Empty>
                            To pierwsza rozmowa z tym adresem.
                            <br />
                            Wcześniejszych nie mamy.
                        </Empty>
                    )}
                    {(threads ?? []).map((thread) => (
                        <ThreadCard key={thread.id} type="button" onClick={() => openThread(thread.id)}>
                            <div className="top">
                                <span className="subject">{thread.subject ?? '(bez tematu)'}</span>
                                {thread.leadId && (
                                    <span className="lead">
                                        <Sparkles size={9} /> Lead
                                    </span>
                                )}
                            </div>
                            {thread.lastSnippet && <div className="snippet">{thread.lastSnippet}</div>}
                            <div className="meta">
                                <Mail size={11} />
                                {formatDateTime(thread.lastMessageAt)}
                                {thread.messageCount > 1 && <> · {thread.messageCount} wiadomości</>}
                                {thread.archived && <> · zarchiwizowany</>}
                            </div>
                        </ThreadCard>
                    ))}
                </List>
            </Panel>
        </>
    );
}
