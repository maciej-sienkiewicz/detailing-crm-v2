import styled from 'styled-components';
import { Star, Package } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProductListItem } from '../types';
import { formatPackage, formatPrice } from '../utils/productFormat';

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    padding: 12px;
`;
const Card = styled.button`
    text-align: left;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 14px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: inherit;
    &:hover { border-color: ${st.borderHover}; box-shadow: ${st.shadowSm}; }
`;
const Top = styled.div` display: flex; align-items: center; gap: 10px; `;
const Thumb = styled.div`
    width: 40px; height: 40px; flex-shrink: 0;
    border-radius: ${st.radiusSm}; background: ${st.bgCardAlt};
    display: flex; align-items: center; justify-content: center; color: ${st.textMuted};
`;
const Title = styled.div` font-weight: 600; color: ${st.text}; font-size: 14px; `;
const Sub = styled.div` font-size: 12px; color: ${st.textMuted}; `;
const Meta = styled.div` display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: ${st.textSecondary}; `;
const StarWrap = styled.span` display: inline-flex; align-items: center; gap: 4px; color: ${st.accentAmber}; `;

interface Props {
    products: ProductListItem[];
    canSeeCosts: boolean;
    onOpen: (id: string) => void;
}

export function ProductGrid({ products, canSeeCosts, onOpen }: Props) {
    return (
        <Grid>
            {products.map(p => (
                <Card key={p.id} type="button" onClick={() => onOpen(p.id)}>
                    <Top>
                        <Thumb><Package size={20} /></Thumb>
                        <div style={{ minWidth: 0 }}>
                            <Title>{p.name}</Title>
                            <Sub>{p.brand}</Sub>
                        </div>
                    </Top>
                    <Meta>
                        <span>{formatPackage(p.packageSizeValue, p.packageSizeUnit)}</span>
                        {p.ratingValue
                            ? <StarWrap><Star size={13} fill={st.accentAmber} color={st.accentAmber} /> {p.ratingValue}</StarWrap>
                            : null}
                    </Meta>
                    {canSeeCosts && p.price && <Meta><span>{formatPrice(p.price)}</span></Meta>}
                </Card>
            ))}
        </Grid>
    );
}
