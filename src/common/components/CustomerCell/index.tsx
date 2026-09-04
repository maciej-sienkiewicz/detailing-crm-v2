import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PiiValue } from '@/common/pii';

const Name = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s ease;
`;

const Sub = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
  margin-top: 2px;
  white-space: nowrap;
  transition: color 0.15s ease, opacity 0.15s ease;
`;

const Block = styled.div<{ $clickable?: boolean }>`
  display: flex;
  flex-direction: column;
  ${({ $clickable }) => $clickable && `
    cursor: pointer;
    &:hover ${Name} { color: #93c5fd; }
    &:hover ${Sub}  { color: #93c5fd; opacity: 0.6; }
  `}
`;

interface CustomerCellProps {
  customerId?: string | null;
  name: string;
  sub?: string | null;
  /**
   * Wyłącza przejście do profilu klienta. Na liście dotykowej cała kafelka jest
   * jednym celem - wejście w wizytę - a osobny odnośnik w jej środku znaczy
   * tylko tyle, że trafia się nie tam, gdzie się chciało.
   */
  disableNavigation?: boolean;
}

export const CustomerCell: React.FC<CustomerCellProps> = ({ customerId, name, sub, disableNavigation }) => {
  const navigate = useNavigate();
  const clickable = !!customerId && !disableNavigation;

  return (
    <Block
      $clickable={clickable}
      onClick={clickable ? e => { e.stopPropagation(); navigate(`/customers/${customerId}`); } : undefined}
    >
      <Name><PiiValue value={name} kind="name" /></Name>
      {sub && <Sub><PiiValue value={sub} kind="phone" /></Sub>}
    </Block>
  );
};
