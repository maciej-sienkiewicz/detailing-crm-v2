import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { getCarLogoUrl } from '../services/carLogos';

type Size = 'sm' | 'md' | 'lg';

interface CarLogoImageProps {
    brand: string | null | undefined;
    size?: Size;
    className?: string;
}

// Wysokość kontenera – szerokość auto (logo samo dyktuje proporcje).
const SIZE_H: Record<Size, number> = { sm: 24, md: 36, lg: 48 };
const SIZE_MAX_W: Record<Size, number> = { sm: 40, md: 60, lg: 80 };

const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

const Stack = styled.div<{ $h: number; $maxW: number }>`
    position: relative;
    height: ${p => p.$h}px;
    width: ${p => p.$maxW}px;
    flex-shrink: 0;
`;

const Skeleton = styled.div<{ $visible: boolean }>`
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.2s infinite linear;
    opacity: ${p => p.$visible ? 1 : 0};
    pointer-events: none;
    transition: opacity 0.15s;
`;

const Img = styled.img<{ $h: number; $maxW: number; $visible: boolean }>`
    display: block;
    height: ${p => p.$h}px;
    width: ${p => p.$maxW}px;
    object-fit: contain;
    object-position: center;
    opacity: ${p => p.$visible ? 1 : 0};
    transition: opacity 0.2s;
`;

const FallbackBubble = styled.div<{ $h: number }>`
    height: ${p => p.$h}px;
    width: ${p => p.$h}px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #0ea5e9);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
        width: ${p => Math.round(p.$h * 0.47)}px;
        height: ${p => Math.round(p.$h * 0.47)}px;
    }
`;

const CarFallbackIcon = ({ h }: { h: number }) => (
    <FallbackBubble $h={h}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M19 17H5a2 2 0 0 1-2-2V9l2-4h10l4 4v4a2 2 0 0 1-2 2Z" />
            <circle cx="7.5" cy="17" r="1.5" />
            <circle cx="16.5" cy="17" r="1.5" />
        </svg>
    </FallbackBubble>
);

type ImgState = 'loading' | 'loaded' | 'error';

export const CarLogoImage = ({ brand, size = 'md', className }: CarLogoImageProps) => {
    const logoUrl = getCarLogoUrl(brand);
    const h = SIZE_H[size];
    const maxW = SIZE_MAX_W[size];

    const [imgState, setImgState] = useState<ImgState>(logoUrl ? 'loading' : 'error');

    if (!logoUrl || imgState === 'error') {
        return <CarFallbackIcon h={h} />;
    }

    return (
        <Stack $h={h} $maxW={maxW} className={className}>
            <Skeleton $visible={imgState === 'loading'} />
            <Img
                $h={h}
                $maxW={maxW}
                $visible={imgState === 'loaded'}
                src={logoUrl}
                alt={brand ?? ''}
                decoding="async"
                onLoad={() => setImgState('loaded')}
                onError={() => {
                    console.warn(`[CarLogo] failed to load logo for brand "${brand}": ${logoUrl}`);
                    setImgState('error');
                }}
            />
        </Stack>
    );
};
