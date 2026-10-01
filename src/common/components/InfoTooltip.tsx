import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { mobileBottomReserve, placeFloating, visibleViewport } from '@/common/utils/floatingPlacement';

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 5px;
  vertical-align: middle;
  flex-shrink: 0;
`;

const HoverTrigger = styled.span`
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
`;

const Icon = styled.span`
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 10px;
  font-style: italic;
  font-weight: 700;
  font-family: Georgia, 'Times New Roman', serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  user-select: none;
  line-height: 1;
  transition: background 120ms ease, color 120ms ease;

  ${Wrap}:hover & {
    background: #64748b;
    color: #fff;
  }
`;

// Rendered via portal into document.body: lives outside any transformed ancestor.
// Pozycję nadaje efekt po pomiarze (start ukryty, bez mignięcia w rogu). Strzałka
// stoi nad ikoną, a nie na środku dymka - dymek dociśnięty do krawędzi ekranu
// wskazywałby inaczej obok.
const PopupBox = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  visibility: hidden;
  background: #1e293b;
  color: #f1f5f9;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 1.55;
  padding: 9px 12px;
  border-radius: 9px;
  width: 240px;
  pointer-events: none;
  z-index: 9999;
  text-align: left;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: var(--arrow-x, 50%);
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1e293b;
  }

  &[data-below]::after {
    top: auto;
    bottom: 100%;
    border-top-color: transparent;
    border-bottom-color: #1e293b;
  }
`;

const POPUP_WIDTH = 240;
const GAP = 8;
const MARGIN = 8;

// Dymek stał zawsze NAD elementem (`translateY(-100%)`), więc przy ikonie tuż pod
// górną krawędzią ekranu (nagłówek okna, pierwszy wiersz tabeli) wychodził poza
// ekran i nie dało się go przeczytać. Teraz: nad elementem, gdy tam się mieści;
// inaczej decyduje wspólne placeFloating (pod spodem, a gdy nie mieści się nigdzie -
// większa strona z limitem wysokości). W poziomie wyśrodkowany nad elementem
// i dociśnięty do ekranu.
function placePopup(popup: HTMLDivElement, rect: DOMRect) {
  popup.style.maxHeight = '';
  popup.style.overflowY = '';
  const viewport = visibleViewport();
  // Szerokość ograniczona PRZED pomiarem - zwężony dymek jest wyższy.
  popup.style.maxWidth = `${Math.max(0, viewport.width - 2 * MARGIN)}px`;
  const size = { width: popup.offsetWidth, height: popup.offsetHeight };
  const cx = rect.left + rect.width / 2;
  const placement = placeFloating(
    { top: rect.top, bottom: rect.bottom, left: cx - size.width / 2, right: cx + size.width / 2 },
    size,
    viewport,
    { align: 'left', offset: GAP, margin: MARGIN, bottomReserve: mobileBottomReserve(viewport.width) },
  );
  const fitsAbove = rect.top - GAP - size.height >= MARGIN;
  const top = fitsAbove ? rect.top - GAP - size.height : placement.top;
  if (!fitsAbove && placement.maxHeight < size.height) {
    popup.style.maxHeight = `${placement.maxHeight}px`;
    popup.style.overflowY = 'auto';
  }
  popup.style.top = `${top}px`;
  popup.style.left = `${placement.left}px`;
  popup.style.setProperty(
    '--arrow-x',
    `${Math.min(Math.max(cx - placement.left, 12), size.width - 12)}px`,
  );
  popup.toggleAttribute('data-below', top > rect.top);
  popup.style.visibility = 'visible';
}

interface HoverInfoProps {
  /** Explanation shown while hovering [children]. */
  text: string;
  /** Popup width in px; the default fits one or two sentences. */
  width?: number;
  children: ReactNode;
}

/**
 * Generic hover-triggered explanation, portalled to `document.body` so it is
 * never clipped by a scrollable/overflow:hidden ancestor (a popover card,
 * a modal). Wrap ANY element in it - a disabled-looking toggle, a locked
 * button - to explain why it won't do anything, without needing the native
 * `disabled` attribute (which silently swallows both hover and click).
 */
export function HoverInfo({ text, width = POPUP_WIDTH, children }: HoverInfoProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const show = () => {
    setRect(ref.current?.getBoundingClientRect() ?? null);
  };
  const hide = () => setRect(null);

  useLayoutEffect(() => {
    if (rect && popupRef.current) placePopup(popupRef.current, rect);
  }, [rect, text, width]);

  return (
    <HoverTrigger ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {rect &&
        createPortal(
          <PopupBox ref={popupRef} style={{ width }}>
            {text}
          </PopupBox>,
          document.body,
        )}
    </HoverTrigger>
  );
}

interface InfoTooltipProps {
  text: string;
  width?: number;
}

/** The familiar "i" badge - an explanation with no element of its own to attach to. */
export function InfoTooltip({ text, width }: InfoTooltipProps) {
  return (
    <HoverInfo text={text} width={width}>
      <Wrap>
        <Icon>i</Icon>
      </Wrap>
    </HoverInfo>
  );
}

const TapTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  vertical-align: middle;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.primary};
    outline-offset: 2px;
    border-radius: 50%;
  }
`;

interface TapInfoProps {
  /** Explanation shown after a tap/click on [children]. */
  text: string;
  /** Accessible name of the trigger button (the icon itself has no text). */
  label: string;
  width?: number;
  children: ReactNode;
}

/**
 * Explanation behind a TAP, not a hover. `HoverInfo` does not exist on a phone -
 * there is no hover there, so an icon that explains itself only under the mouse
 * explains nothing to the person standing at the car with the phone. The trigger is
 * a real button (keyboard, screen reader), the mouse still gets the hover preview,
 * and the click is stopped so an icon inside a clickable row does not trigger the row.
 * Closes on a second tap, a tap anywhere else, Escape and scroll.
 */
export function TapInfo({ text, label, width = POPUP_WIDTH, children }: TapInfoProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pinned, setPinned] = useState(false);

  const measure = () => ref.current?.getBoundingClientRect() ?? null;
  const close = () => {
    setPinned(false);
    setRect(null);
  };

  useLayoutEffect(() => {
    if (rect && popupRef.current) placePopup(popupRef.current, rect);
  }, [rect, text, width]);

  useEffect(() => {
    if (!pinned) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    // Dymek jest `position: fixed`, a ikona przewija się razem z listą - po przewinięciu
    // wskazywałby pustkę, więc znika, zamiast gonić ikonę.
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pinned]);

  return (
    <TapTrigger
      ref={ref}
      type="button"
      aria-label={label}
      aria-expanded={pinned}
      onClick={(e) => {
        e.stopPropagation();
        if (pinned) {
          close();
        } else {
          setPinned(true);
          setRect(measure());
        }
      }}
      onMouseEnter={() => { if (!pinned) setRect(measure()); }}
      onMouseLeave={() => { if (!pinned) setRect(null); }}
    >
      {children}
      {rect &&
        createPortal(
          <PopupBox ref={popupRef} role="tooltip" style={{ width }}>
            {text}
          </PopupBox>,
          document.body,
        )}
    </TapTrigger>
  );
}
