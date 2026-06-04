import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { useCalendarNavigation } from '@/common/context/CalendarNavigationContext';

// ─── Animations ───────────────────────────────────────────────────────────────

const float = keyframes`
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-6px) scale(1.01); }
`;

// ─── Styled ───────────────────────────────────────────────────────────────────

const Backdrop = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, ${p => p.$visible ? 0.35 : 0});
  z-index: 9998;
  pointer-events: ${p => p.$visible ? 'all' : 'none'};
  transition: background 400ms ease;
`;

const CardWrap = styled.div<{
  $top: number;
  $left: number;
  $width: number;
  $height: number;
  $phase: string;
  $accentColor: string;
  $animate: boolean;
}>`
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  perspective: 1200px;

  top: ${p => p.$top}px;
  left: ${p => p.$left}px;
  width: ${p => p.$width}px;
  height: ${p => p.$height}px;

  /* Transitions only active after the card has been placed at source */
  transition: ${p => p.$animate ? `
    top 480ms cubic-bezier(0.34, 1.56, 0.64, 1),
    left 480ms cubic-bezier(0.34, 1.56, 0.64, 1),
    width 480ms cubic-bezier(0.34, 1.56, 0.64, 1),
    height 480ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 300ms ease
  ` : 'none'};

  ${p => p.$phase === 'to-cell' && css`
    transition:
      top 520ms cubic-bezier(0.4, 0, 0.8, 0.6),
      left 520ms cubic-bezier(0.4, 0, 0.8, 0.6),
      width 520ms cubic-bezier(0.4, 0, 0.8, 0.6),
      height 520ms cubic-bezier(0.4, 0, 0.8, 0.6),
      opacity 400ms ease;
  `}

  ${p => p.$phase === 'done' && css`
    opacity: 0;
  `}
`;

const Card = styled.div<{ $phase: string; $accentColor: string }>`
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 0 0 2px ${p => p.$accentColor}44,
    0 8px 32px rgba(0, 0, 0, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.12);
  border-top: 3px solid ${p => p.$accentColor};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  overflow: hidden;

  transform: rotateX(0deg) rotateY(0deg) scale(1);
  transition: transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 480ms ease;

  ${p => p.$phase === 'to-center' && css`
    transform: rotateX(4deg) rotateY(-6deg) scale(1.04);
    box-shadow:
      0 0 0 2px ${p.$accentColor}66,
      0 24px 60px rgba(0, 0, 0, 0.28),
      0 4px 16px rgba(0, 0, 0, 0.16);
  `}

  ${p => p.$phase === 'centered' && css`
    animation: ${float} 1.4s ease-in-out infinite;
    box-shadow:
      0 0 0 2px ${p.$accentColor}55,
      0 20px 50px rgba(0, 0, 0, 0.24),
      0 4px 12px rgba(0, 0, 0, 0.14);
  `}

  ${p => p.$phase === 'to-cell' && css`
    transform: rotateX(-4deg) rotateY(6deg) scale(0.92);
    box-shadow:
      0 0 0 2px ${p.$accentColor}33,
      0 4px 16px rgba(0, 0, 0, 0.1);
    transition: transform 520ms cubic-bezier(0.4, 0, 0.8, 0.6), box-shadow 520ms ease;
  `}
`;

const Avatar = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: ${p => p.$color}18;
  border: 1.5px solid ${p => p.$color}44;
  color: ${p => p.$color};
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Label = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Sub = styled.span`
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Amount = styled.span<{ $color: string }>`
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.$color};
  white-space: nowrap;
`;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const CARD_W = 300;
const CARD_H = 68;

interface Geometry { top: number; left: number; width: number; height: number; }

function centerGeometry(): Geometry {
  return {
    top: window.innerHeight / 2 - CARD_H / 2,
    left: window.innerWidth / 2 - CARD_W / 2,
    width: CARD_W,
    height: CARD_H,
  };
}

function rectGeometry(r: DOMRect): Geometry {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CalendarNavigationOverlay = () => {
  const { phase, card, targetRect } = useCalendarNavigation();

  const [geo, setGeo] = useState<Geometry>({ top: 0, left: 0, width: 0, height: 0 });
  // animate=false → transitions disabled (card snaps instantly to position)
  // animate=true  → transitions enabled (card flies smoothly)
  const [animate, setAnimate] = useState(false);

  const prevPhaseRef = useRef<string>('idle');

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'to-center' && card) {
      // Step 1: snap to source rect with NO transition so card appears right there
      setAnimate(false);
      setGeo(rectGeometry(card.sourceRect));

      // Step 2: after browser paints the card at source, enable transitions
      // and fly to center
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          setGeo(centerGeometry());
        });
      });
    }

    if (phase === 'centered' && prev === 'to-center') {
      setGeo(centerGeometry());
    }

    if (phase === 'to-cell' && targetRect) {
      setGeo(rectGeometry(targetRect));
    }
  }, [phase, card, targetRect]);

  if (phase === 'idle' || !card) return null;

  const isVisible = phase !== 'done';

  return createPortal(
    <>
      <Backdrop $visible={phase === 'centered' || phase === 'to-center'} />
      <CardWrap
        $top={geo.top}
        $left={geo.left}
        $width={geo.width}
        $height={geo.height}
        $phase={phase}
        $accentColor={card.accentColor}
        $animate={animate}
      >
        <Card $phase={phase} $accentColor={card.accentColor}>
          <Avatar $color={card.accentColor}>
            {card.label.charAt(0).toUpperCase()}
          </Avatar>
          <Info>
            <Label>{card.label}</Label>
            <Sub>{card.customer}</Sub>
          </Info>
          <Amount $color={card.accentColor}>{card.amount}</Amount>
        </Card>
      </CardWrap>
    </>,
    document.body,
  );
};
