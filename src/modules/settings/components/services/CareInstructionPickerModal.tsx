// src/modules/settings/components/services/CareInstructionPickerModal.tsx
//
// Wybór instrukcji pielęgnacyjnych przypiętych do usługi.
//
// Osobne okno, a nie blok w formularzu usługi: przypisanie zmienia się rzadko (raz przy
// zakładaniu usługi, potem prawie nigdy), a lista potrafi mieć kilkanaście pozycji z
// pełną treścią — rozpychała formularz ceny, w którym ludzie bywają codziennie.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button, ui } from '@/common/components/ui';
import { InputShell, BareInput } from '@/common/components/Form';
import type { CareInstruction } from '../../api/careInstructionsApi';

const Bar = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const LeadIcon = styled.span` display: inline-flex; padding-left: 12px; color: ${ui.textMuted}; flex-shrink: 0; `;
const Counter = styled.span` font-size: 12.5px; color: ${ui.textMuted}; `;

const List = styled.div` display: flex; flex-direction: column; gap: 8px; margin-top: 12px; `;
const Item = styled.label<{ $on: boolean }>`
    display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
    padding: 10px 12px; border-radius: 12px;
    border: 1px solid ${p => (p.$on ? ui.brand : ui.line)};
    background: ${p => (p.$on ? ui.brandTint : ui.surface)};
    transition: border-color 150ms ease, background 150ms ease;
    &:hover { border-color: ${p => (p.$on ? ui.brand : ui.lineStrong)}; }
`;
const Check = styled.input` margin: 2px 0 0; width: 16px; height: 16px; flex-shrink: 0; accent-color: ${ui.brand}; `;
const Texts = styled.span` display: flex; flex-direction: column; gap: 2px; min-width: 0; `;
const ItemTitle = styled.span` font-size: 13.5px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; `;
const ItemContent = styled.span` font-size: 12.5px; line-height: 1.45; color: ${ui.textSecondary}; overflow-wrap: anywhere; `;
const Always = styled.span` font-size: 12.5px; font-weight: 600; color: ${ui.brandInk}; `;
const Empty = styled.p` margin: 16px 0 0; font-size: 13px; color: ${ui.textMuted}; `;

interface Props {
    instructions: CareInstruction[];
    selectedIds: string[];
    serviceName: string;
    onCancel: () => void;
    onConfirm: (ids: string[]) => void;
}

export function CareInstructionPickerModal({
    instructions, selectedIds, serviceName, onCancel, onConfirm,
}: Props) {
    // Kopia robocza: zamknięcie krzyżykiem ma zostawić przypisania takie, jakie były.
    const [ids, setIds] = useState<string[]>(selectedIds);
    const [search, setSearch] = useState('');

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return instructions;
        // Szukamy też w treści, nie tylko w nazwie: nazwy bywają skrótowe („Powłoka"),
        // a człowiek pamięta zwykle zdanie, które czyta klient.
        return instructions.filter(i =>
            i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
    }, [instructions, search]);

    const toggle = (id: string) =>
        setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    return (
        <ModalShell isOpen onClose={onCancel} maxWidth="620px" stableHeight>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Instrukcje pielęgnacyjne</ModalTitle>
                    <ModalSubtitle>
                        {serviceName
                            ? `Zaznaczą się na certyfikacie, gdy wizyta obejmie „${serviceName}"`
                            : 'Zaznaczą się na certyfikacie, gdy wizyta obejmie tę usługę'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onCancel} />
            </ModalHeader>

            <ModalContent>
                <Bar>
                    <InputShell>
                        <LeadIcon><Search size={15} /></LeadIcon>
                        <BareInput
                            placeholder="Szukaj po nazwie lub treści…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </InputShell>
                    <Counter>
                        {ids.length === 0 ? 'Nic nie zaznaczono' : `Zaznaczono ${ids.length} z ${instructions.length}`}
                    </Counter>
                </Bar>

                {instructions.length === 0 && (
                    <Empty>
                        Słownik instrukcji jest pusty. Uzupełnisz go w „Instrukcjach pielęgnacji" obok usług i pakietów.
                    </Empty>
                )}
                {instructions.length > 0 && visible.length === 0 && (
                    <Empty>Nic nie pasuje do „{search.trim()}".</Empty>
                )}

                <List>
                    {visible.map(instruction => {
                        const on = ids.includes(instruction.id);
                        return (
                            <Item key={instruction.id} $on={on}>
                                <Check type="checkbox" checked={on} onChange={() => toggle(instruction.id)} />
                                <Texts>
                                    <ItemTitle>{instruction.title}</ItemTitle>
                                    <ItemContent>{instruction.content}</ItemContent>
                                    {instruction.isDefaultSelected && (
                                        <Always>Zaznaczana przy każdym certyfikacie</Always>
                                    )}
                                </Texts>
                            </Item>
                        );
                    })}
                </List>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onCancel}>Anuluj</Button>
                <Button variant="primary" onClick={() => onConfirm(ids)}>Gotowe</Button>
            </ModalFooter>
        </ModalShell>
    );
}
