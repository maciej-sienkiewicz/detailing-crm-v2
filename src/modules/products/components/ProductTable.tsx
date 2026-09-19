import styled from 'styled-components';
import { Package } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProductListItem } from '../types';
import { formatLastUsed, formatPackage, formatPrice, formatUsageDate } from '../utils/productFormat';
import { ProductRatingCompact } from './ProductRatingStars';

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

/**
 * Kolumna „Użycie": ile wizyt, a pod spodem kiedy ostatnio.
 *
 * Tabela produktów miała cztery kolumny na całą szerokość ekranu i żadna nie
 * odpowiadała na pytanie, z którym właściciel do niej wchodzi: czy ten preparat
 * w ogóle idzie w ruch. Cena i opakowanie opisują pozycję w katalogu, ocena to
 * opinia zespołu - dopiero liczba wizyt mówi, czy produkt zarabia na półkę.
 *
 * Dwie liczby w jednej kolumnie, nie w dwóch: „12" bez „ostatnio w maju" myli
 * produkt używany co tydzień z takim, który wyszedł z obiegu rok temu.
 */
const UsageCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    line-height: 1.25;
`;
const UsageCount = styled.span`
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;
const UsageWhen = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    white-space: nowrap;
`;

const visitWord = (n: number): string => {
    if (n === 1) return 'wizyta';
    const last = n % 10;
    const lastTwo = n % 100;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? 'wizyty' : 'wizyt';
};

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
                    <Th>Opakowanie</Th>
                    {canSeeCosts && <Th $right>Cena jedn.</Th>}
                    <Th $right>Użycie</Th>
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
                        <Td>{formatPackage(p.packageSizeValue, p.packageSizeUnit)}</Td>
                        {canSeeCosts && (
                            <Td $right>{p.price ? formatPrice(p.price) : <Muted>—</Muted>}</Td>
                        )}
                        <Td $right>
                            {p.usageCount > 0 ? (
                                <UsageCell>
                                    <UsageCount>
                                        {p.usageCount} {visitWord(p.usageCount)}
                                    </UsageCount>
                                    {p.lastUsedAt && (
                                        <UsageWhen title={formatUsageDate(p.lastUsedAt)}>
                                            {formatLastUsed(p.lastUsedAt)}
                                        </UsageWhen>
                                    )}
                                </UsageCell>
                            ) : (
                                /* Zero jest CICHE, ale widoczne: „nieużywany" to odpowiedź
                                   na pytanie z tej kolumny, a myślnik czytałby się jak brak
                                   danych - czyli jak coś, czego trzeba jeszcze sprawdzić. */
                                <Muted>nieużywany</Muted>
                            )}
                        </Td>
                        <Td $right>
                            <ProductRatingCompact value={p.ratingValue} />
                        </Td>
                    </Tr>
                ))}
            </tbody>
        </Table>
    );
}
