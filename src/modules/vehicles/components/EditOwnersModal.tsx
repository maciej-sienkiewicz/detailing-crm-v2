// src/modules/vehicles/components/EditOwnersModal.tsx
//
// Właściciele pojazdu: lista z rolami, usuwanie i DODAWANIE.
//
// Przycisk „+ Dodaj właściciela" był tu wypełnionym paskiem na całą szerokość okna -
// bez żadnej akcji. Kliknięcie nie robiło nic, a to dokładnie ten rodzaj błędu,
// od którego zaczęła się przebudowa („klikaliśmy i nic się nie działo"). Backend
// przyjmuje przypisanie (POST /vehicles/{id}/owners), więc okno ma teraz drugi
// krok: wyszukanie klienta w kartotece, wybór roli i zapis.
//
// Usunięcie pyta oknem potwierdzenia (wcześniej systemowy `confirm` i `alert`).
// Ostatniego właściciela nie da się usunąć - mówimy to przy wierszu, zamiast
// wygaszać przycisk bez słowa.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useDebounce } from '@/common/hooks';
import { useCustomers } from '@/modules/customers/hooks/useCustomers';
import type { Customer } from '@/modules/customers/types';
import {
    Button, ChoiceCard, ChoiceList, Notice, Segmented, StatusPill, ui, type PillTone,
} from '@/common/components/ui';
import type { OwnershipRole, VehicleOwner } from '../types';
import { useOwnerManagement } from '../hooks/useOwnerManagement';

const ROLE: Record<OwnershipRole, { label: string; tone: PillTone }> = {
    PRIMARY: { label: 'Właściciel', tone: 'ok' },
    CO_OWNER: { label: 'Współwłaściciel', tone: 'neutral' },
    COMPANY: { label: 'Firma', tone: 'info' },
};

const List = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Row = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid ${ui.lineFaint};

    &:first-child { border-top: none; padding-top: 0; }
`;

const RowText = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
    flex: 1;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
`;

const Hint = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Label = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const SearchBox = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px;
    border: 1.5px solid ${ui.line};
    border-radius: 10px;
    background: ${ui.surface};
    color: ${ui.textMuted};

    &:focus-within { border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
    svg { width: 16px; height: 16px; flex-shrink: 0; }
    input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 16px; color: ${ui.ink}; }
    @media (min-width: 768px) { input { font-size: 14px; } }
`;

const Results = styled.div`
    max-height: 280px;
    overflow-y: auto;
    overscroll-behavior: contain;
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const FooterSplit = styled(ModalFooter)`
    justify-content: space-between;
`;

const customerName = (c: Customer) => [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Klient bez nazwy';

interface EditOwnersModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string;
    owners: VehicleOwner[];
}

