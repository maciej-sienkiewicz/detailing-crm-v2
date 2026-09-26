// src/modules/settings/components/services/ServiceEditorModal.tsx
//
// Dodanie i edycja usługi z cennika.
//
// Okno zamiast panelu rozwijanego nad listą: panel spychał listę w dół i zostawiał
// pod sobą aktywne przyciski wierszy (archiwizację dało się kliknąć w trakcie edycji
// innej usługi). Okno zabiera ekran na czas edycji i samo znika - jego „Zapisz" jest
// wtedy jedynym wypełnieniem (CLAUDE.md §2, wyjątek otwartego edytora).
import { useRef, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FieldLabel, FormErrorMsg, InputShell, BareInput } from '@/common/components/Form';
import { Button, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { useCreateService, useUpdateService } from '@/modules/services/hooks/useServices';
import type { Service } from '@/modules/services/types';
import { useCareInstructionMutations } from '../../hooks/useCareInstructions';
import type { CareInstruction } from '../../api/careInstructionsApi';
import { useSettingsDirty } from '../shared/settingsChrome';
import { CareInstructionPickerModal } from './CareInstructionPickerModal';
import { PriceFieldsBlock } from './PriceFieldsBlock';
import { reportMutationError } from './mutationFeedback';
import {
    EMPTY_PRICE_FIELDS, priceError, priceFieldsChanged, priceFieldsFromCatalog, pricePayload,
    validateCatalogName,
    type PriceFields,
} from './servicePriceForm.helpers';

interface Props {
    /** Edytowana usługa albo `null` przy dodawaniu. */
    target: Service | null;
    careInstructions: CareInstruction[];
    onClose: () => void;
    /** Po udanym zapisie; `previousName` pozwala zapytać o nazwy w pakietach. */
    onSaved: (saved: Service, previousName: string) => void;
}

export function ServiceEditorModal({ target, careInstructions, onClose, onSaved }: Props) {
    const { showSuccess, showError } = useToast();
    const createService = useCreateService();
    const updateService = useUpdateService();
    const { setForService } = useCareInstructionMutations();

    // Stan początkowy czytamy RAZ, przy otwarciu okna: odświeżenie cennika albo
    // słownika instrukcji w tle nie może nadpisać tego, co ktoś właśnie wpisuje.
    const [initialPrice] = useState(() => (target ? priceFieldsFromCatalog(target) : EMPTY_PRICE_FIELDS));
    const [initialCareIds] = useState(() => (
        target ? careInstructions.filter(i => i.serviceIds.includes(target.id)).map(i => i.id) : []
    ));

    const [name, setName] = useState(target?.name ?? '');
    const [price, setPrice] = useState<PriceFields>(initialPrice);
    const [careIds, setCareIds] = useState<string[]>(initialCareIds);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const grossRef = useRef<HTMLInputElement>(null);

    const nameError = validateCatalogName(name);
    const priceProblem = priceError(price);
    const saving = createService.isPending || updateService.isPending;

    const dirty = name !== (target?.name ?? '')
        || priceFieldsChanged(price, initialPrice)
        || careIds.slice().sort().join() !== initialCareIds.slice().sort().join();
    useSettingsDirty(dirty);

    /**
     * Przypisania instrukcji zapisujemy PO zapisie usługi i nie przerywamy nimi zapisu:
     * usługa zapisana bez instrukcji to drobiazg do poprawienia, a wywalony formularz po
     * udanym zapisie ceny wygląda jak utrata danych. Ale mówimy o tym - wcześniej błąd
     * ginął po cichu i nikt nie wiedział, że certyfikat nie zaznaczy instrukcji.
     */
    const saveCareLinks = async (serviceId: string) => {
        if (careIds.length === 0 && initialCareIds.length === 0) return;
        try {
            await setForService.mutateAsync({ serviceId, instructionIds: careIds });
        } catch (error) {
            reportMutationError(showError, error, 'Usługa zapisana bez instrukcji pielęgnacji',
                'Przypisz je jeszcze raz z menu ⋮ przy usłudze.');
        }
    };

    const submit = async () => {
        if (nameError || priceProblem) {
            setShowErrors(true);
            (nameError ? nameRef : grossRef).current?.focus();
            return;
        }
        const request = {
            name: name.trim(),
            ...pricePayload(price),
            vatRate: price.vatRate,
            requireManualPrice: price.requireManualPrice,
        };
        try {
            const saved = target
                ? await updateService.mutateAsync({ originalServiceId: target.id, ...request })
                : await createService.mutateAsync(request);
            // UWAGA: zapis ceny potrafi ZAŁOŻYĆ NOWY wiersz usługi i zarchiwizować stary
            // (replacesServiceId), więc przypisania wieszamy na identyfikatorze ZWRÓCONYM
            // przez zapis, nie na tym, który był w formularzu.
            await saveCareLinks(saved.id);
            showSuccess(target ? 'Zmiany zapisane' : 'Usługa dodana', `„${saved.name}" jest w cenniku.`);
            onSaved(saved, target?.name ?? saved.name);
        } catch (error) {
            reportMutationError(showError, error, target ? 'Nie udało się zapisać zmian' : 'Nie udało się dodać usługi');
        }
    };

    const careSummary = careInstructions.filter(i => careIds.includes(i.id)).map(i => i.title).join(', ');

    return (
        <>
            {/* Przy niezapisanych zmianach okno nie znika od Escape ani kliknięcia obok -
                tylko krzyżykiem albo „Anuluj". Przy otwartym wyborze instrukcji Escape
                ma zamknąć tylko wybór, nie oba okna naraz. */}
            <ModalShell isOpen onClose={onClose} size="md" dismissible={!dirty && !pickerOpen}>
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{target ? 'Edytuj usługę' : 'Nowa usługa'}</ModalTitle>
                        <ModalSubtitle>
                            {target ? target.name : 'Pojedyncza pozycja cennika'}
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <Form
                        id="service-editor-form"
                        onSubmit={e => { e.preventDefault(); void submit(); }}
                        autoComplete="off"
                        noValidate
                    >
                        <Field>
                            <FieldLabel htmlFor="service-editor-name">Nazwa usługi</FieldLabel>
                            <InputShell $hasError={showErrors && !!nameError}>
                                <BareInput
                                    id="service-editor-name"
                                    ref={nameRef}
                                    placeholder="np. Mycie detailingowe premium"
                                    value={name}
                                    onChange={e => setName(capitalizeFirst(e.target.value))}
                                    aria-invalid={showErrors && !!nameError}
                                    autoFocus
                                />
                            </InputShell>
                            {showErrors && nameError && <FormErrorMsg>{nameError}</FormErrorMsg>}
                        </Field>

                        <Group aria-labelledby="service-editor-price">
                            <GroupTitle id="service-editor-price">Cena</GroupTitle>
                            <PriceFieldsBlock
                                ref={grossRef}
                                idPrefix="service-editor"
                                fields={price}
                                onChange={setPrice}
                                error={showErrors ? priceProblem : undefined}
                                manualHint="Cenę ustalasz przy każdym zleceniu, a cennik nie podpowiada kwoty."
                            />
                        </Group>

                        {careInstructions.length > 0 && (
                            <Group aria-labelledby="service-editor-care">
                                <GroupTitle id="service-editor-care">Instrukcje pielęgnacji na certyfikat</GroupTitle>
                                <Muted>
                                    Zaznaczą się same, gdy ta usługa trafi na certyfikat jakości. Treści edytujesz
                                    w „Instrukcjach pielęgnacji" obok usług i pakietów.
                                </Muted>
                                <CareRow>
                                    <CareText $empty={!careSummary}>
                                        {careSummary || 'Nie przypisano żadnej instrukcji'}
                                    </CareText>
                                    <Button size="sm" onClick={() => setPickerOpen(true)}>
                                        {careSummary ? 'Zmień' : 'Przypisz instrukcje'}
                                    </Button>
                                </CareRow>
                            </Group>
                        )}
                    </Form>
                </ModalContent>

                <ModalFooter>
                    <Button onClick={onClose}>Anuluj</Button>
                    <Button type="submit" form="service-editor-form" variant="primary" disabled={saving}>
                        {saving ? 'Zapisywanie...' : target ? 'Zapisz zmiany' : 'Dodaj usługę'}
                    </Button>
                </ModalFooter>
            </ModalShell>

            {pickerOpen && (
                <CareInstructionPickerModal
                    instructions={careInstructions}
                    selectedIds={careIds}
                    serviceName={name.trim()}
                    onCancel={() => setPickerOpen(false)}
                    onConfirm={ids => { setCareIds(ids); setPickerOpen(false); }}
                />
            )}
        </>
    );
}

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 22px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding-top: 20px;
    border-top: 1px solid ${ui.lineFaint};
`;

const GroupTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const CareRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: 12px;

    @media (max-width: 520px) { flex-direction: column; align-items: stretch; }
`;

const CareText = styled.span<{ $empty: boolean }>`
    min-width: 0;
    font-size: 13.5px;
    color: ${p => (p.$empty ? ui.textMuted : ui.ink)};
    overflow-wrap: anywhere;
`;
