import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { RevenueKpiCard } from './RevenueKpiCard';
import { ReservationsKpiCard } from './ReservationsKpiCard';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const fadeSlideInReverse = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  flex-shrink: 0;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    width: 100%;
  }
`;

/**
 * Locks both width and height after first paint so neither dimension shifts
 * when switching between cards. overflow: hidden clips the translateX travel.
 * The two-level child cascade forces both SlideAnim and the card's own Wrapper
 * to fill the locked width, regardless of their internal min-width.
 */
const SlideViewport = styled.div<{ $w: number; $h: number }>`
  overflow: hidden;
  cursor: pointer;
  width:  ${p => p.$w > 0 ? `${p.$w}px` : 'auto'};
  height: ${p => p.$h > 0 ? `${p.$h}px` : 'auto'};
  min-width: 220px;

  /* Pull SlideAnim + card Wrapper to full locked width */
  & > *, & > * > * {
    width: 100%;
    box-sizing: border-box;
  }
  & * { cursor: pointer; }

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    width: 100%;
    min-width: 0;
  }
`;

const SlideAnim = styled.div<{ $direction: 'forward' | 'backward' }>`
  ${p => p.$direction === 'forward'
    ? css`animation: ${fadeSlideIn} 220ms ease both;`
    : css`animation: ${fadeSlideInReverse} 220ms ease both;`
  }
`;

const Dots = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
`;

const Dot = styled.button<{ $active: boolean; $color: string }>`
  width: ${p => p.$active ? '18px' : '6px'};
  height: 6px;
  border-radius: 99px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: width 220ms ease, background 220ms ease, opacity 220ms ease;
  background: ${p => p.$active ? p.$color : 'rgba(255,255,255,0.2)'};
  opacity: ${p => p.$active ? 1 : 0.5};

  &:hover { opacity: 1; }
`;

// ─── Slides config ────────────────────────────────────────────────────────────

const SLIDES = [
  { key: 'revenue',      color: '#0ea5e9', component: <RevenueKpiCard /> },
  { key: 'reservations', color: '#8b5cf6', component: <ReservationsKpiCard /> },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export const KpiSlider = () => {
  const [active, setActive]       = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey]     = useState(0);
  const [lockedW, setLockedW]     = useState(0);
  const [lockedH, setLockedH]     = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Measure and lock both dimensions after first paint.
  useLayoutEffect(() => {
    if (viewportRef.current && lockedH === 0) {
      setLockedW(viewportRef.current.offsetWidth);
      setLockedH(viewportRef.current.offsetHeight);
    }
  }, [lockedH]);

  const goTo = useCallback((idx: number) => {
    if (idx === active) return;
    setDirection(idx > active ? 'forward' : 'backward');
    setActive(idx);
    setAnimKey(k => k + 1);
  }, [active]);

  const goNext = useCallback(() => {
    goTo((active + 1) % SLIDES.length);
  }, [active, goTo]);

  const slide = SLIDES[active];

  return (
    <Wrapper>
      <SlideViewport ref={viewportRef} $w={lockedW} $h={lockedH} onClick={goNext}>
        <SlideAnim key={animKey} $direction={direction}>
          {slide.component}
        </SlideAnim>
      </SlideViewport>

      <Dots>
        {SLIDES.map((s, i) => (
          <Dot
            key={s.key}
            $active={i === active}
            $color={s.color}
            onClick={e => { e.stopPropagation(); goTo(i); }}
            aria-label={`Pokaż kartę ${i + 1}`}
          />
        ))}
      </Dots>
    </Wrapper>
  );
};
