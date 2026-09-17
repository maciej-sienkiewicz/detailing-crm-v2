import styled from 'styled-components';
import { Star } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Row = styled.div<{ $interactive?: boolean }>`
    display: inline-flex;
    gap: 2px;
    ${p => p.$interactive && 'cursor: pointer;'}
`;

const StarBtn = styled.button`
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    display: inline-flex;
    color: ${st.accentAmber};
`;

interface Props {
    value: number | null;
    size?: number;
    onChange?: (rating: number) => void;
}

// Gwiazdki niosą odcień (bursztyn = ocena), nie wypełnienie priorytetu. Puste gwiazdki
// to obwódka, wypełnione to nasycenie — spójne z regułą „odcień, nie remis".
export function ProductRatingStars({ value, size = 16, onChange }: Props) {
    const filled = value ?? 0;
    const stars = [1, 2, 3, 4, 5];
    if (!onChange) {
        return (
            <Row aria-label={value ? `Ocena ${value} na 5` : 'Brak oceny'}>
                {stars.map(n => (
                    <Star
                        key={n}
                        size={size}
                        color={st.accentAmber}
                        fill={n <= filled ? st.accentAmber : 'none'}
                    />
                ))}
            </Row>
        );
    }
    return (
        <Row $interactive>
            {stars.map(n => (
                <StarBtn key={n} type="button" onClick={() => onChange(n)} aria-label={`Oceń na ${n}`}>
                    <Star size={size} color={st.accentAmber} fill={n <= filled ? st.accentAmber : 'none'} />
                </StarBtn>
            ))}
        </Row>
    );
}
