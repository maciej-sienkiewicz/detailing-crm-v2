import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

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
const PopupBox = styled.div`
  position: fixed;
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
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1e293b;
  }
`;

const POPUP_WIDTH = 240;
const GAP = 8;

interface HoverInfoProps {
  /** Explanation shown while hovering [children]. */
  text: string;
  children: ReactNode;
}

/**
 * Generic hover-triggered explanation, portalled to `document.body` so it is
 * never clipped by a scrollable/overflow:hidden ancestor (a popover card,
 * a modal). Wrap ANY element in it - a disabled-looking toggle, a locked
 * button - to explain why it won't do anything, without needing the native
 * `disabled` attribute (which silently swallows both hover and click).
 */
export function HoverInfo({ text, children }: HoverInfoProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const show = () => {
    setRect(ref.current?.getBoundingClientRect() ?? null);
  };
  const hide = () => setRect(null);

  // Clamp horizontally so the popup never bleeds off screen.
  const cx = rect ? rect.left + rect.width / 2 : 0;
  const clampedLeft = Math.max(
    POPUP_WIDTH / 2 + 8,
    Math.min(window.innerWidth - POPUP_WIDTH / 2 - 8, cx),
  );

  return (
    <HoverTrigger ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {rect &&
        createPortal(
          <PopupBox
            style={{
              left: clampedLeft,
              top: rect.top - GAP,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            {text}
          </PopupBox>,
          document.body,
        )}
    </HoverTrigger>
  );
}

interface InfoTooltipProps {
  text: string;
}

/** The familiar "i" badge - an explanation with no element of its own to attach to. */
export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <HoverInfo text={text}>
      <Wrap>
        <Icon>i</Icon>
      </Wrap>
    </HoverInfo>
  );
}
