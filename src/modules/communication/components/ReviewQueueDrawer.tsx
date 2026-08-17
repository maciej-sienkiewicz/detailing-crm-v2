// src/modules/communication/components/ReviewQueueDrawer.tsx
// Zakładka "Do przejrzenia" (§2.6.5): wątki UNSURE, decyzja jednym kliknięciem.
import { useEffect } from 'react';
import styled from 'styled-components';
import { useReviewDecision, useReviewQueue } from '../hooks';
import { formatDateTime } from '../utils/format';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.24);
`;

const Panel = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    width: 480px;
    max-width: 100%;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
`;

const Header = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
`;

const CloseButton = styled.button`
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    font-size: 16px;
    color: #6b7280;
    cursor: pointer;
    border-radius: 6px;

    &:hover {
        background: #f3f4f6;
    }
`;

const List = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const Row = styled.div`
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Sender = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    display: flex;
    justify-content: space-between;
    gap: 8px;
`;

const When = styled.span`
    font-size: 12px;
    font-weight: 400;
    color: #9ca3af;
    white-space: nowrap;
`;

const Subject = styled.div`
    font-size: 13px;
    color: #1a1a1a;
`;

const Snippet = styled.div`
    font-size: 13px;
    color: #6b7280;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 6px;
`;

const PrimaryButton = styled.button`
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: ${({ theme }) => theme.colors.primary};
    border: none;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
    }
`;

const SecondaryButton = styled.button`
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
    color: #1a1a1a;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
    }
`;

const EmptyInfo = styled.div`
    padding: 32px 16px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
`;

export const ReviewQueueDrawer = ({ onClose }: { onClose: () => void }) => {
    const { data, isLoading } = useReviewQueue();
    const decision = useReviewDecision();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const items = data?.items ?? [];

    return (
        <>
            <Overlay onClick={onClose} />
            <Panel role="dialog" aria-modal="true" aria-label="Do przejrzenia">
                <Header>
                    <Title>Do przejrzenia</Title>
                    <CloseButton onClick={onClose} aria-label="Zamknij">✕</CloseButton>
                </Header>
                <List>
                    {!isLoading && items.length === 0 && (
                        <EmptyInfo>Nic do przejrzenia — wszystkie wiadomości rozpoznane.</EmptyInfo>
                    )}
                    {items.map((item) => (
                        <Row key={item.threadId}>
                            <Sender>
                                {item.fromName ?? item.fromEmail}
                                <When>{formatDateTime(item.receivedAt)}</When>
                            </Sender>
                            {item.subject && <Subject>{item.subject}</Subject>}
                            <Snippet>{item.snippet}</Snippet>
                            <Actions>
                                <PrimaryButton
                                    disabled={decision.isPending}
                                    onClick={() => decision.mutate({ threadId: item.threadId, decision: 'INQUIRY' })}
                                >
                                    To zapytanie
                                </PrimaryButton>
                                <SecondaryButton
                                    disabled={decision.isPending}
                                    onClick={() => decision.mutate({ threadId: item.threadId, decision: 'IGNORE_SENDER' })}
                                >
                                    Ignoruj nadawcę
                                </SecondaryButton>
                            </Actions>
                        </Row>
                    ))}
                </List>
            </Panel>
        </>
    );
};
