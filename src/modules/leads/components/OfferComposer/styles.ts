import styled, { keyframes } from 'styled-components';

// ─── Spring expand animation ──────────────────────────────────────────────────
// Simulates a sitcom/macOS-style window popping open from bottom-right

export const springOpen = keyframes`
  0%   { transform: scale(0.05) translate(45%, 45%); opacity: 0; }
  40%  { transform: scale(1.06) translate(0, 0);    opacity: 1; }
  60%  { transform: scale(0.97) translate(0, 0);    opacity: 1; }
  75%  { transform: scale(1.02) translate(0, 0);    opacity: 1; }
  88%  { transform: scale(0.99) translate(0, 0);    opacity: 1; }
  100% { transform: scale(1)    translate(0, 0);    opacity: 1; }
`;

export const springClose = keyframes`
  0%   { transform: scale(1)    translate(0, 0);    opacity: 1; }
  30%  { transform: scale(1.03) translate(0, 0);    opacity: 1; }
  100% { transform: scale(0.05) translate(45%, 45%); opacity: 0; }
`;

// ─── Typewriter cursor blink ──────────────────────────────────────────────────

export const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
`;

// ─── Blur reveal ─────────────────────────────────────────────────────────────

export const unblur = keyframes`
  from { filter: blur(6px); opacity: 0.5; }
  to   { filter: blur(0);   opacity: 1;   }
`;

// ─── Compose window overlay ───────────────────────────────────────────────────

export const Overlay = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none; /* allow clicks through to page */
`;

export const ComposeWindow = styled.div<{ $closing: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 32px;
  width: 520px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  background: rgba(240, 242, 245, 0.96);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 12px;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.18),
    0 8px 32px rgba(0, 0, 0, 0.28),
    0 2px 6px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transform-origin: bottom right;
  pointer-events: all;

  animation: ${({ $closing }) => ($closing ? springClose : springOpen)} ${({ $closing }) => ($closing ? '220ms' : '480ms')} cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
`;

// ─── Title bar ────────────────────────────────────────────────────────────────

export const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(220, 223, 228, 0.8);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.12);
  user-select: none;
  flex-shrink: 0;
  cursor: default;
`;

export const TrafficLights = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

export const TrafficLight = styled.button<{ $color: 'red' | 'yellow' | 'green' }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: filter 0.1s;

  background: ${({ $color }) =>
    $color === 'red'
      ? '#ff5f57'
      : $color === 'yellow'
      ? '#febc2e'
      : '#28c840'};

  border: 0.5px solid ${({ $color }) =>
    $color === 'red'
      ? 'rgba(200,40,30,0.3)'
      : $color === 'yellow'
      ? 'rgba(180,120,0,0.3)'
      : 'rgba(20,150,40,0.3)'};

  &:hover {
    filter: brightness(0.9);
  }
`;

export const TitleBarText = styled.span`
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #3d3d3d;
  letter-spacing: -0.01em;
`;

// ─── Form area ────────────────────────────────────────────────────────────────

export const FormArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

export const FieldRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0 14px;
  min-height: 32px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  gap: 8px;
  flex-shrink: 0;
`;

export const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #888;
  width: 44px;
  flex-shrink: 0;
`;

export const FieldInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  color: #1c1c1e;
  padding: 4px 0;

  &::placeholder {
    color: #bbb;
  }
`;

export const BodyWrapper = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
`;

export const BodyTextarea = styled.textarea<{ $blurred: boolean; $revealed: boolean }>`
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #1c1c1e;
  padding: 12px 14px;
  resize: none;
  box-sizing: border-box;
  transition: filter 0.6s ease, opacity 0.6s ease;

  filter: ${({ $blurred }) => ($blurred ? 'blur(5px)' : 'blur(0)')};
  opacity: ${({ $blurred }) => ($blurred ? 0.6 : 1)};

  animation: ${({ $revealed }) => ($revealed ? unblur : 'none')} 0.7s ease forwards;
`;

export const TypewriterCursor = styled.span<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? 'inline-block' : 'none')};
  position: absolute;
  bottom: 16px;
  left: 14px;
  width: 2px;
  height: 16px;
  background: #1c1c1e;
  animation: ${blink} 0.8s step-end infinite;
  pointer-events: none;
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 10px 14px;
  background: rgba(220, 223, 228, 0.7);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  gap: 8px;
  flex-shrink: 0;
`;

export const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: #007aff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;

  &:hover { background: #0062cc; }
  &:active { transform: scale(0.97); }

  svg { width: 14px; height: 14px; }
`;

export const LoadingDots = styled.span`
  font-size: 12px;
  color: #888;
  font-style: italic;
`;

// ─── Trigger button ───────────────────────────────────────────────────────────

export const PrepareOfferBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1.5px solid rgb(14, 165, 233);
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: rgb(14, 165, 233);
  background: rgba(14, 165, 233, 0.06);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;

  &:hover {
    background: rgba(14, 165, 233, 0.12);
    border-color: rgb(2, 132, 199);
    color: rgb(2, 132, 199);
  }

  &:active { transform: scale(0.97); }

  svg { width: 14px; height: 14px; }
`;
