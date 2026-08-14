import styled from 'styled-components';
import { formatDateTime } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Box, Section, SectionLabel } from './HandoverKit';
import type { VisitComment } from '../../types';

const Note = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-bottom: 9px;
    border-bottom: 1px solid ${st.border};

    &:last-child {
        padding-bottom: 0;
        border-bottom: none;
    }
`;

const NoteHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
`;

const Author = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const When = styled.time`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

const Content = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

interface CustomerNotesSectionProps {
    comments: VisitComment[];
}

/**
 * Notatki przeznaczone dla klienta.
 *
 * To informacja, nie decyzja — dlatego sekcja, a nie krok kreatora z własnym
 * przyciskiem „Kontynuuj". Gdy nie ma czego przekazać, znika w całości zamiast
 * pokazywać pusty stan.
 */
export const CustomerNotesSection = ({ comments }: CustomerNotesSectionProps) => {
    if (comments.length === 0) return null;

    return (
        <Section>
            <SectionLabel>Do przekazania klientowi · {comments.length}</SectionLabel>
            <Box>
                {comments.map(comment => (
                    <Note key={comment.id}>
                        <NoteHead>
                            <Author>{comment.createdByName}</Author>
                            <When>{formatDateTime(comment.createdAt)}</When>
                        </NoteHead>
                        <Content>{comment.content}</Content>
                    </Note>
                ))}
            </Box>
        </Section>
    );
};
