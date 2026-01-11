// src/modules/appointments/components/common/LoadingSkeleton.tsx
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
    0% {
        background-position: -468px 0;
    }
    100% {
        background-position: 468px 0;
    }
`;

const SkeletonBox = styled.div<{ $height?: string; $width?: string }>`
    height: ${props => props.$height || '20px'};
    width: ${props => props.$width || '100%'};
    background: linear-gradient(
        to right,
        ${props => props.theme.colors.surfaceAlt} 0%,
        ${props => props.theme.colors.surfaceHover} 20%,
        ${props => props.theme.colors.surfaceAlt} 40%,
        ${props => props.theme.colors.surfaceAlt} 100%
    );
    background-size: 800px 104px;
    border-radius: ${props => props.theme.radii.md};
    animation: ${shimmer} 1.5s infinite linear;
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
`;

export const LoadingSkeleton = () => {
    return (
        <Container>
            <SkeletonBox $height="40px" />
            <SkeletonBox $height="120px" />
            <SkeletonBox $height="80px" />
            <SkeletonBox $height="120px" />
        </Container>
    );
};