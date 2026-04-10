import styled from 'styled-components';
import type { EmployeeStatus } from '../types';

const Badge = styled.span<{ $status: EmployeeStatus }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2px;
    ${({ $status }) =>
        $status === 'ACTIVE'
            ? 'background: rgba(16,185,129,0.12); color: #059669;'
            : 'background: rgba(239,68,68,0.10); color: #DC2626;'}
`;

const Dot = styled.span<{ $status: EmployeeStatus }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $status }) => ($status === 'ACTIVE' ? '#059669' : '#DC2626')};
`;

interface Props {
    status: EmployeeStatus;
}

export const EmployeeStatusBadge = ({ status }: Props) => (
    <Badge $status={status}>
        <Dot $status={status} />
        {status === 'ACTIVE' ? 'Aktywny' : 'Zwolniony'}
    </Badge>
);
