import React from 'react';
import styled from 'styled-components';
import { UserPlus, BadgeCheck, MapPin } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Button, ui } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { useSuggestions } from '../hooks/useAnalytics';
import { useAddProfile } from '../hooks/useAddProfile';
import { suggestionCategoryLabel } from '../utils/suggestions';
import { PHONE } from '../utils/phone';

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

    /*
     * Na telefonie sekcja stoi w szufladzie pod grupami „Twój profil" i „Konkurenci":
     * nagłówek i wiersze wyglądają jak tamte, a nie jak dawny motyw statystyk obok nich.
     */
    ${PHONE} {
        margin: 0;
        font-size: 15px;
        color: ${ui.ink};

        svg { width: 16px; height: 16px; color: ${ui.brandInk}; }
    }
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

    ${PHONE} {
        gap: 12px;
        padding: 10px 12px;
        background: ${ui.surface};
        border: 1px solid ${ui.line};
        border-radius: ${ui.radiusStrip};
    }
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

    ${PHONE} {
        gap: 2px;

        strong { display: inline; font-size: 14px; color: ${ui.ink}; }
        strong svg { display: inline-block; width: 14px; height: 14px; color: ${ui.brandInk}; vertical-align: -2px; margin-left: 4px; }
        /* Pełne zdania zamiast „podobny do 3 obserwowanych pro…" - miejsca jest na drugą linię. */
        span { font-size: 12px; color: ${ui.textMuted}; white-space: normal; }
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

    ${PHONE} {
        color: ${ui.brandInk} !important;

        svg { width: 12px; height: 12px; }
    }
`;

const Hint = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};

    ${PHONE} { font-size: 13px; line-height: 1.45; color: ${ui.textMuted}; }
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

const AddPhone = styled(Button)`
    margin-left: auto;
    flex-shrink: 0;
`;

/**
 * Uchwyt łamany po „_" i „." zamiast w środku słowa: obok przycisku „Dodaj" długa nazwa
 * na 360 px kończyła się samotnym „a" w drugiej linii („@auto_kosmetyka_lesznowol / a").
 */
const BreakableHandle: React.FC<{ username: string }> = ({ username }) => (
    <>
        @{(username.match(/[^._]+[._]*|[._]+/g) ?? [username]).map((part, i) => (
            <React.Fragment key={i}>{i > 0 && <wbr />}{part}</React.Fragment>
        ))}
    </>
);

export const SuggestionsSection: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const isDesktop = useBreakpoint('md');
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
                            {isDesktop ? `@${suggestion.username}` : <BreakableHandle username={suggestion.username} />}
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
                    {isDesktop ? (
                        <AddBtn
                            disabled={isAdding}
                            onClick={() => addProfile({ username: suggestion.username })}
                            title="Dodaj do konkurentów"
                        >
                            <UserPlus /> Dodaj
                        </AddBtn>
                    ) : (
                        // Pigułka z napisem 11 px, wysoka na 24 px i wypełniana dopiero po najechaniu,
                        // to pod palcem za mały cel bez stanu: na telefonie przycisk z odcieniem marki, 44 px.
                        <AddPhone
                            size="sm"
                            variant="tinted"
                            disabled={isAdding}
                            onClick={() => addProfile({ username: suggestion.username })}
                            aria-label={`Dodaj @${suggestion.username} do konkurentów`}
                        >
                            <UserPlus /> Dodaj
                        </AddPhone>
                    )}
                </Row>
            ))}
        </Wrap>
    );
};
