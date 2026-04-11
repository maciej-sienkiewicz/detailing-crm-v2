import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useBonuses, useCreateBonus, useDeleteBonus } from '../hooks/useBonuses';
import type { BonusStatus, CreateBonusPayload } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

const PeriodInput = styled.input`
    padding: 7px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

const AddBtn = styled.button`
    padding: 7px 14px;
    background: ${st.accentGreen};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:hover { background: #059669; }
`;

const DeductBtn = styled.button`
    padding: 7px 14px;
    background: ${st.accentRed};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:hover { opacity: 0.85; }
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const CardMain = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const BonusName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const BonusMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const BonusNotes = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-style: italic;
`;

const Amount = styled.span<{ $negative: boolean }>`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${({ $negative }) => ($negative ? st.accentRed : st.accentGreen)};
    white-space: nowrap;
`;

const StatusBadge = styled.span<{ $status: BonusStatus }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    ${({ $status }) =>
        $status === 'PENDING'
            ? 'background: rgba(245,158,11,0.12); color: #D97706;'
            : 'background: rgba(59,130,246,0.12); color: #2563EB;'}
`;

const DeleteBtn = styled.button`
    padding: 4px 10px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    cursor: pointer;
    &:hover { background: rgba(239,68,68,0.08); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmptyText = styled.p`
    margin: 0;
    padding: 32px 0;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 32px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Modal ────────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 24px;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ModalTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

const Textarea = styled.textarea`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 60px;
    &:focus { border-color: ${st.accentBlue}; }
`;

const ModalActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const CancelBtn = styled.button`
    padding: 7px 14px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
`;

const SaveBtn = styled.button<{ $danger?: boolean }>`
    padding: 7px 16px;
    background: ${({ $danger }) => ($danger ? st.accentRed : st.accentGreen)};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Math.abs(cents) / 100);

const STATUS_LABELS: Record<BonusStatus, string> = {
    PENDING: 'Oczekujący',
    INCLUDED_IN_PAYROLL: 'Wliczony w payroll',
};

// ─── Add/deduction modal ──────────────────────────────────────────────────────

interface ModalProps {
    mode: 'bonus' | 'deduction';
    defaultPeriod: string;
    onClose: () => void;
    onSave: (payload: CreateBonusPayload) => Promise<void>;
}

const AddBonusModal = ({ mode, defaultPeriod, onClose, onSave }: ModalProps) => {
    const [form, setForm] = useState({ period: defaultPeriod, name: '', amount: '', notes: '' });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.period) { setError('Wybierz miesiąc.'); return; }
        if (!form.name.trim()) { setError('Podaj nazwę.'); return; }
        const amountPLN = parseFloat(form.amount);
        if (!form.amount || isNaN(amountPLN) || amountPLN <= 0) {
            setError('Podaj poprawną kwotę (większą od zera).');
            return;
        }
        setError('');
        setSaving(true);
        const amountCents = Math.round(amountPLN * 100);
        try {
            await onSave({
                period: form.period,
                name: form.name.trim(),
                amountCents: mode === 'deduction' ? -amountCents : amountCents,
                notes: form.notes.trim() || undefined,
            });
            onClose();
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        } finally {
            setSaving(false);
        }
    };

    const title = mode === 'bonus' ? 'Dodaj bonus / dodatek' : 'Dodaj potrącenie';
    const amountLabel = mode === 'bonus' ? 'Kwota (PLN)' : 'Kwota potrącenia (PLN)';

    return (
        <Overlay onClick={onClose}>
            <ModalBox onClick={e => e.stopPropagation()}>
                <ModalTitle>{title}</ModalTitle>
                <Field>
                    <Label>Miesiąc</Label>
                    <Input
                        type="month"
                        value={form.period}
                        onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                    />
                </Field>
                <Field>
                    <Label>Nazwa</Label>
                    <Input
                        type="text"
                        placeholder={mode === 'bonus' ? 'np. Premia uznaniowa Q1' : 'np. Korekta nadpłaty za luty'}
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                </Field>
                <Field>
                    <Label>{amountLabel}</Label>
                    <Input
                        type="number"
                        placeholder="np. 500.00"
                        min={0}
                        step={0.01}
                        value={form.amount}
                        onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    />
                </Field>
                <Field>
                    <Label>Notatki (opcjonalne)</Label>
                    <Textarea
                        placeholder="np. Za realizację projektu X"
                        value={form.notes}
                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    />
                </Field>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <ModalActions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn $danger={mode === 'deduction'} onClick={handleSave} disabled={saving}>
                        {saving ? 'Zapisywanie...' : mode === 'bonus' ? 'Dodaj bonus' : 'Dodaj potrącenie'}
                    </SaveBtn>
                </ModalActions>
            </ModalBox>
        </Overlay>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { employeeId: string; }

export const BonusesTab = ({ employeeId }: Props) => {
    const [period, setPeriod] = useState(currentMonth());
    const [modal, setModal] = useState<'bonus' | 'deduction' | null>(null);

    const { bonuses, isLoading } = useBonuses(employeeId, period);
    const createBonus = useCreateBonus(employeeId);
    const deleteBonus = useDeleteBonus(employeeId);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const handleDelete = async (bonusEntryId: string) => {
        setDeletingId(bonusEntryId);
        setDeleteError('');
        try {
            await deleteBonus.mutateAsync(bonusEntryId);
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setDeleteError(msg ?? 'Nie udało się usunąć wpisu.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Section>
            <TopRow>
                <SectionTitle>Bonusy i dodatki</SectionTitle>
                <Actions>
                    <PeriodInput
                        type="month"
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                    />
                    <AddBtn onClick={() => setModal('bonus')}>+ Dodaj bonus</AddBtn>
                    <DeductBtn onClick={() => setModal('deduction')}>− Dodaj potrącenie</DeductBtn>
                </Actions>
            </TopRow>

            {deleteError && <ErrorMsg>{deleteError}</ErrorMsg>}

            {isLoading ? (
                <Spinner />
            ) : bonuses.length === 0 ? (
                <EmptyText>Brak bonusów i potrąceń dla wybranego okresu.</EmptyText>
            ) : (
                bonuses.map(bonus => (
                    <Card key={bonus.id}>
                        <CardMain>
                            <BonusName>{bonus.name}</BonusName>
                            <BonusMeta>
                                Okres: {bonus.period}
                                {' · '}
                                Dodano: {new Date(bonus.createdAt).toLocaleDateString('pl-PL')}
                            </BonusMeta>
                            {bonus.notes && <BonusNotes>{bonus.notes}</BonusNotes>}
                        </CardMain>
                        <Amount $negative={bonus.amountCents < 0}>
                            {bonus.amountCents < 0 ? '−' : '+'}{formatCents(bonus.amountCents)}
                        </Amount>
                        <StatusBadge $status={bonus.status}>{STATUS_LABELS[bonus.status]}</StatusBadge>
                        {bonus.status === 'PENDING' && (
                            <DeleteBtn
                                onClick={() => handleDelete(bonus.id)}
                                disabled={deletingId === bonus.id}
                            >
                                {deletingId === bonus.id ? '...' : 'Usuń'}
                            </DeleteBtn>
                        )}
                    </Card>
                ))
            )}

            {modal && (
                <AddBonusModal
                    mode={modal}
                    defaultPeriod={period}
                    onClose={() => setModal(null)}
                    onSave={payload => createBonus.mutateAsync(payload)}
                />
            )}
        </Section>
    );
};
