import styled, { css } from 'styled-components';
import { MapPin, Globe } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { LocationItem, LocationsResponse } from '../types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Panel = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
`;

const Label = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 100px;
    flex-shrink: 0;
`;

const ChipScroll = styled.div`
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const Chip = styled.button<{ $active: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlue : 'transparent'};
    color: ${p => p.$active ? '#fff' : st.textSecondary};
    box-shadow: ${p => p.$active ? st.shadowXs : 'none'};
    font-family: inherit;
    flex-shrink: 0;

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${p => p.$active ? '#fff' : st.accentBlue};
        background: ${p => p.$active ? st.accentBlue : st.accentBlueDim};
    }

    ${css``}
`;

const SkeletonRow = styled.div`
    display: flex;
    gap: 6px;
    padding: 10px 20px;
`;

const SkeletonChip = styled.div<{ $w?: number }>`
    height: 30px;
    width: ${p => p.$w ?? 80}px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    flex-shrink: 0;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    locations: LocationsResponse | null;
    isLoading: boolean;
    selectedCode: number;
    onChange: (code: number) => void;
}

export function LocationFilter({ locations, isLoading, selectedCode, onChange }: Props) {
    if (isLoading) {
        return (
            <Panel>
                <SkeletonRow>
                    {[90, 70, 110, 80, 95, 75, 105].map((w, i) => (
                        <SkeletonChip key={i} $w={w} />
                    ))}
                </SkeletonRow>
            </Panel>
        );
    }

    if (!locations) return null;

    const countryCode = locations.country.locationCode;

    return (
        <Panel>
            <Row>
                <Label>
                    <MapPin size={12} />
                    Lokalizacja
                </Label>
                <ChipScroll>
                    <Chip
                        $active={selectedCode === countryCode}
                        onClick={() => onChange(countryCode)}
                    >
                        <Globe size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                        {locations.country.polishName}
                    </Chip>
                    {locations.voivodeships.map((v: LocationItem) => (
                        <Chip
                            key={v.locationCode}
                            $active={selectedCode === v.locationCode}
                            onClick={() => onChange(v.locationCode)}
                        >
                            {v.polishName}
                        </Chip>
                    ))}
                </ChipScroll>
            </Row>
        </Panel>
    );
}
