import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Package, ArrowLeft, Star, CheckCircle2 } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { PageContainer } from '@/common/components/PageContainer';
import { usePermissions } from '@/core/permissions';
import { useProductDetail, useConfirmProduct, useProductRating } from '../hooks/useProducts';
import { ProductRatingStars } from '../components/ProductRatingStars';
import { ProductNotes } from '../components/ProductNotes';
import { formatPackage, formatPrice } from '../utils/productFormat';
import { UNIT_LABELS } from '../types';

const View = styled.div` min-height: 100vh; background: ${st.bg}; ${hexBackdrop} `;
const Body = styled(PageContainer)` display: flex; flex-direction: column; gap: 18px; `;
const Back = styled.button`
    display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
    background: none; border: none; color: ${st.textSecondary}; font-family: inherit;
    font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 0;
    &:hover { color: ${st.text}; }
`;
const Hero = styled.header`
    display: flex; align-items: flex-start; gap: 16px;
    padding: 20px; background: ${st.bgCard}; border: 1px solid ${st.border};
    border-radius: ${st.radius}; box-shadow: ${st.shadowSm};
    @media (max-width: 640px) { flex-direction: column; }
`;
const HeroIcon = styled.div` width: 56px; height: 56px; flex-shrink: 0; border-radius: ${st.radius}; background: ${st.bgCardAlt}; display: flex; align-items: center; justify-content: center; color: ${st.textMuted}; `;
const HeroMain = styled.div` flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; `;
const HeroTitle = styled.h1` margin: 0; font-size: 22px; font-weight: 700; color: ${st.text}; `;
const HeroMeta = styled.div` display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; color: ${st.textSecondary}; `;

const Columns = styled.div`
    display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
// Kolumna dowodów. Jedna wspólna powierzchnia (karta na tle innym niż layout) —
// wewnątrz Specyfikacja i Cena leżą płasko, rozdzielone kreską. Jedno WYNIESIENIE
// na kolumnę (CLAUDE.md §2): tu skromna karta, po prawej mocna karta doświadczenia.
const LeftCol = styled.div`
    background: ${st.bgCard}; border: 1px solid ${st.border};
    border-radius: ${st.radius}; box-shadow: ${st.shadowSm};
    padding: 20px; display: flex; flex-direction: column; gap: 16px;
    @media (max-width: 900px) { order: 2; }
`;
// JEDYNA mocno wyniesiona sekcja w oknie: doświadczenie studia (CLAUDE.md §2).
const RightCol = styled.div` @media (max-width: 900px) { order: 1; } `;

const FlatSection = styled.section` display: flex; flex-direction: column; gap: 10px; `;
const RowDivider = styled.hr` border: none; border-top: 1px solid ${st.border}; margin: 2px 0; width: 100%; `;
const SectionLabel = styled.h2` margin: 0; font-size: 15px; font-weight: 700; color: ${st.text}; display: flex; align-items: center; gap: 8px; `;
const SpecGrid = styled.dl` margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 14px; `;
const DKey = styled.dt` color: ${st.textMuted}; `;
const DVal = styled.dd` margin: 0; color: ${st.text}; `;

const Elevated = styled.section`
    position: relative; overflow: hidden;
    background: ${st.bgCard}; border: 1px solid ${st.border};
    border-radius: ${st.radiusLg}; box-shadow: ${st.shadowMd};
    padding: 20px; display: flex; flex-direction: column; gap: 18px;
    &::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--brand-primary); }
`;
const PriceHead = styled.div` display: flex; flex-direction: column; gap: 2px; `;
const PriceNumber = styled.div` font-size: 26px; font-weight: 700; color: ${st.text}; `;
const PriceProof = styled.div` font-size: 12px; color: ${st.textMuted}; `;

const ConfirmBtn = styled.button`
    display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
    padding: 8px 14px; font-family: inherit; font-size: 13px; font-weight: 600;
    color: #15803d; background: ${st.bgAccentGreen}; border: 1px solid #86efac;
    border-radius: ${st.radiusSm}; cursor: pointer;
