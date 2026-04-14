import { useState } from 'react';
import { useBonuses, useCreateBonus, useDeleteBonus } from '../hooks/useBonuses';
import type { BonusStatus, CreateBonusPayload } from '../types';
import {
    Field, Label, Input, Textarea,
    CancelBtn, ErrorMsg, Spinner,
    Overlay, ModalBox, ModalTitle, FormActions,
    Section, TopRow, SectionTitle, EmptyText,
    OutlineGreenBtn, OutlineRedBtn,
    TableWrapper, Table, Thead, Th, Tbody, Tr, Td, TdMuted,
    Actions, PeriodInput,
    AmountCell, StatusBadge, DeleteBtn, NotesCell, SaveBonusBtn,
} from './BonusesTab.styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Math.abs(cents) / 100);

const STATUS_LABELS: Record<BonusStatus, string> = {
    PENDING: 'Oczekujący',
    INCLUDED_IN_PAYROLL: 'Rozliczony',
};

// ─── Add / deduction modal ────────────────────────────────────────────────────

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
                <FormActions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBonusBtn $danger={mode === 'deduction'} onClick={handleSave} disabled={saving}>
                        {saving ? 'Zapisywanie...' : mode === 'bonus' ? 'Dodaj bonus' : 'Dodaj potrącenie'}
                    </SaveBonusBtn>
                </FormActions>
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
                    <OutlineGreenBtn onClick={() => setModal('bonus')}>+ Dodaj bonus</OutlineGreenBtn>
                    <OutlineRedBtn onClick={() => setModal('deduction')}>− Dodaj potrącenie</OutlineRedBtn>
                </Actions>
            </TopRow>

            {deleteError && <ErrorMsg>{deleteError}</ErrorMsg>}

            {isLoading ? (
                <Spinner />
            ) : bonuses.length === 0 ? (
                <EmptyText>Brak bonusów i potrąceń dla wybranego okresu.</EmptyText>
            ) : (
                <TableWrapper>
                    <Table>
                        <Thead>
                            <tr>
                                <Th>Nazwa</Th>
                                <Th>Okres</Th>
                                <Th>Dodano</Th>
                                <Th>Notatki</Th>
                                <Th>Kwota</Th>
                                <Th>Status</Th>
                                <Th></Th>
                            </tr>
                        </Thead>
                        <Tbody>
                            {bonuses.map(bonus => (
                                <Tr key={bonus.id}>
                                    <Td>{bonus.name}</Td>
                                    <TdMuted>{bonus.period}</TdMuted>
                                    <TdMuted>
                                        {new Date(bonus.createdAt).toLocaleDateString('pl-PL')}
                                    </TdMuted>
                                    <Td>
                                        {bonus.notes
                                            ? <NotesCell>{bonus.notes}</NotesCell>
                                            : <TdMuted as="span">—</TdMuted>}
                                    </Td>
                                    <Td>
                                        <AmountCell $negative={bonus.amountCents < 0}>
                                            {bonus.amountCents < 0 ? '−' : '+'}{formatCents(bonus.amountCents)}
                                        </AmountCell>
                                    </Td>
                                    <Td>
                                        <StatusBadge $status={bonus.status}>
                                            {STATUS_LABELS[bonus.status]}
                                        </StatusBadge>
                                    </Td>
                                    <Td>
                                        {bonus.status === 'PENDING' && (
                                            <DeleteBtn
                                                onClick={() => handleDelete(bonus.id)}
                                                disabled={deletingId === bonus.id}
                                            >
                                                {deletingId === bonus.id ? '...' : 'Usuń'}
                                            </DeleteBtn>
                                        )}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableWrapper>
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