export const EditOwnersModal = ({ isOpen, onClose, vehicleId, owners }: EditOwnersModalProps) => {
    const { removeOwner, isRemoving, assignOwner, isAssigning } = useOwnerManagement(vehicleId);
    const { showSuccess, showError } = useToast();

    const [mode, setMode] = useState<'list' | 'add'>('list');
    const [toRemove, setToRemove] = useState<VehicleOwner | null>(null);
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState<Customer | null>(null);
    const [role, setRole] = useState<OwnershipRole>('CO_OWNER');

    const debounced = useDebounce(search, 250);
    const filters = useMemo(() => ({ search: debounced, page: 1, limit: 20 }), [debounced]);
    const { customers, isLoading } = useCustomers(filters);
    const ownerIds = new Set(owners.map(o => o.customerId));
    const candidates = customers.filter(c => !ownerIds.has(c.id));

    const close = () => {
        setMode('list');
        setPicked(null);
        setSearch('');
        onClose();
    };

    const startAdd = () => {
        setPicked(null);
        setSearch('');
        // Pierwszy przypisany zostaje właścicielem, kolejny - współwłaścicielem.
        setRole(owners.length === 0 ? 'PRIMARY' : 'CO_OWNER');
        setMode('add');
    };

    const add = () => {
        if (!picked) return;
        assignOwner({ customerId: picked.id, role }, {
            onSuccess: () => {
                showSuccess('Właściciel dodany', `${customerName(picked)} jako ${ROLE[role].label.toLowerCase()}.`);
                setMode('list');
                setPicked(null);
            },
            onError: () => showError('Nie udało się dodać właściciela', 'Spróbuj ponownie za chwilę.'),
        });
    };

    const remove = () => {
        if (!toRemove) return;
        const name = toRemove.customerName;
        removeOwner(toRemove.customerId, {
            onSuccess: () => showSuccess('Właściciel usunięty', `${name} nie jest już przypisany do pojazdu.`),
            onError: () => showError('Nie udało się usunąć właściciela', 'Spróbuj ponownie za chwilę.'),
        });
        setToRemove(null);
    };

    return (
        <ModalShell isOpen={isOpen} onClose={close} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{mode === 'list' ? 'Właściciele pojazdu' : 'Dodaj właściciela'}</ModalTitle>
                    <ModalSubtitle>
                        {mode === 'list'
                            ? 'Kto może przyjeżdżać tym autem i dostaje jego dokumenty'
                            : 'Wybierz klienta z kartoteki i jego rolę'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={close} />
            </ModalHeader>

            <ModalContent>
                {mode === 'list' ? (
                    owners.length === 0 ? (
                        <Muted>Pojazd nie ma jeszcze właściciela.</Muted>
                    ) : (
                        <List>
                            {owners.map(owner => {
                                const last = owners.length === 1;
                                return (
                                    <Row key={owner.customerId}>
                                        <RowText>
                                            <strong>{owner.customerName}</strong>
                                            <StatusPill $tone={ROLE[owner.role]?.tone ?? 'neutral'}>{ROLE[owner.role]?.label ?? owner.role}</StatusPill>
                                            {last && <Hint>Jedyny właściciel, najpierw dodaj kolejnego, żeby go usunąć.</Hint>}
                                        </RowText>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={isRemoving || last}
                                            onClick={() => setToRemove(owner)}
                                        >
                                            Usuń
                                        </Button>
                                    </Row>
                                );
                            })}
                        </List>
                    )
                ) : (
                    <Stack>
                        <SearchBox>
                            <Search aria-hidden="true" />
                            <input
                                autoFocus
                                aria-label="Szukaj klienta"
                                placeholder="Imię, nazwisko, telefon albo e-mail"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </SearchBox>
                        <Results>
                            {isLoading ? (
                                <Muted>Szukam klientów...</Muted>
                            ) : candidates.length === 0 ? (
                                <Muted>{debounced ? `Nikt w kartotece nie pasuje do „${debounced}".` : 'Zacznij pisać, żeby znaleźć klienta.'}</Muted>
                            ) : (
                                <ChoiceList role="radiogroup" aria-label="Klient">
                                    {candidates.map(c => (
                                        <ChoiceCard
                                            key={c.id}
                                            type="radio"
                                            name="owner-candidate"
                                            checked={picked?.id === c.id}
                                            onChange={() => setPicked(c)}
                                            title={customerName(c)}
                                            detail={c.contact?.phone || c.contact?.email || undefined}
                                        />
                                    ))}
                                </ChoiceList>
                            )}
                        </Results>
                        <div>
                            <Label>Rola</Label>
                            <div style={{ marginTop: 8 }}>
                                <Segmented
                                    label="Rola właściciela"
                                    block
                                    value={role}
                                    onChange={setRole}
                                    options={(Object.keys(ROLE) as OwnershipRole[]).map(r => ({ value: r, label: ROLE[r].label }))}
                                />
                            </div>
                        </div>
                        {role === 'PRIMARY' && owners.some(o => o.role === 'PRIMARY') && (
                            <Notice tone="warn">Pojazd ma już głównego właściciela. Nowy dołączy obok niego, a nie zamiast.</Notice>
                        )}
                    </Stack>
                )}
            </ModalContent>

            {mode === 'list' ? (
                <ModalFooter>
                    <Button onClick={close}>Zamknij</Button>
                    <Button variant="primary" onClick={startAdd}><UserPlus />Dodaj właściciela</Button>
                </ModalFooter>
            ) : (
                <FooterSplit>
                    <Button variant="ghost" onClick={() => setMode('list')}><ArrowLeft />Wróć</Button>
                    <Button variant="primary" onClick={add} disabled={!picked || isAssigning}>
                        {isAssigning ? 'Zapisywanie...' : picked ? `Dodaj: ${customerName(picked)}` : 'Wybierz klienta'}
                    </Button>
                </FooterSplit>
            )}

            <ConfirmationModal
                isOpen={toRemove !== null}
                title="Usunąć właściciela?"
                message={toRemove ? `${toRemove.customerName} przestanie być przypisany do tego pojazdu. Wizyty i dokumenty zostają.` : ''}
                variant="danger"
                confirmText="Usuń właściciela"
                cancelText="Zostaw"
                onConfirm={remove}
                onCancel={() => setToRemove(null)}
            />
        </ModalShell>
    );
};