`;
const RatingRow = styled.div` display: flex; flex-direction: column; gap: 8px; `;

export function ProductDetailView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const canManage = can('PRODUCTS_MANAGE');
    const canSeeCosts = can('PRODUCTS_COSTS');

    const { product, isLoading } = useProductDetail(id);
    const confirm = useConfirmProduct(id ?? '');
    const rating = useProductRating(id ?? '');

    if (isLoading || !product) {
        return <View><Body><Back onClick={() => navigate('/products')}><ArrowLeft size={16} /> Wróć</Back><p style={{ color: st.textMuted }}>Ładowanie…</p></Body></View>;
    }

    return (
        <View>
            <Body>
                <Back onClick={() => navigate('/products')}><ArrowLeft size={16} /> Katalog produktów</Back>

                <Hero>
                    <HeroIcon><Package size={26} /></HeroIcon>
                    <HeroMain>
                        <HeroTitle>{product.internalName || product.name}</HeroTitle>
                        <HeroMeta>
                            <span>{product.brand}</span>
                            <span>·</span>
                            <span>{formatPackage(product.packageSizeValue, product.packageSizeUnit)}</span>
                            {product.rating && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: st.accentAmber }}>
                                    <Star size={14} fill={st.accentAmber} color={st.accentAmber} /> {product.rating.rating}
                                </span>
                            )}
                        </HeroMeta>
                    </HeroMain>
                </Hero>

                <Columns>
                    <LeftCol>
                        <FlatSection>
                            <SectionLabel>Specyfikacja</SectionLabel>
                            <SpecGrid>
                                <DKey>Producent</DKey><DVal>{product.manufacturerName}</DVal>
                                <DKey>Jednostka</DKey><DVal>{UNIT_LABELS[product.unitOfMeasure]}</DVal>
                                <DKey>Opakowanie</DKey><DVal>{formatPackage(product.packageSizeValue, product.packageSizeUnit)}</DVal>
                                {product.gtin && (<><DKey>Kod (GTIN)</DKey><DVal>{product.gtin}</DVal></>)}
                                {(product.packageHeightMm || product.packageWidthMm || product.packageDepthMm) && (
                                    <><DKey>Gabaryty</DKey><DVal>{[product.packageHeightMm, product.packageWidthMm, product.packageDepthMm].filter(Boolean).join(' × ')} mm</DVal></>
                                )}
                                {product.description && (<><DKey>Opis</DKey><DVal>{product.description}</DVal></>)}
                            </SpecGrid>
                        </FlatSection>

                        {canSeeCosts && product.price && (
                            <FlatSection>
                                <RowDivider />
                                <SectionLabel>Cena jednostkowa</SectionLabel>
                                <PriceHead>
                                    <PriceNumber>{formatPrice(product.price)}</PriceNumber>
                                    <PriceProof>
                                        netto {(product.price.unitPriceNet / 100).toFixed(2)} zł ·
                                        VAT {product.price.vatRate === -1 ? 'zw.' : `${product.price.vatRate}%`} ·
                                        brutto {(product.price.unitPriceGross / 100).toFixed(2)} zł
                                        {product.supplierName ? ` · dostawca: ${product.supplierName}` : ''}
                                    </PriceProof>
                                </PriceHead>
                            </FlatSection>
                        )}

                        {product.provenance.verificationLevel === 'AI_SUGGESTED' && canManage && (
                            <ConfirmBtn type="button" onClick={() => confirm.mutate()}>
                                <CheckCircle2 size={16} /> Dane zgadzają się z etykietą
                            </ConfirmBtn>
                        )}
                    </LeftCol>

                    <RightCol>
                        <Elevated>
                            <SectionLabel><Star size={16} color={st.accentAmber} /> Doświadczenie studia</SectionLabel>
                            <RatingRow>
                                <span style={{ fontSize: 13, color: st.textMuted }}>Ocena zespołu</span>
                                <ProductRatingStars
                                    value={product.rating?.rating ?? null}
                                    size={22}
                                    onChange={canManage ? r => rating.set.mutate({ rating: r }) : undefined}
                                />
                                {product.rating?.ratedByName && (
                                    <span style={{ fontSize: 11, color: st.textMuted }}>
                                        ostatnio: {product.rating.ratedByName}
                                    </span>
                                )}
                            </RatingRow>
                            <div>
                                <SectionLabel style={{ fontSize: 14, marginBottom: 10 }}>Notatki</SectionLabel>
                                {id && <ProductNotes productId={id} canManage={canManage} />}
                            </div>
                        </Elevated>
                    </RightCol>
                </Columns>
            </Body>
        </View>
    );
}
