
import styled from 'styled-components';
import { formatDateTime } from '@/common/utils';
import type { VisitComment } from '../../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const Description = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
`;

const NotesSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const SectionHeader = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: var(--brand-primary);
    }
`;

const NotesList = styled.div`
    max-height: 400px;
    overflow-y: auto;
`;

const NoteCard = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background 0.2s ease;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${props => props.theme.colors.surfaceAlt};
    }
`;

const NoteHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.sm};
    gap: ${props => props.theme.spacing.sm};
`;

const NoteAuthor = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const NoteDate = styled.time`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const NoteContent = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
`;

const NoteTag = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: #166534;
    margin-top: ${props => props.theme.spacing.sm};
`;

const EmptyState = styled.div`
    padding: ${props => props.theme.spacing.xxl};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const InfoIcon = styled.div`
    font-size: 20px;
    flex-shrink: 0;
`;

const InfoText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #78350f;
    line-height: 1.5;
`;

interface ClientBriefingStepProps {
    comments: VisitComment[];
    onContinue: () => void;
}

export const ClientBriefingStep = ({ comments }: ClientBriefingStepProps) => {
    return (
        <Container>
            <Description>
                Przed wydaniem pojazdu zapoznaj się z wszystkimi komentarzami przeznaczonymi
                dla klienta. Upewnij się, że przekazałeś wszystkie istotne informacje.
            </Description>

            <NotesSection>
                <SectionHeader>
                    <SectionTitle>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Komentarze dla klienta ({comments.length})
                    </SectionTitle>
                </SectionHeader>

                <NotesList>
                    {comments.length === 0 ? (
                        <EmptyState>
                            <EmptyIcon>📋</EmptyIcon>
                            <EmptyText>
                                Brak komentarzy przeznaczonych do przekazania klientowi
                            </EmptyText>
                        </EmptyState>
                    ) : (
                        comments.map(comment => (
                            <NoteCard key={comment.id}>
                                <NoteHeader>
                                    <NoteAuthor>{comment.createdByName}</NoteAuthor>
                                    <NoteDate>{formatDateTime(comment.createdAt)}</NoteDate>
                                </NoteHeader>
                                <NoteContent>{comment.content}</NoteContent>
                                <NoteTag>
                                    👤 Dla klienta
                                </NoteTag>
                            </NoteCard>
                        ))
                    )}
                </NotesList>
            </NotesSection>

            {comments.length > 0 && (
                <InfoBox>
                    <InfoIcon>💡</InfoIcon>
                    <InfoText>
                        <strong>Przypomnienie:</strong> Omów wszystkie powyższe punkty z klientem
                        podczas wydania pojazdu. Upewnij się, że klient jest świadomy wszystkich
                        wykonanych prac i ewentualnych uwag technicznych.
                    </InfoText>
                </InfoBox>
            )}
        </Container>
    );
};
