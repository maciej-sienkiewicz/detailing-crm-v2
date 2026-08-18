import { useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';

/**
 * The step-by-step guide shell, shared by every tour in the app.
 *
 * It owns the chrome (portal, gradient header, step counter, dots, navigation),
 * so a new tour is a list of steps rather than another 200 lines of modal. The
 * finish label is configurable because a tour that ends in a purchase says
 * something different from one that ends in "off you go".
 */

// ─── Animations ───────────────────────────────────────────────────────────────

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const cardIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const stepIn = keyframes`
  from { opacity: 0; transform: translateX(14px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ─── Overlay & card ───────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 4000;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: ${overlayIn} 200ms ease;
`;

const Card = styled.div`
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 780px);
  animation: ${cardIn} 260ms cubic-bezier(0.16, 1, 0.3, 1);
`;

// ─── Visual header ────────────────────────────────────────────────────────────

const Visual = styled.div<{ $from: string; $to: string }>`
  position: relative;
  height: 168px;
  flex-shrink: 0;
  background: linear-gradient(135deg, ${p => p.$from} 0%, ${p => p.$to} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const VisualGlow = styled.div`
  position: absolute;
  top: -40%;
  right: -10%;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
  pointer-events: none;
`;

const VisualIcon = styled.div`
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  backdrop-filter: blur(6px);
  animation: ${stepIn} 320ms ease both;
  svg { width: 36px; height: 36px; }
`;

const StepCounter = styled.div`
  position: absolute;
  top: 16px;
  left: 20px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.04em;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms;
  &:hover { background: rgba(255, 255, 255, 0.32); }
  svg { width: 16px; height: 16px; }
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

const Body = styled.div`
  padding: 26px 28px 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  animation: ${stepIn} 320ms ease both;
`;

const Title = styled.h2`
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.3px;
`;

// ─── Content primitives, for use inside a step body ───────────────────────────

export const TourDesc = styled.div`
  font-size: 14px;
  color: #475569;
  line-height: 1.65;

  strong { color: #0f172a; font-weight: 600; }
`;

export const TourBulletList = styled.ul`
  margin: 12px 0 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const TourBullet = styled.li<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.5;

  svg {
    width: 16px;
    height: 16px;
    color: ${p => p.$color};
    flex-shrink: 0;
    margin-top: 1px;
  }
  strong { color: #0f172a; font-weight: 600; }
`;

// ─── Footer / nav ─────────────────────────────────────────────────────────────

const Footer = styled.div`
  padding: 18px 28px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
`;

const Dots = styled.div`
  display: flex;
  gap: 6px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${p => p.$active ? '22px' : '7px'};
  height: 7px;
  border-radius: 9999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: ${p => p.$active ? '#0ea5e9' : '#cbd5e1'};
  transition: all 220ms ease;
  &:hover { background: ${p => p.$active ? '#0ea5e9' : '#94a3b8'}; }
`;

const NavBtns = styled.div`
  display: flex;
  gap: 8px;
`;

const NavBtn = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${p => p.$primary ? '9px 18px' : '9px 14px'};
  border-radius: 9999px;
  border: ${p => p.$primary ? 'none' : '1.5px solid #e2e8f0'};
  background: ${p => p.$primary ? '#0ea5e9' : '#fff'};
  color: ${p => p.$primary ? '#fff' : '#475569'};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 150ms ease;

  &:hover {
    background: ${p => p.$primary ? '#0284c7' : '#f8fafc'};
    ${p => !p.$primary && 'border-color: #cbd5e1; color: #0f172a;'}
  }
  svg { width: 15px; height: 15px; }
`;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface TourStep {
  icon: ReactNode;
  /** Gradient start of the step's header. */
  from: string;
  /** Gradient end of the step's header. */
  to: string;
  title: string;
  body: ReactNode;
}

interface GuidedTourProps {
  steps: TourStep[];
  onClose: () => void;
  /**
   * Runs when the last step is confirmed, and TAKES OVER from there: the tour does
   * not close itself. That is what lets a tour hand off to something else, such as
   * the purchase dialog it introduces. Without it, the last step just closes.
   */
  onFinish?: () => void;
  /** Label of the primary button on the last step. */
  finishLabel?: string;
}

export function GuidedTour({ steps, onClose, onFinish, finishLabel = 'Zaczynam' }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  if (!current) return null;

  const next = () => {
    if (!isLast) {
      setStep(s => s + 1);
      return;
    }
    // Whoever passed onFinish owns what happens next. Calling onClose as well would
    // tear down the caller along with the tour, which is exactly what made
    // "Rozumiem i kontynuuję zakup" close the purchase dialog instead of opening it.
    if (onFinish) onFinish();
    else onClose();
  };

  return createPortal(
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <Card role="dialog" aria-modal="true" aria-label={current.title}>
        <Visual $from={current.from} $to={current.to}>
          <VisualGlow />
          <StepCounter>{step + 1} / {steps.length}</StepCounter>
          <CloseBtn onClick={onClose} aria-label="Zamknij przewodnik"><X /></CloseBtn>
          {/* key forces re-mount so the icon animates on each step */}
          <VisualIcon key={step}>{current.icon}</VisualIcon>
        </Visual>

        <Body key={`body-${step}`}>
          <Title>{current.title}</Title>
          {current.body}
        </Body>

        <Footer>
          <Dots>
            {steps.map((_, i) => (
              <Dot key={i} $active={i === step} onClick={() => setStep(i)} aria-label={`Krok ${i + 1}`} />
            ))}
          </Dots>
          <NavBtns>
            {!isFirst && (
              <NavBtn onClick={() => setStep(s => s - 1)}>
                <ArrowLeft /> Wstecz
              </NavBtn>
            )}
            <NavBtn $primary onClick={next}>
              {isLast ? finishLabel : 'Dalej'}
              {!isLast && <ArrowRight />}
            </NavBtn>
          </NavBtns>
        </Footer>
      </Card>
    </Overlay>,
    document.body,
  );
}
