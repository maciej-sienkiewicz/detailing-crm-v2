// src/modules/checkin/components/VehicleDamageMapper.tsx

import { useState, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button } from '@/common/components/Button';
import type { DamagePoint } from '../types';

const pulse = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
  }

  70% {
    transform: translate(-50%, -50%) scale(1.05);
    box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
  }

  100% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

const ImageContainer = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${props => props.theme.radii.xl};
  border: 2px solid ${props => props.theme.colors.border};
  background-color: white;
  box-shadow: ${props => props.theme.shadows.md};
`;

const VehicleImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
`;

const OverlayLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: pinch-zoom;
`;

const DamageMarker = styled.div<{ $isLast: boolean; $isHovered: boolean }>`
  position: absolute;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: all ${props => props.theme.transitions.normal};
  z-index: 10;

  ${props => props.$isLast && `
    animation: ${pulse} 2s infinite;
  `}

  ${props => props.$isHovered && `
    transform: translate(-50%, -50%) scale(1.2);
    z-index: 20;
  `}

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
    z-index: 20;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
`;

const DamageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
`;

const DamageItem = styled.div<{ $isHovered: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${props => props.theme.spacing.md};
  align-items: center;
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.$isHovered ? 'rgba(14, 165, 233, 0.05)' : props.theme.colors.surfaceAlt};
  border-radius: ${props => props.theme.radii.md};
  border: 2px solid ${props => props.$isHovered ? props.theme.colors.primary : 'transparent'};
  transition: all ${props => props.theme.transitions.normal};
  cursor: pointer;

  &:hover {
    background-color: rgba(14, 165, 233, 0.05);
    border-color: ${props => props.theme.colors.primary};
  }
`;

const DamageNumber = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
`;

const DamageInput = styled.input`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-family: inherit;
  transition: all ${props => props.theme.transitions.normal};
  background-color: white;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.textMuted};
  }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  cursor: pointer;
  border-radius: ${props => props.theme.radii.md};
  transition: all ${props => props.theme.transitions.normal};
  flex-shrink: 0;

  &:hover {
    background-color: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const EmptyState = styled.div`
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textMuted};
  font-size: ${props => props.theme.fontSizes.sm};
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  background-color: ${props => props.theme.colors.surfaceAlt};
`;

const PlaceholderImage = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.02) 100%);
  color: ${props => props.theme.colors.textMuted};
  font-size: ${props => props.theme.fontSizes.sm};
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
`;

interface VehicleDamageMapperProps {
  imageUrl?: string;
  points: DamagePoint[];
  onChange: (points: DamagePoint[]) => void;
}

export const VehicleDamageMapper = ({ imageUrl, points, onChange }: VehicleDamageMapperProps) => {
  const [hoveredPointId, setHoveredPointId] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPoint: DamagePoint = {
      id: points.length > 0 ? Math.max(...points.map(p => p.id)) + 1 : 1,
      x,
      y,
      note: '',
    };

    onChange([...points, newPoint]);
  };

  const handleUpdateNote = (id: number, note: string) => {
    onChange(points.map(p => p.id === id ? { ...p, note } : p));
  };

  const handleDeletePoint = (id: number) => {
    onChange(points.filter(p => p.id !== id));
  };

  const handleUndo = () => {
    if (points.length > 0) {
      onChange(points.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Czy na pewno chcesz usunąć wszystkie zaznaczenia?')) {
      onChange([]);
    }
  };

  const getPointNumber = (id: number) => {
    return points.findIndex(p => p.id === id) + 1;
  };

  return (
    <Container>
      <ImageContainer ref={containerRef}>
        {imageUrl ? (
          <>
            <VehicleImage
              ref={imageRef}
              src={imageUrl}
              alt="Schemat pojazdu"
              draggable={false}
            />
            <OverlayLayer onClick={handleImageClick}>
              {points.map((point, index) => (
                <DamageMarker
                  key={point.id}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                  }}
                  $isLast={index === points.length - 1}
                  $isHovered={hoveredPointId === point.id}
                  onMouseEnter={() => setHoveredPointId(point.id)}
                  onMouseLeave={() => setHoveredPointId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredPointId(point.id);
                  }}
                >
                  {getPointNumber(point.id)}
                </DamageMarker>
              ))}
            </OverlayLayer>
          </>
        ) : (
          <PlaceholderImage>
            <div>
              <p style={{ margin: 0, marginBottom: '8px' }}>📷 Schemat pojazdu</p>
              <p style={{ margin: 0, fontSize: '12px' }}>
                Dodaj obraz samochodu (image_627063.jpg) do folderu /public/assets
              </p>
            </div>
          </PlaceholderImage>
        )}
      </ImageContainer>

      <ControlsRow>
        <Button
          $variant="secondary"
          onClick={handleUndo}
          disabled={points.length === 0}
        >
          ↶ Cofnij
        </Button>
        <Button
          $variant="secondary"
          onClick={handleClearAll}
          disabled={points.length === 0}
        >
          🗑️ Wyczyść wszystko
        </Button>
      </ControlsRow>

      <DamageList>
        {points.length === 0 ? (
          <EmptyState>
            Kliknij na schemacie pojazdu, aby oznaczyć uszkodzenia
          </EmptyState>
        ) : (
          points.map((point) => (
            <DamageItem
              key={point.id}
              $isHovered={hoveredPointId === point.id}
              onMouseEnter={() => setHoveredPointId(point.id)}
              onMouseLeave={() => setHoveredPointId(null)}
            >
              <DamageNumber>{getPointNumber(point.id)}</DamageNumber>
              <DamageInput
                type="text"
                placeholder="Opis uszkodzenia (np. głęboka rysa, wgniecenie)"
                value={point.note}
                onChange={(e) => handleUpdateNote(point.id, e.target.value)}
              />
              <DeleteButton
                onClick={() => handleDeletePoint(point.id)}
                title="Usuń"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </DeleteButton>
            </DamageItem>
          ))
        )}
      </DamageList>
    </Container>
  );
};
