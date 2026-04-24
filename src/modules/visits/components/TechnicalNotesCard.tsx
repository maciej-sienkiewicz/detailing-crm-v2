import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const BRAND = '#0ea5e9';
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 13px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const CardIconWrap = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, ${BRAND} 0%, #0284c7 100%);
    color: white;
    flex-shrink: 0;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.1px;
`;

const CardBody = styled.div`
    padding: 14px 16px;
`;

const NotesContent = styled.div`
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 10px 12px;
    background: ${BRAND_DIM};
    border: 1px solid rgba(14, 165, 233, 0.15);
    border-left: 3px solid ${BRAND};
    border-radius: 8px;
`;

const EmptyState = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    font-style: italic;
    text-align: center;
    padding: 12px 0;
`;

interface TechnicalNotesCardProps {
    notes: string | null;
}

export const TechnicalNotesCard = ({ notes }: TechnicalNotesCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardIconWrap aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </CardIconWrap>
                <CardTitle>Notatka techniczna</CardTitle>
            </CardHeader>

            <CardBody>
                {notes ? (
                    <NotesContent>{notes}</NotesContent>
                ) : (
                    <EmptyState>Brak notatki technicznej</EmptyState>
                )}
            </CardBody>
        </Card>
    );
};
