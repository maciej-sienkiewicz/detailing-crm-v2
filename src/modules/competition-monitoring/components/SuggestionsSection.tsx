import React from 'react';
import styled from 'styled-components';
import { UserPlus, BadgeCheck } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useSuggestions } from '../hooks/useAnalytics';
import { useAddProfile } from '../hooks/useAddProfile';

/**
 * "Zaobserwuj podobne profile" – sugestie z algorytmu Instagrama (related-profiles),
 * ranking wg liczby obserwowanych profili, które je polecają. Klik "Dodaj" przechodzi
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
            {visible.map(suggestion => (
                <Row key={suggestion.username}>
                    <Names>
                        <strong>
                            @{suggestion.username}
                            {suggestion.isVerified && <BadgeCheck />}
                        </strong>
                        <span>
                            {suggestion.fullName ? `${suggestion.fullName} · ` : ''}
                            {suggestion.followerCount != null
                                ? `${new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(suggestion.followerCount)} obs. · `
                                : ''}
                            {suggestion.recommendedByCount > 1
                                ? `podobny do ${suggestion.recommendedByCount} obserwowanych profili`
                                : `podobny do @${suggestion.similarTo}`}
                        </span>
                    </Names>
                    <AddBtn
                        disabled={isAdding}
                        onClick={() => addProfile(suggestion.username)}
                        title="Profil trafi do oczekujących na akceptację"
                    >
                        <UserPlus /> Dodaj
                    </AddBtn>
                </Row>
            ))}
        </Wrap>
    );
};
