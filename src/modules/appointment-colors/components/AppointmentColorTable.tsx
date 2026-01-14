// src/modules/appointment-colors/components/AppointmentColorTable.tsx
import styled from 'styled-components';
import { Badge } from '@/common/components/Badge';
import { t } from '@/common/i18n';
import type { AppointmentColor } from '../types';

const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    min-width: 900px;
    border-collapse: collapse;
    background: ${props => props.theme.colors.surface};
`;

const TableHead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const TableHeaderCell = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    text-align: ${props => props.$align || 'left'};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background-color ${props => props.theme.transitions.fast};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

const TableCell = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    vertical-align: middle;
    text-align: ${props => props.$align || 'left'};
`;

const ColorName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const ColorPreviewWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
`;

const ColorBox = styled.div<{ $color: string }>`
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.md};
    background-color: ${props => props.$color};
    border: 2px solid ${props => props.theme.colors.border};
    box-shadow: ${props => props.theme.shadows.sm};
`;

const ColorHex = styled.span`
    font-family: monospace;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const UserInfo = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
`;

const ActionsCell = styled(TableCell)`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    align-items: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: transparent;
    border: 1px solid ${props => {
        if (props.$variant === 'danger') return props.theme.colors.error;
        return props.theme.colors.border;
    }};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => {
        if (props.$variant === 'danger') return props.theme.colors.error;
        return props.theme.colors.primary;
    }};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => {
            if (props.$variant === 'danger') return props.theme.colors.error;
            return props.theme.colors.primary;
        }};
        color: white;
        border-color: ${props => {
            if (props.$variant === 'danger') return props.theme.colors.error;
            return props.theme.colors.primary;
        }};
    }
`;

interface AppointmentColorTableProps {
    colors: AppointmentColor[];
    onEdit: (color: AppointmentColor) => void;
    onDelete: (color: AppointmentColor) => void;
}

export const AppointmentColorTable = ({ colors, onEdit, onDelete }: AppointmentColorTableProps) => {
    return (
        <TableWrapper>
            <Table>
                <TableHead>
                    <tr>
                        <TableHeaderCell $align="left">Nazwa koloru</TableHeaderCell>
                        <TableHeaderCell $align="left">Kolor</TableHeaderCell>
                        <TableHeaderCell $align="center">Status</TableHeaderCell>
                        <TableHeaderCell $align="left">Dodał</TableHeaderCell>
                        <TableHeaderCell $align="left">Edytował</TableHeaderCell>
                        <TableHeaderCell $align="right">Akcje</TableHeaderCell>
                    </tr>
                </TableHead>
                <TableBody>
                    {colors.map((color) => (
                        <TableRow key={color.id}>
                            <TableCell $align="left">
                                <ColorName>{color.name}</ColorName>
                            </TableCell>
                            <TableCell $align="left">
                                <ColorPreviewWrapper>
                                    <ColorBox $color={color.hexColor} />
                                    <ColorHex>{color.hexColor}</ColorHex>
                                </ColorPreviewWrapper>
                            </TableCell>
                            <TableCell $align="center">
                                <Badge $variant={color.isActive ? 'success' : 'info'}>
                                    {color.isActive ? 'Aktywny' : 'Archiwalny'}
                                </Badge>
                            </TableCell>
                            <TableCell $align="left">
                                <UserInfo>
                                    {color.createdByFirstName} {color.createdByLastName}
                                </UserInfo>
                            </TableCell>
                            <TableCell $align="left">
                                <UserInfo>
                                    {color.updatedByFirstName} {color.updatedByLastName}
                                </UserInfo>
                            </TableCell>
                            <TableCell $align="right">
                                <ActionsCell>
                                    {color.isActive && (
                                        <>
                                            <ActionButton onClick={() => onEdit(color)}>
                                                {t.common.edit}
                                            </ActionButton>
                                            <ActionButton $variant="danger" onClick={() => onDelete(color)}>
                                                Usuń
                                            </ActionButton>
                                        </>
                                    )}
                                </ActionsCell>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableWrapper>
    );
};
