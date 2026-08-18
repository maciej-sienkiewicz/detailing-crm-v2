import styled from 'styled-components';
import { MessageSquareQuote } from 'lucide-react';
import { formatDateTime } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Section, SectionLabel } from './HandoverKit';
import type { VisitComment } from '../../types';

/**
 * Ciepłe tło i lewy akcent: to jedyna sekcja, której treść trzeba komuś
 * powiedzieć na głos. Na białym tle wyglądała jak reszta formularza i łatwo
 * ją było minąć wzrokiem w drodze do przycisku.
 */
const NotesBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px 12px 13px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 3px solid ${st.accentAmber};
    border-radius: ${st.radiusSm};
`;

const AmberLabel = styled(SectionLabel)`
    display: flex;
    align-items: center;
    gap: 6px;
    color: #92400e;

    svg { width: 13px; height: 13px; }
`;

const Note = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-bottom: 9px;
    border-bottom: 1px solid #fde68a;

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
    color: #78350f;
`;

const When = styled.time`
    font-size: ${st.fontXs};
    color: #b45309;
    white-space: nowrap;
`;

const Content = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: #713f12;
    line-height: 1.55;
`;

interface CustomerNotesSectionProps {
    comments: VisitComment[];
}

/**
 * Notatki przeznaczone dla klienta.
 *
 * To informacja, nie decyzja, dlatego sekcja, a nie krok kreatora z własnym
 * przyciskiem „Kontynuuj". Gdy nie ma czego przekazać, znika w całości zamiast
 * pokazywać pusty stan.
 */
export const CustomerNotesSection = ({ comments }: CustomerNotesSectionProps) => {
    if (comments.length === 0) return null;

    return (
        <Section>
            <AmberLabel>
                <MessageSquareQuote strokeWidth={2.2} />
                Do przekazania klientowi · {comments.length}
            </AmberLabel>
            <NotesBox>
                {comments.map(comment => (
                    <Note key={comment.id}>
                        <NoteHead>
                            <Author>{comment.createdByName}</Author>
                            <When>{formatDateTime(comment.createdAt)}</When>
                        </NoteHead>
                        <Content>{comment.content}</Content>
                    </Note>
                ))}
            </NotesBox>
        </Section>
    );
};
