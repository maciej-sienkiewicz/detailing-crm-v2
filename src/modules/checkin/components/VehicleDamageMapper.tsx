// src/modules/checkin/components/VehicleDamageMapper.tsx

import { useState, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Button } from '@/common/components/Button';
import type { DamagePoint, DamagePointPhoto, PhotoSlot } from '../types';
import { DamagePhotoAnnotator, AnnotationOverlay } from './DamagePhotoAnnotator';

// ─── Vehicle types ────────────────────────────────────────────────────────────

type VehicleBodyType = 'cabrio' | 'coupe' | 'hatchback' | 'kombi' | 'sedan' | 'suv' | 'van';

const VEHICLE_BODY_TYPES: { value: VehicleBodyType; label: string }[] = [
    { value: 'sedan',    label: 'Sedan'     },
    { value: 'suv',      label: 'SUV'       },
    { value: 'hatchback',label: 'Hatchback' },
    { value: 'kombi',    label: 'Kombi'     },
    { value: 'coupe',    label: 'Coupe'     },
    { value: 'cabrio',   label: 'Kabriolet' },
    { value: 'van',      label: 'Van'       },
];

const vehicleImageUrl = (type: VehicleBodyType) => `/assets/${type}.webp`;

// ─── Animations ───────────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

const TypeSelectorRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const TypeLabel = styled.label`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: 500;
  color: ${props => props.theme.colors.textSecondary};
  white-space: nowrap;
  flex-shrink: 0;
`;

const TypeSelect = styled.select`
  padding: 7px 32px 7px 12px;
  border: 1.5px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-family: inherit;
  font-weight: 500;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: border-color ${props => props.theme.transitions.normal},
              box-shadow ${props => props.theme.transitions.normal};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${props => props.theme.radii.xl};
  border: 2px solid ${props => props.theme.colors.border};
  background-color: white;
  box-shadow: ${props => props.theme.shadows.md};
  max-width: 800px;
  margin: 0 auto;

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    max-width: 700px;
  }

  @media (min-width: ${props => props.theme.breakpoints.lg}) {
    max-width: 800px;
  }
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

  ${props => props.$isLast && css`
    animation: ${pulse} 2s infinite;
  `}

  ${props => props.$isHovered && css`
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
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
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

const DamageItemRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${props => props.theme.spacing.md};
  align-items: center;
`;

// ─── Damage photos (desktop) ──────────────────────────────────────────────────

const DamagePhotoStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-left: 44px; /* align with input, past the number badge */
`;

const DamagePhotoThumb = styled.button`
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surfaceAlt};
  padding: 0;
  cursor: pointer;
  transition: all ${props => props.theme.transitions.normal};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const DamagePhotoRemove = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  z-index: 2;
`;

const DamagePhotoAnnotatedBadge = styled.span`
  position: absolute;
  bottom: 3px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(14, 165, 233, 0.92);
  color: #fff;

  svg {
    width: 10px;
    height: 10px;
  }
`;

const AttachPhotoBtn = styled.button`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  border: 1.5px dashed ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all ${props => props.theme.transitions.normal};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
    background: rgba(14, 165, 233, 0.05);
  }
`;

// ─── Photo picker modal ───────────────────────────────────────────────────────

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const PickerCard = styled.div`
  background: #fff;
  border-radius: ${props => props.theme.radii.xl};
  box-shadow: ${props => props.theme.shadows.md};
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PickerHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid ${props => props.theme.colors.border};

  h4 {
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
  }
`;

const PickerClose = styled.button`
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  font-size: 20px;
  cursor: pointer;
  line-height: 1;

  &:hover { color: ${props => props.theme.colors.text}; }
`;

const PickerBody = styled.div`
  padding: 16px 18px;
  overflow-y: auto;
`;

const PickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
`;

const PickerPhoto = styled.button<{ $attached: boolean }>`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid ${props => props.$attached ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.theme.colors.surfaceAlt};
  padding: 0;
  cursor: ${props => props.$attached ? 'default' : 'pointer'};
  opacity: ${props => props.$attached ? 0.55 : 1};
  transition: all ${props => props.theme.transitions.normal};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover {
    ${props => !props.$attached && css`
      border-color: ${props.theme.colors.primary};
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    `}
  }
`;

const PickerAttachedLabel = styled.span`
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  background: rgba(14, 165, 233, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 5px;
  padding: 2px 4px;
  text-align: center;
`;

const PickerEmpty = styled.div`
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textMuted};
  font-size: ${props => props.theme.fontSizes.sm};
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

// ─── Component ────────────────────────────────────────────────────────────────

interface VehicleDamageMapperProps {
  points: DamagePoint[];
  onChange: (points: DamagePoint[]) => void;
  /** Photos from the documentation step that can be attached to damage points */
  availablePhotos?: PhotoSlot[];
}

export const VehicleDamageMapper = ({ points, onChange, availablePhotos = [] }: VehicleDamageMapperProps) => {
  const [vehicleType, setVehicleType] = useState<VehicleBodyType>('sedan');
  const [hoveredPointId, setHoveredPointId] = useState<number | null>(null);
  const [pickerPointId, setPickerPointId] = useState<number | null>(null);
  const [annotating, setAnnotating] = useState<{ pointId: number; photo: DamagePointPhoto } | null>(null);
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

  const getPointNumber = (id: number) => points.findIndex(p => p.id === id) + 1;

  // ── Damage photos ──────────────────────────────────────────────────────────

  const photoUrl = (slot: PhotoSlot) => slot.thumbnailUrl || slot.previewUrl;

  const handleAttachPhoto = (pointId: number, slot: PhotoSlot) => {
    onChange(points.map(p => {
      if (p.id !== pointId) return p;
      if ((p.photos ?? []).some(ph => ph.photoId === slot.id)) return p;
      const attached: DamagePointPhoto = {
        photoId: slot.id,
        strokes: [],
        thumbnailUrl: photoUrl(slot),
        status: 'done',
      };
      return { ...p, photos: [...(p.photos ?? []), attached] };
    }));
  };

  const handleRemovePhoto = (pointId: number, photoId: string) => {
    onChange(points.map(p =>
      p.id === pointId
        ? { ...p, photos: (p.photos ?? []).filter(ph => ph.photoId !== photoId) }
        : p
    ));
  };

  const handleSaveStrokes = (pointId: number, photoId: string, strokes: DamagePointPhoto['strokes']) => {
    onChange(points.map(p =>
      p.id === pointId
        ? { ...p, photos: (p.photos ?? []).map(ph => ph.photoId === photoId ? { ...ph, strokes } : ph) }
        : p
    ));
  };

  const pickerPoint = pickerPointId !== null ? points.find(p => p.id === pickerPointId) : null;

  return (
    <Container>
      {/* Vehicle type selector */}
      <TypeSelectorRow>
        <TypeLabel htmlFor="vehicle-body-type">Typ nadwozia:</TypeLabel>
        <TypeSelect
          id="vehicle-body-type"
          value={vehicleType}
          onChange={e => setVehicleType(e.target.value as VehicleBodyType)}
        >
          {VEHICLE_BODY_TYPES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </TypeSelect>
      </TypeSelectorRow>

      {/* Diagram with damage markers */}
      <ImageContainer ref={containerRef}>
        <VehicleImage
          ref={imageRef}
          src={vehicleImageUrl(vehicleType)}
          alt={`Schemat pojazdu — ${VEHICLE_BODY_TYPES.find(t => t.value === vehicleType)?.label}`}
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
              <DamageItemRow>
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
              </DamageItemRow>

              {/* Photos attached to this damage point */}
              <DamagePhotoStrip onClick={e => e.stopPropagation()}>
                {(point.photos ?? []).map(photo => (
                  <DamagePhotoThumb
                    key={photo.photoId}
                    onClick={() => photo.thumbnailUrl && setAnnotating({ pointId: point.id, photo })}
                    title="Kliknij, aby zaznaczyć uszkodzenie na zdjęciu"
                  >
                    {photo.thumbnailUrl && (
                      <img src={photo.thumbnailUrl} alt="Zdjęcie uszkodzenia" draggable={false} />
                    )}
                    <AnnotationOverlay strokes={photo.strokes} />
                    {photo.strokes.length > 0 && (
                      <DamagePhotoAnnotatedBadge title="Zdjęcie z oznaczeniem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M12 19l7-7 3 3-7 7-3-3z" />
                          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        </svg>
                      </DamagePhotoAnnotatedBadge>
                    )}
                    <DamagePhotoRemove
                      role="button"
                      title="Odepnij zdjęcie"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemovePhoto(point.id, photo.photoId);
                      }}
                    >
                      ×
                    </DamagePhotoRemove>
                  </DamagePhotoThumb>
                ))}
                <AttachPhotoBtn
                  type="button"
                  onClick={() => setPickerPointId(point.id)}
                  title="Przypisz zdjęcie z dokumentacji do tego uszkodzenia"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Przypisz zdjęcie
                </AttachPhotoBtn>
              </DamagePhotoStrip>
            </DamageItem>
          ))
        )}
      </DamageList>

      {/* Photo picker: attach a documentation photo to a damage point */}
      {pickerPoint && (
        <PickerOverlay onClick={() => setPickerPointId(null)}>
          <PickerCard onClick={e => e.stopPropagation()}>
            <PickerHead>
              <h4>Przypisz zdjęcie do uszkodzenia nr {getPointNumber(pickerPoint.id)}</h4>
              <PickerClose onClick={() => setPickerPointId(null)} title="Zamknij">×</PickerClose>
            </PickerHead>
            <PickerBody>
              {availablePhotos.length === 0 ? (
                <PickerEmpty>
                  Brak zdjęć w dokumentacji. Prześlij zdjęcia w sekcji „Dokumentacja zdjęciowa"
                  powyżej lub użyj telefonu (kod QR), aby dodać zdjęcia bezpośrednio do uszkodzenia.
                </PickerEmpty>
              ) : (
                <PickerGrid>
                  {availablePhotos.map(slot => {
                    const attached = (pickerPoint.photos ?? []).some(ph => ph.photoId === slot.id);
                    return (
                      <PickerPhoto
                        key={slot.id}
                        $attached={attached}
                        disabled={attached}
                        onClick={() => {
                          handleAttachPhoto(pickerPoint.id, slot);
                          setPickerPointId(null);
                        }}
                        title={attached ? 'Zdjęcie już przypisane' : 'Przypisz to zdjęcie'}
                      >
                        {photoUrl(slot) && <img src={photoUrl(slot)} alt={slot.fileName} draggable={false} />}
                        {attached && <PickerAttachedLabel>Przypisane</PickerAttachedLabel>}
                      </PickerPhoto>
                    );
                  })}
                </PickerGrid>
              )}
            </PickerBody>
          </PickerCard>
        </PickerOverlay>
      )}

      {/* Photo annotation editor */}
      {annotating && annotating.photo.thumbnailUrl && (
        <DamagePhotoAnnotator
          imageUrl={annotating.photo.thumbnailUrl}
          initialStrokes={annotating.photo.strokes}
          title={`Uszkodzenie nr ${getPointNumber(annotating.pointId)} — zaznacz na zdjęciu`}
          onSave={strokes => {
            handleSaveStrokes(annotating.pointId, annotating.photo.photoId, strokes);
            setAnnotating(null);
          }}
          onClose={() => setAnnotating(null)}
        />
      )}
    </Container>
  );
};
