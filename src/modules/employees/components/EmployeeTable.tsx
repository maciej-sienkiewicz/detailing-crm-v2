import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { EmployeeListItem } from '../types';

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Thead = styled.thead`
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
`;

const Th = styled.th`
    padding: 11px 16px;
    text-align: left;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const Td = styled.td`
    padding: 13px 16px;
    font-size: ${st.fontSm};
    color: ${st.text};
    vertical-align: middle;
`;

const NameCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const FullName = styled.span`
    font-weight: 600;
    color: ${st.text};
`;

const AccountBadge = styled.span<{ $hasAccount: boolean }>`
    padding: 2px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $hasAccount }) => ($hasAccount
        ? 'background: rgba(14,165,233,0.10); color: #0284C7;'
        : 'background: rgba(100,116,139,0.10); color: #64748B;')}
`;

const ContactLine = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const EmptyRow = styled.tr``;

const EmptyCell = styled.td`
    padding: 48px 24px;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

interface Props {
    employees: EmployeeListItem[];
}

export const EmployeeTable = ({ employees }: Props) => {
    const navigate = useNavigate();

    if (employees.length === 0) {
        return (
            <Table>
                <Tbody>
                    <EmptyRow>
                        <EmptyCell colSpan={5}>Brak pracowników do wyświetlenia</EmptyCell>
                    </EmptyRow>
                </Tbody>
            </Table>
        );
    }

    return (
        <Table>
            <Thead>
                <tr>
                    <Th>Pracownik</Th>
                    <Th>Kontakt</Th>
                    <Th>Konto</Th>
                </tr>
            </Thead>
            <Tbody>
                {employees.map(emp => (
                    <Tr key={emp.id} onClick={() => navigate(`/team/${emp.id}`)}>
                        <Td>
                            <NameCell>
                                <FullName>{emp.fullName}</FullName>
                            </NameCell>
                        </Td>
                        <Td>
                            <ContactLine>
                                {emp.email && <span>{emp.email}</span>}
                                {emp.phone && <span>{emp.phone}</span>}
                                {!emp.email && !emp.phone && <span>—</span>}
                            </ContactLine>
                        </Td>
                        <Td>
                            <AccountBadge $hasAccount={emp.hasAccount}>
                                {emp.hasAccount ? 'Ma konto' : 'Brak konta'}
                            </AccountBadge>
                        </Td>
                    </Tr>
                ))}
            </Tbody>
        </Table>
    );
};
