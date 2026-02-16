import styled from 'styled-components';

const Card = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.sm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CardIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.theme.colors.primary}15;
    color: ${props => props.theme.colors.primary};

    svg {
        width: 20px;
        height: 20px;
    }
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
`;

const NotesContent = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
`;

const EmptyState = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
    text-align: center;
    padding: ${props => props.theme.spacing.md} 0;
`;

interface TechnicalNotesCardProps {
    notes: string | null;
}

export const TechnicalNotesCard = ({ notes }: TechnicalNotesCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardIcon>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                </CardIcon>
                <CardTitle>Notatka</CardTitle>
            </CardHeader>

            {notes ? (
                <NotesContent>{notes}</NotesContent>
            ) : (
                <EmptyState>Brak notatki technicznej</EmptyState>
            )}
        </Card>
    );
};
