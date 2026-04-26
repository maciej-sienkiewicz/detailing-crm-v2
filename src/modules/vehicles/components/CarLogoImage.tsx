import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { getCarLogoUrl } from '../services/carLogos';

type Size = 'sm' | 'md' | 'lg';

interface CarLogoImageProps {
    brand: string | null | undefined;
    size?: Size;
    className?: string;
}

const SIZE_PX: Record<Size, number> = { sm: 24, md: 36, lg: 52 };

const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

// Skeleton i obraz są układane jeden na drugi – obraz zawsze jest w layoucie
// (opacity zamiast display:none), żeby przeglądarka go faktycznie załadowała.
const Stack = styled.div<{ $size: number }>`
    position: relative;
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    flex-shrink: 0;
`;

const Skeleton = styled.div<{ $size: number; $visible: boolean }>`
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.2s infinite linear;
    opacity: ${p => p.$visible ? 1 : 0};
    pointer-events: none;
    transition: opacity 0.15s;
`;

const Img = styled.img<{ $size: number; $visible: boolean }>`
    display: block;
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    object-fit: contain;
    border-radius: 50%;
    padding: 3px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
    opacity: ${p => p.$visible ? 1 : 0};
    transition: opacity 0.15s;
`;

const FallbackBubble = styled.div<{ $size: number }>`
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #0ea5e9);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
        width: ${p => Math.round(p.$size * 0.47)}px;
        height: ${p => Math.round(p.$size * 0.47)}px;
    }
`;

const CarFallbackIcon = ({ size }: { size: number }) => (
    <FallbackBubble $size={size}>
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
    const px = SIZE_PX[size];

    const [imgState, setImgState] = useState<ImgState>(logoUrl ? 'loading' : 'error');

    if (!logoUrl || imgState === 'error') {
        return <CarFallbackIcon size={px} />;
    }

    return (
        <Stack $size={px} className={className}>
            <Skeleton $size={px} $visible={imgState === 'loading'} />
            <Img
                $size={px}
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
