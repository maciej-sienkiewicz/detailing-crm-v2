import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

interface Props {
    profiles: ProfileSummary[];
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${st.border};
`;

const Title = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const TableScroll = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const Th = styled.th<{ $first?: boolean }>`
    padding: 10px 16px;
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    font-weight: 600;
    font-size: ${st.fontXs};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
    text-align: ${p => p.$first ? 'left' : 'center'};
    min-width: ${p => p.$first ? '160px' : '140px'};
`;

const ThProfile = styled.th`
    padding: 10px 16px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
    text-align: center;
    min-width: 140px;
`;

const ProfileHandle = styled.div`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const ProfileSyncDate = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 2px;
    font-weight: 400;
`;

const Tr = styled.tr`
    &:last-child td { border-bottom: none; }
    &:hover td { background: ${st.bgCardAlt}; }
`;

const TdLabel = styled.td`
    padding: 12px 16px;
    border-bottom: 1px solid ${st.border};
    color: ${st.textSecondary};
    font-weight: 500;
    vertical-align: middle;
    white-space: nowrap;
`;

const Td = styled.td`
    padding: 12px 16px;
    border-bottom: 1px solid ${st.border};
    text-align: center;
    vertical-align: middle;
`;

const CheckIcon = styled.span<{ $ok: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${p => p.$ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.09)'};
    color: ${p => p.$ok ? '#059669' : '#dc2626'};
    flex-shrink: 0;
`;

const CategoryText = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    font-weight: 500;
`;

const NullDash = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const AccountTypeBadge = styled.span<{ $type: number | null }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    background: ${p =>
        p.$type === 3 ? 'rgba(14,165,233,0.1)' :
        p.$type === 2 ? 'rgba(139,92,246,0.1)' :
        st.bgCardAlt};
    color: ${p =>
        p.$type === 3 ? st.accentBlue :
        p.$type === 2 ? '#7c3aed' :
        st.textMuted};
`;

const RowGroupLabel = styled.td`
    padding: 6px 16px 4px;
    border-bottom: 1px solid ${st.border};
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: ${st.bgCardAlt};
    opacity: 0.7;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABEL: Record<number, string> = {
    1: 'Osobiste',
    2: 'Twórcy',
    3: 'Profesjonalne',
};

const fmtSync = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `Sync ${d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}`;
};

const Bool = ({ value }: { value: boolean | null }) => {
    if (value === null) return <NullDash>—</NullDash>;
    return (
        <CheckIcon $ok={value}>
            {value ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            )}
        </CheckIcon>
    );
};

// ─── Rows definition ──────────────────────────────────────────────────────────

interface CheckRow {
    kind: 'check';
    label: string;
    getValue: (p: ProfileSummary) => boolean | null;
}

interface TextRow {
    kind: 'text';
    label: string;
    renderValue: (p: ProfileSummary) => React.ReactNode;
}

type RowDef = CheckRow | TextRow;

const ROWS: RowDef[] = [
    {
        kind: 'check',
        label: 'Link w bio',
        getValue: p => p.externalUrl != null ? true : (p.detailsLastSyncedAt != null ? false : null),
    },
    {
        kind: 'check',
        label: 'Dane kontaktowe',
        getValue: p => p.hasContactData,
    },
    {
        kind: 'check',
        label: 'Konto profesjonalne',
        getValue: p => {
            if (p.accountType === null) return null;
            return p.accountType === 3 || p.isBusiness === true;
        },
    },
    {
        kind: 'check',
        label: 'Zweryfikowane',
        getValue: p => p.isVerified,
    },
    {
        kind: 'check',
        label: 'Konto publiczne',
        getValue: p => p.isPrivate === null ? null : !p.isPrivate,
    },
    {
        kind: 'text',
        label: 'Kategoria',
        renderValue: p =>
            p.category
                ? <CategoryText>{p.category}</CategoryText>
                : (p.detailsLastSyncedAt ? <NullDash>—</NullDash> : <NullDash>—</NullDash>),
    },
    {
        kind: 'text',
        label: 'Typ konta',
        renderValue: p =>
            p.accountType != null
                ? <AccountTypeBadge $type={p.accountType}>{ACCOUNT_TYPE_LABEL[p.accountType] ?? `Typ ${p.accountType}`}</AccountTypeBadge>
                : <NullDash>—</NullDash>,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileSeoCard = ({ profiles }: Props) => {
    if (profiles.length === 0) return null;

    return (
        <Wrapper>
            <Header>
                <Title>Profil SEO &amp; widoczność</Title>
            </Header>
            <TableScroll>
                <Table>
                    <thead>
                        <tr>
                            <Th $first>Atrybut</Th>
                            {profiles.map(p => (
                                <ThProfile key={p.id}>
                                    <ProfileHandle>@{p.username}</ProfileHandle>
                                    {p.detailsLastSyncedAt && (
                                        <ProfileSyncDate>{fmtSync(p.detailsLastSyncedAt)}</ProfileSyncDate>
                                    )}
                                </ThProfile>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map(row => (
                            <Tr key={row.label}>
                                <TdLabel>{row.label}</TdLabel>
                                {profiles.map(p => (
                                    <Td key={p.id}>
                                        {row.kind === 'check'
                                            ? <Bool value={row.getValue(p)} />
                                            : row.renderValue(p)
                                        }
                                    </Td>
                                ))}
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </TableScroll>
        </Wrapper>
    );
};
