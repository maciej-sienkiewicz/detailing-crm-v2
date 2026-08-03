import { useRef, useState } from 'react';
import styled from 'styled-components';

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 5px;
  vertical-align: middle;
  flex-shrink: 0;
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

const Popup = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: fixed;
  left: ${(p) => p.$x}px;
  bottom: ${(p) => p.$y}px;
  transform: translateX(-50%);
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
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 120ms ease;
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

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, visible: false });

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        x: rect.left + rect.width / 2,
        y: window.innerHeight - rect.top + 8,
        visible: true,
      });
    }
  };
  const hide = () => setPos((p) => ({ ...p, visible: false }));

  return (
    <Wrap ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      <Icon>i</Icon>
      <Popup $x={pos.x} $y={pos.y} $visible={pos.visible}>{text}</Popup>
    </Wrap>
  );
}
