/**
 * Add to Offer Modal
 * Opens when user clicks "Dodaj do oferty" on an opportunity card.
 * Pre-fills service name and category from the intent data.
 */

import { useState } from 'react';
import styled from 'styled-components';
import { ge } from './GrowthEngineTheme';
import type { ServiceIntent } from '../types';

interface AddToOfferModalProps {
  intent: ServiceIntent | null;
  onClose: () => void;
  onConfirm: (data: { name: string; category: string; description: string }) => void;
}

// ─── Styled Components ───────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${ge.bgOverlay};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const Modal = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};
  padding: 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: ${ge.shadowLg};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${ge.gradientGreen};
    border-radius: ${ge.radiusLg} ${ge.radiusLg} 0 0;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: ${ge.textMuted};
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: ${ge.text};
  }
`;

const Title = styled.h3`
  font-size: ${ge.fontXl};
  font-weight: 700;
  color: ${ge.text};
  margin: 0 0 4px 0;
`;

const Subtitle = styled.p`
  font-size: ${ge.fontSm};
  color: ${ge.textMuted};
  margin: 0 0 24px 0;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
`;

const Label = styled.label`
  font-size: ${ge.fontXs};
  font-weight: 600;
  color: ${ge.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  padding: 10px 14px;
  background: ${ge.bgInput};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.text};
  font-size: ${ge.fontMd};

  &:focus {
    outline: none;
    border-color: ${ge.neonGreen};
    box-shadow: ${ge.neonGreenGlow};
  }
`;

const Textarea = styled.textarea`
  padding: 10px 14px;
  background: ${ge.bgInput};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.text};
  font-size: ${ge.fontSm};
  resize: vertical;
  min-height: 80px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${ge.neonGreen};
    box-shadow: ${ge.neonGreenGlow};
  }
`;

const DemandHint = styled.div`
  padding: 12px;
  background: ${ge.neonGreenDim};
  border-radius: ${ge.radiusSm};
  margin-bottom: 20px;
  font-size: ${ge.fontXs};
  color: ${ge.neonGreen};
  line-height: 1.5;

  strong {
    font-weight: 700;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: transparent;
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.textSecondary};
  font-size: ${ge.fontSm};
  cursor: pointer;
  transition: all ${ge.transition};

  &:hover {
    border-color: ${ge.borderHover};
    color: ${ge.text};
  }
`;

const ConfirmButton = styled.button`
  padding: 10px 24px;
  background: ${ge.neonGreen};
  border: none;
  border-radius: ${ge.radiusSm};
  color: ${ge.bg};
  font-size: ${ge.fontSm};
  font-weight: 700;
  cursor: pointer;
  transition: all ${ge.transition};

  &:hover {
    box-shadow: ${ge.neonGreenGlow};
    transform: translateY(-1px);
  }
`;

// ─── Component ───────────────────────────────────────────────────

export const AddToOfferModal = ({
  intent,
  onClose,
  onConfirm,
}: AddToOfferModalProps) => {
  const [name, setName] = useState(intent?.name ?? '');
  const [category, setCategory] = useState(intent?.category ?? '');
  const [description, setDescription] = useState(intent?.description ?? '');

  if (!intent) return null;

  const handleConfirm = () => {
    onConfirm({ name, category, description });
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>

        <Title>Dodaj nową usługę</Title>
        <Subtitle>
          Na podstawie analizy popytu rynkowego
        </Subtitle>

        <DemandHint>
          <strong>{intent.avgMonthlySearches.toLocaleString('pl-PL')}</strong> osób
          miesięcznie szuka tej usługi w Twoim regionie. Wzrost popularności:{' '}
          <strong>+{intent.momentum}%</strong> w ostatnim miesiącu.
        </DemandHint>

        <FormGroup>
          <Label>Nazwa usługi</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Folia ochronna PPF"
          />
        </FormGroup>

        <FormGroup>
          <Label>Kategoria</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="np. Ochrona"
          />
        </FormGroup>

        <FormGroup>
          <Label>Opis</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis usługi..."
          />
        </FormGroup>

        <Actions>
          <CancelButton onClick={onClose}>Anuluj</CancelButton>
          <ConfirmButton onClick={handleConfirm}>
            Dodaj do cennika
          </ConfirmButton>
        </Actions>
      </Modal>
    </Overlay>
  );
};
