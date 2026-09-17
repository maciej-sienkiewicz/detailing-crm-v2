import styled from 'styled-components';
import { Star, Package } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProductListItem } from '../types';
import { formatPackage, formatPrice } from '../utils/productFormat';

const Table = styled.table` width: 100%; border-collapse: collapse; font-size: 14px; `;
const Th = styled.th<{ $right?: boolean }>`
    text-align: ${p => (p.$right ? 'right' : 'left')};
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 600;
    color: ${st.textMuted};
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;
const Tr = styled.tr` cursor: pointer; &:hover { background: ${st.bgCardAlt}; } `;
const Td = styled.td<{ $right?: boolean }>`
    padding: 12px 16px;
    text-align: ${p => (p.$right ? 'right' : 'left')};
    border-bottom: 1px solid ${st.border};
    color: ${st.text};
    vertical-align: middle;
`;
const NameCell = styled.div` display: flex; align-items: center; gap: 10px; `;
const Thumb = styled.div`
    width: 34px; height: 34px; flex-shrink: 0;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    display: flex; align-items: center; justify-content: center;
    color: ${st.textMuted};
`;
const NameMain = styled.div` display: flex; flex-direction: column; min-width: 0; `;
const NameTitle = styled.span` font-weight: 600; color: ${st.text}; display: flex; align-items: center; gap: 8px; `;
const NameSub = styled.span` font-size: 12px; color: ${st.textMuted}; `;
const Muted = styled.span` color: ${st.textMuted}; `;
const StarWrap = styled.span` display: inline-flex; align-items: center; gap: 4px; color: ${st.accentAmber}; `;

interface Props {
    products: ProductListItem[];
    canSeeCosts: boolean;
    onOpen: (id: string) => void;
}

export function ProductTable({ products, canSeeCosts, onOpen }: Props) {
    return (
        <Table>
            <thead>
                <tr>
                    <Th>Produkt</Th>
                    <Th>Producent</Th>
                    <Th>Opakowanie</Th>
                    {canSeeCosts && <Th $right>Cena jedn.</Th>}
                    <Th $right>Ocena</Th>
                </tr>
            </thead>
            <tbody>
                {products.map(p => (
                    <Tr key={p.id} onClick={() => onOpen(p.id)}>
                        <Td>
                            <NameCell>
                                <Thumb><Package size={18} /></Thumb>
                                <NameMain>
                                    <NameTitle>
                                        {p.name}
                                    </NameTitle>
                                    <NameSub>{p.brand}</NameSub>
                                </NameMain>
                            </NameCell>
                        </Td>
                        <Td><Muted>{p.manufacturerName}</Muted></Td>
                        <Td>{formatPackage(p.packageSizeValue, p.packageSizeUnit)}</Td>
                        {canSeeCosts && (
                            <Td $right>{p.price ? formatPrice(p.price) : <Muted>—</Muted>}</Td>
                        )}
                        <Td $right>
                            {p.ratingValue
                                ? <StarWrap><Star size={14} fill={st.accentAmber} color={st.accentAmber} /> {p.ratingValue}</StarWrap>
                                : <Muted>—</Muted>}
                        </Td>
                    </Tr>
                ))}
            </tbody>
        </Table>
    );
}
