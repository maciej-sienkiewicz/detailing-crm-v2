import styled, { keyframes } from 'styled-components';

// ─── Spring expand animation ──────────────────────────────────────────────────
// translate(-50%,-50%) is baked in so it combines with center positioning

export const springOpen = keyframes`
  0%   { transform: translate(-50%, -50%) scale(0.04); opacity: 0; }
  38%  { transform: translate(-50%, -50%) scale(1.07); opacity: 1; }
  58%  { transform: translate(-50%, -50%) scale(0.96); opacity: 1; }
  74%  { transform: translate(-50%, -50%) scale(1.03); opacity: 1; }
  88%  { transform: translate(-50%, -50%) scale(0.99); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
`;

export const springClose = keyframes`
  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
  25%  { transform: translate(-50%, -50%) scale(1.04); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.04); opacity: 0; }
`;

// ─── Typewriter cursor blink ──────────────────────────────────────────────────

export const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
`;

// ─── Blur reveal ─────────────────────────────────────────────────────────────

export const unblur = keyframes`
  from { filter: blur(6px); opacity: 0.55; }
  to   { filter: blur(0);   opacity: 1;    }
`;

// ─── Compose window overlay ───────────────────────────────────────────────────

export const Overlay = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: all;
  /* subtle dimming behind the window */
  background: rgba(0, 0, 0, ${({ $closing }) => ($closing ? 0 : 0.25)});
  transition: background 0.3s ease;
`;

export const ComposeWindow = styled.div<{ $closing: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  /* translate is part of the keyframe so we don't set it here */
  width: 620px;
  height: 680px;
  display: flex;
  flex-direction: column;
  background: rgba(240, 242, 245, 0.97);
  backdrop-filter: blur(24px) saturate(180%);
  border-radius: 14px;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.18),
    0 24px 64px rgba(0, 0, 0, 0.36),
    0 4px 12px rgba(0, 0, 0, 0.14);
  overflow: hidden;
  transform-origin: center center;
  pointer-events: all;

  animation: ${({ $closing }) => ($closing ? springClose : springOpen)}
    ${({ $closing }) => ($closing ? '200ms' : '500ms')}
    cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
`;

// ─── Title bar ────────────────────────────────────────────────────────────────

export const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  background: rgba(215, 218, 224, 0.85);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.12);
  user-select: none;
  flex-shrink: 0;
  cursor: default;
`;

export const TrafficLights = styled.div`
  display: flex;
  gap: 7px;
  flex-shrink: 0;
`;

export const TrafficLight = styled.button<{ $color: 'red' | 'yellow' | 'green' }>`
  width: 13px;
  height: 13px;
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

  box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.3);

  border: 0.5px solid ${({ $color }) =>
    $color === 'red'
      ? 'rgba(200,40,30,0.3)'
      : $color === 'yellow'
      ? 'rgba(180,120,0,0.3)'
      : 'rgba(20,150,40,0.3)'};

  &:hover { filter: brightness(0.88); }
`;

export const TitleBarText = styled.span`
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #3a3a3a;
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
  padding: 0 16px;
  min-height: 36px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  gap: 10px;
  flex-shrink: 0;
`;

export const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #888;
  width: 48px;
  flex-shrink: 0;
`;

export const FieldInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 13.5px;
  color: #1c1c1e;
  padding: 4px 0;

  &::placeholder { color: #bbb; }
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
  font-size: 13.5px;
  line-height: 1.65;
  color: #1c1c1e;
  padding: 14px 16px;
  resize: none;
  box-sizing: border-box;

  filter: ${({ $blurred }) => ($blurred ? 'blur(5px)' : 'blur(0)')};
  opacity: ${({ $blurred }) => ($blurred ? 0.65 : 1)};

  /* unblur animation fires once on reveal */
  animation: ${({ $revealed }) => ($revealed ? unblur : 'none')} 0.75s ease forwards;
`;

export const TypewriterCursor = styled.span<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  position: absolute;
  /* tracks last typed line — positioned at top-left so it floats while text grows */
  bottom: 18px;
  left: 16px;
  width: 2px;
  height: 17px;
  background: rgba(28, 28, 30, 0.75);
  border-radius: 1px;
  animation: ${blink} 0.75s step-end infinite;
  pointer-events: none;
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 11px 16px;
  background: rgba(215, 218, 224, 0.75);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  gap: 10px;
  flex-shrink: 0;
`;

export const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: #007aff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, opacity 0.2s;

  &:hover:not(:disabled) { background: #0062cc; }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.4; cursor: default; }

  svg { width: 14px; height: 14px; }
`;

export const LoadingDots = styled.span`
  font-size: 12px;
  color: #888;
  font-style: italic;
  margin-right: auto;
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
