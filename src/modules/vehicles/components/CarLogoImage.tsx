import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { getCarLogoUrl } from '../services/carLogos';

// ─── Types ────────────────────────────────────────────────────────────────────

type Size = 'sm' | 'md' | 'lg';

interface CarLogoImageProps {
    brand: string | null | undefined;
    size?: Size;
    className?: string;
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZE_PX: Record<Size, number> = { sm: 24, md: 36, lg: 52 };

// ─── Styled components ────────────────────────────────────────────────────────

const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

const Wrapper = styled.div<{ $size: number }>`
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: transparent;
`;

const Skeleton = styled.div<{ $size: number }>`
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    border-radius: 50%;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.2s infinite linear;
    flex-shrink: 0;
`;

const Img = styled.img<{ $size: number }>`
    width: ${p => p.$size}px;
    height: ${p => p.$size}px;
    object-fit: contain;
    border-radius: 50%;
    padding: 3px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
`;

// ─── Fallback icon (generic car SVG) ─────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

type State = 'loading' | 'loaded' | 'error';

export const CarLogoImage = ({ brand, size = 'md', className }: CarLogoImageProps) => {
    const logoUrl = getCarLogoUrl(brand);
    const px = SIZE_PX[size];

    const [imgState, setImgState] = useState<State>(logoUrl ? 'loading' : 'error');

    if (!logoUrl || imgState === 'error') {
        return <CarFallbackIcon size={px} />;
    }

    return (
        <Wrapper $size={px} className={className}>
            {imgState === 'loading' && <Skeleton $size={px} />}
            <Img
                $size={px}
                src={logoUrl}
                alt={brand ?? ''}
                loading="lazy"
                decoding="async"
                style={{ display: imgState === 'loaded' ? 'block' : 'none' }}
                onLoad={() => setImgState('loaded')}
                onError={() => setImgState('error')}
            />
        </Wrapper>
    );
};
