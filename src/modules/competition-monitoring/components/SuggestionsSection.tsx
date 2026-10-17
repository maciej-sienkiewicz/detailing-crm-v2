import React from 'react';
import styled from 'styled-components';
import { UserPlus, BadgeCheck, MapPin } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useSuggestions } from '../hooks/useAnalytics';
import { useAddProfile } from '../hooks/useAddProfile';
import { suggestionCategoryLabel } from '../utils/suggestions';

/**
 * "Zaobserwuj podobne profile": sugestie z algorytmu Instagrama (related-profiles),
 * przefiltrowane na serwerze do publicznych kont firmowych z branży - sam algorytm
 * Instagrama podsuwał prywatne konta znajomych właściciela. Najpierw konta z miejscowości
 * studia, potem polecane przez więcej obserwowanych profili. Klik "Dodaj" przechodzi
 * przez normalny flow moderacji (profil trafia do oczekujących).
 */

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Heading = styled.h3`
    margin: 8px 0 2px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 6px;

    svg { width: 14px; height: 14px; color: ${st.accentBlue}; }
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: ${st.bgCard};
    border: 1px dashed ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
`;

const Names = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;

    strong {
        color: ${st.text};
        display: inline-flex;
        align-items: center;
        gap: 4px;
        svg { width: 12px; height: 12px; color: ${st.accentBlue}; }
    }
    span {
        color: ${st.textMuted};
        font-size: ${st.fontXs};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/** Atrybuty sugestii jako osobne elementy z odstępem, bez kropek jako kleju. */
const Meta = styled.div`
    display: flex;
    gap: 4px 8px;
    flex-wrap: wrap;
    min-width: 0;

    span { min-width: 0; }
`;

const Nearby = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: ${st.accentBlue} !important;
    font-weight: 600;

    svg { width: 11px; height: 11px; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const AddBtn = styled.button`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.accentBlue};
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 700;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover { background: ${st.accentBlue}; color: #fff; }
    &:disabled { opacity: 0.5; cursor: default; }

    svg { width: 12px; height: 12px; }
`;

export const SuggestionsSection: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { data: suggestions } = useSuggestions();
    const { addProfile, isAdding } = useAddProfile();

    if (!suggestions || suggestions.length === 0) return null;

    const visible = compact ? suggestions.slice(0, 3) : suggestions;

    return (
        <Wrap>
            <Heading>
                <UserPlus /> Zaobserwuj podobne profile
            </Heading>
            <Hint>Publiczne konta firm z branży, które Instagram łączy z Twoimi obserwowanymi.</Hint>
            {visible.map(suggestion => (
                <Row key={suggestion.username}>
                    <Names>
                        <strong>
                            @{suggestion.username}
                            {suggestion.isVerified && <BadgeCheck />}
                        </strong>
                        <Meta>
                            {suggestion.nearby && <Nearby><MapPin /> w Twojej okolicy</Nearby>}
                            {suggestionCategoryLabel(suggestion.category) && <span>{suggestionCategoryLabel(suggestion.category)}</span>}
                            {suggestion.fullName && <span>{suggestion.fullName}</span>}
                            {suggestion.followerCount != null && (
                                <span>
                                    {new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(suggestion.followerCount)}{' '}
                                    obserwujących
                                </span>
                            )}
                            <span>
                                {suggestion.recommendedByCount > 1
                                    ? `podobny do ${suggestion.recommendedByCount} obserwowanych profili`
                                    : `podobny do @${suggestion.similarTo}`}
                            </span>
                        </Meta>
                    </Names>
                    <AddBtn
                        disabled={isAdding}
                        onClick={() => addProfile({ username: suggestion.username })}
                        title="Dodaj do konkurentów"
                    >
                        <UserPlus /> Dodaj
                    </AddBtn>
                </Row>
            ))}
        </Wrap>
    );
};
