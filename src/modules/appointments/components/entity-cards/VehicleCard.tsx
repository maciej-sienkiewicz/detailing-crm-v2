import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Car, Link2, Pencil, TriangleAlert, Undo2, Unlink, X } from 'lucide-react';
import { useDebounce } from '@/common/hooks';
import { PiiValue } from '@/common/pii';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { appointmentApi } from '../../api/appointmentApi';
import type { EntityEvent, VehicleDraft, VehicleOwnershipAction, VehicleSectionState, VehicleSummary } from './types';
import {
    ActionBtn, ActionsRow, Card, CardActions, CardBody, CardHead, CardTitle, CollisionBox,
    CollisionMeta, CollisionTitle, EmptyHint, EntityMeta, EntityName, Field,
    FormGrid, HeadIcon, IdentityRow, IdentityText, InlineLink, MetaRow, MutationNotice,
    OptionList, OptionMeta, OptionRow, OptionTitle, PlateChip, QuietBtn, RadioRow, StateTag,
    TextInput,
} from './EntityCardKit';

interface VehicleCardProps {
    state: VehicleSectionState;
    dispatch: (event: EntityEvent) => void;
    /** Id of the resolved existing customer — null while the customer is NEW/unresolved. */
    customerId: string | null;
    /** "Anna Nowak" — used in garage/ownership copy. */
    customerLabel: string;
    /** Check-in variant: also edit the vehicle color in the new/edit forms. */
    showColorField?: boolean;
    /**
     * False for flows whose backend cannot change vehicle ownership (check-in):
     * the plate-collision card then offers "attach as-is" instead of the
     * co-owner/transfer decision.
     */
    allowOwnershipActions?: boolean;
    /**
     * Extra form content (e.g. check-in's mileage field) shown ONLY inside the
     * new-vehicle and edit forms, right under the vehicle fields.
     */
    editExtras?: ReactNode;
}

const vehicleLabel = (v: { brand: string; model: string; year?: number | null }) =>
    [v.brand, v.model, v.year ? `(${v.year})` : null].filter(Boolean).join(' ');

const Plate = ({ value }: { value: string }) => (
    <PlateChip><PiiValue value={value} kind="text" /></PlateChip>
);

/**
 * Summary card for the visit's vehicle. Auto-progresses after a customer change:
 * empty garage → new-vehicle form, one vehicle → auto-select, more → inline picker.
 * The new-vehicle form runs live plate-collision detection (see PlateCollisionProbe).
 */
export const VehicleCard = ({
    state, dispatch, customerId, customerLabel,
    showColorField = false, allowOwnershipActions = true, editExtras,
}: VehicleCardProps) => (
    <Card>
        <CardHead>
            <HeadIcon><Car /></HeadIcon>
            <CardTitle>Pojazd</CardTitle>
            {state.kind === 'NEW' && <StateTag $tone="new">Nowy</StateTag>}
            {state.kind === 'SELECTED_MODIFIED' && <StateTag $tone="modified">Zmienione dane</StateTag>}
            {state.kind === 'LINKED_EXISTING' && <StateTag $tone="modified">Zmiana właściciela</StateTag>}
        </CardHead>
        <CardBody>
            {state.kind === 'NONE' && (
                <>
                    <EmptyHint>Brak pojazdu przypisanego do tej wizyty.</EmptyHint>
                    <CardActions>
                        <QuietBtn onClick={() => dispatch({ type: 'VEHICLE_OPEN_CHOOSER' })} disabled={!customerId}>
                            <ArrowLeftRight aria-hidden /> Wybierz z garażu
                        </QuietBtn>
                        <QuietBtn onClick={() => dispatch({ type: 'VEHICLE_ADD_NEW' })}>
                            + Dodaj nowy pojazd
                        </QuietBtn>
                    </CardActions>
                </>
            )}

            {(state.kind === 'SELECTED' || state.kind === 'SELECTED_MODIFIED') && (
                <SelectedView state={state} dispatch={dispatch} customerId={customerId} />
            )}

            {state.kind === 'LINKED_EXISTING' && (
                <LinkedView state={state} dispatch={dispatch} customerLabel={customerLabel} />
            )}

            {state.kind === 'CHOOSING' && (
                <GarageChooser state={state} dispatch={dispatch} customerId={customerId} customerLabel={customerLabel} />
            )}

            {state.kind === 'NEW' && (
                <NewVehicleForm
                    state={state}
                    dispatch={dispatch}
                    customerId={customerId}
                    customerLabel={customerLabel}
                    showColorField={showColorField}
                    allowOwnershipActions={allowOwnershipActions}
                    editExtras={editExtras}
                />
            )}

            {state.kind === 'EDITING' && (
                <EditView state={state} dispatch={dispatch} showColorField={showColorField} editExtras={editExtras} />
            )}
        </CardBody>
    </Card>
);

// ─── Read-only reference ──────────────────────────────────────────────────────

const SelectedView = ({
    state, dispatch, customerId,
}: {
    state: Extract<VehicleSectionState, { kind: 'SELECTED' } | { kind: 'SELECTED_MODIFIED' }>;
    dispatch: VehicleCardProps['dispatch'];
    customerId: string | null;
}) => {
    const shown = state.kind === 'SELECTED_MODIFIED'
        ? { ...state.snapshot, ...state.draft }
        : state.snapshot;

    return (
        <>
            <IdentityRow>
                <CarLogoImage brand={shown.brand} size="md" />
                <IdentityText>
                    <EntityName>{vehicleLabel(shown)}</EntityName>
                    {shown.licensePlate && (
                        <MetaRow><Plate value={shown.licensePlate} /></MetaRow>
                    )}
                </IdentityText>
            </IdentityRow>
            <CardActions>
                <QuietBtn onClick={() => dispatch({ type: 'VEHICLE_OPEN_EDIT' })}>
                    <Pencil aria-hidden /> Edytuj dane
                </QuietBtn>
                <QuietBtn onClick={() => dispatch({ type: 'VEHICLE_OPEN_CHOOSER' })} disabled={!customerId}>
                    <ArrowLeftRight aria-hidden /> Zmień pojazd
                </QuietBtn>
                {state.kind === 'SELECTED_MODIFIED' && (
                    <QuietBtn $danger onClick={() => dispatch({ type: 'VEHICLE_DISCARD_CHANGES' })}>
                        <Undo2 aria-hidden /> Wycofaj zmiany
                    </QuietBtn>
                )}
            </CardActions>
        </>
    );
};

// ─── Linked-existing (collision resolution result) ────────────────────────────

const LinkedView = ({
    state, dispatch, customerLabel,
}: {
    state: Extract<VehicleSectionState, { kind: 'LINKED_EXISTING' }>;
    dispatch: VehicleCardProps['dispatch'];
    customerLabel: string;
}) => (
    <>
        <IdentityRow>
            <CarLogoImage brand={state.vehicle.brand} size="md" />
            <IdentityText>
                <EntityName>{vehicleLabel(state.vehicle)}</EntityName>
                {state.vehicle.licensePlate && (
                    <MetaRow><Plate value={state.vehicle.licensePlate} /></MetaRow>
                )}
            </IdentityText>
        </IdentityRow>
        <MutationNotice>
            <Link2 aria-hidden />
            <span>
                {state.ownership === 'ADD_CO_OWNER' ? (
                    <>Przy zapisie <strong>{customerLabel}</strong> zostanie dopisany(-a) jako współwłaściciel tego pojazdu. Historia wizyt pojazdu pozostaje ciągła.</>
                ) : (
                    <>Przy zapisie pojazd zostanie <strong>przeniesiony do {customerLabel}</strong> — dotychczasowi właściciele stracą go ze swojego garażu.</>
                )}
            </span>
        </MutationNotice>
        <CardActions>
            <QuietBtn $danger onClick={() => dispatch({ type: 'VEHICLE_CLEAR' })}>
                <Unlink aria-hidden /> Odepnij pojazd
            </QuietBtn>
        </CardActions>
    </>
);

// ─── Garage picker (auto-resolves trivial garages when entered automatically) ─

const GarageChooser = ({
    state, dispatch, customerId, customerLabel,
}: {
    state: Extract<VehicleSectionState, { kind: 'CHOOSING' }>;
    dispatch: VehicleCardProps['dispatch'];
    customerId: string | null;
    customerLabel: string;
}) => {
    const { data: garage, isLoading } = useQuery({
        queryKey: ['entity-cards', 'garage', customerId],
        queryFn: () => appointmentApi.getCustomerVehicles(customerId!),
        enabled: !!customerId,
    });

    // Auto-progression contract: only for pickers entered by the customer-changed
    // rule, and only for trivial garages. A manually opened picker never jumps.
    useEffect(() => {
        if (!state.auto || !garage) return;
        if (garage.length === 0) {
            dispatch({ type: 'VEHICLE_ADD_NEW' });
        } else if (garage.length === 1) {
            const v = garage[0];
            dispatch({
                type: 'VEHICLE_SELECTED',
                vehicle: { id: v.id, brand: v.brand, model: v.model, year: v.year, licensePlate: v.licensePlate },
            });
        }
    }, [state.auto, garage, dispatch]);

    if (!customerId) {
        return <EmptyHint>Najpierw wybierz klienta.</EmptyHint>;
    }

    return (
        <>
            <EntityMeta>Garaż: <strong>{customerLabel}</strong></EntityMeta>
            {isLoading && <EmptyHint>Wczytywanie garażu…</EmptyHint>}
            {garage && garage.length > 0 && (
                <OptionList>
                    {garage.map(v => (
                        <OptionRow
                            key={v.id}
                            type="button"
                            onClick={() => dispatch({
                                type: 'VEHICLE_SELECTED',
                                vehicle: { id: v.id, brand: v.brand, model: v.model, year: v.year, licensePlate: v.licensePlate },
                            })}
                        >
                            <OptionTitle style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <CarLogoImage brand={v.brand} size="sm" />
                                {vehicleLabel(v)}
                            </OptionTitle>
                            {v.licensePlate && <OptionMeta><Plate value={v.licensePlate} /></OptionMeta>}
                        </OptionRow>
                    ))}
                </OptionList>
            )}
            {garage && garage.length === 0 && !state.auto && (
                <EmptyHint>Ten klient nie ma jeszcze żadnego pojazdu w garażu.</EmptyHint>
            )}
            <InlineLink type="button" onClick={() => dispatch({ type: 'VEHICLE_ADD_NEW' })}>
                + Dodaj nowy pojazd
            </InlineLink>
            <CardActions>
                <QuietBtn onClick={() => dispatch({ type: 'VEHICLE_CANCEL_CHOOSER' })}>
                    <X aria-hidden /> Anuluj
                </QuietBtn>
            </CardActions>
        </>
    );
};

// ─── New vehicle form + live plate-collision detection ────────────────────────

const NewVehicleForm = ({
    state, dispatch, customerId, customerLabel, showColorField, allowOwnershipActions, editExtras,
}: {
    state: Extract<VehicleSectionState, { kind: 'NEW' }>;
    dispatch: VehicleCardProps['dispatch'];
    customerId: string | null;
    customerLabel: string;
    showColorField: boolean;
    allowOwnershipActions: boolean;
    editExtras?: ReactNode;
}) => {
    const set = (updates: Partial<VehicleDraft>) =>
        dispatch({ type: 'VEHICLE_NEW_DRAFT_CHANGED', draft: { ...state.draft, ...updates } });

    return (
        <>
            <EntityMeta>Pojazd zostanie dodany do garażu: <strong>{customerLabel}</strong></EntityMeta>
            <VehicleFields draft={state.draft} onChange={set} showColorField={showColorField} />
            {editExtras}
            <PlateCollisionProbe
                licensePlate={state.draft.licensePlate ?? ''}
                overriddenVehicleId={state.duplicateOverrideVehicleId}
                dispatch={dispatch}
                customerId={customerId}
                customerLabel={customerLabel}
                allowOwnershipActions={allowOwnershipActions}
            />
            <CardActions>
                <QuietBtn onClick={() => dispatch({ type: 'VEHICLE_OPEN_CHOOSER' })} disabled={!customerId}>
                    <ArrowLeftRight aria-hidden /> Wybierz z garażu
                </QuietBtn>
                <QuietBtn $danger onClick={() => dispatch({ type: 'VEHICLE_CLEAR' })}>
                    <X aria-hidden /> Wizyta bez pojazdu
                </QuietBtn>
            </CardActions>
        </>
    );
};

/**
 * Debounced lookup by plate. Deduplication happens WHILE typing, not after save:
 * a match renders the collision card with an explicit three-way ownership decision
 * instead of silently creating a duplicate vehicle.
 */
const PlateCollisionProbe = ({
    licensePlate, overriddenVehicleId, dispatch, customerId, customerLabel, allowOwnershipActions,
}: {
    licensePlate: string;
    overriddenVehicleId?: string;
    dispatch: VehicleCardProps['dispatch'];
    customerId: string | null;
    customerLabel: string;
    allowOwnershipActions: boolean;
}) => {
    const debounced = useDebounce(licensePlate.trim(), 400);
    const [decision, setDecision] = useState<VehicleOwnershipAction | 'DIFFERENT'>('ADD_CO_OWNER');

    const { data } = useQuery({
        queryKey: ['entity-cards', 'plate-lookup', debounced],
        queryFn: () => appointmentApi.lookupVehicleByPlate(debounced),
        enabled: debounced.length >= 4,
        staleTime: 30_000,
    });

    const collision = data?.found && data.vehicle ? data.vehicle : null;
    if (!collision || collision.id === overriddenVehicleId) return null;

    const primaryOwner = collision.owners.find(o => o.role === 'PRIMARY') ?? collision.owners[0];
    const summary: VehicleSummary = {
        id: collision.id,
        brand: collision.brand,
        model: collision.model,
        year: collision.year ?? undefined,
        licensePlate: collision.licensePlate ?? undefined,
    };

    // The matched vehicle already sits in THIS customer's garage — no ownership
    // decision to make, just attach the existing record instead of duplicating it.
    if (customerId && collision.owners.some(o => o.customerId === customerId)) {
        return (
            <CollisionBox role="alert">
                <CollisionTitle>Ten pojazd jest już w garażu tego klienta</CollisionTitle>
                <CollisionMeta>
                    {vehicleLabel(collision)}
                    {collision.licensePlate && <> · <Plate value={collision.licensePlate} /></>}
                </CollisionMeta>
                <ActionsRow>
                    <ActionBtn $primary onClick={() => dispatch({ type: 'VEHICLE_SELECTED', vehicle: summary })}>
                        Podepnij ten pojazd
                    </ActionBtn>
                </ActionsRow>
            </CollisionBox>
        );
    }

    // Ownership changes are an appointment-flow capability; check-in can only
    // attach the vehicle as-is or knowingly create a duplicate.
    if (!allowOwnershipActions) {
        return (
            <CollisionBox role="alert">
                <CollisionTitle>Ten pojazd już istnieje w bazie</CollisionTitle>
                <CollisionMeta>
                    {vehicleLabel(collision)}
                    {collision.licensePlate && <> · <Plate value={collision.licensePlate} /></>}
                    {primaryOwner && (
                        <> · właściciel: <PiiValue value={primaryOwner.name} kind="name" /></>
                    )}
                </CollisionMeta>
                <ActionsRow>
                    <ActionBtn $primary onClick={() => dispatch({ type: 'VEHICLE_SELECTED', vehicle: summary })}>
                        Podepnij ten pojazd
                    </ActionBtn>
                    <ActionBtn onClick={() => dispatch({ type: 'VEHICLE_DUPLICATE_OVERRIDE', vehicleId: collision.id })}>
                        To inny pojazd
                    </ActionBtn>
                </ActionsRow>
            </CollisionBox>
        );
    }

    const apply = () => {
        if (decision === 'DIFFERENT') {
            dispatch({ type: 'VEHICLE_DUPLICATE_OVERRIDE', vehicleId: collision.id });
        } else {
            dispatch({ type: 'VEHICLE_LINK_EXISTING', vehicle: summary, ownership: decision });
        }
    };

    return (
        <CollisionBox role="alert">
            <CollisionTitle>Ten pojazd już istnieje w bazie</CollisionTitle>
            <CollisionMeta>
                {vehicleLabel(collision)}
                {collision.licensePlate && <> · <Plate value={collision.licensePlate} /></>}
                {primaryOwner && (
                    <> · właściciel: <PiiValue value={primaryOwner.name} kind="name" /></>
                )}
            </CollisionMeta>
            <RadioRow>
                <input
                    type="radio"
                    name="plate-collision"
                    checked={decision === 'ADD_CO_OWNER'}
                    onChange={() => setDecision('ADD_CO_OWNER')}
                />
                <span>
                    Podepnij ten pojazd i dodaj <strong>{customerLabel}</strong> jako współwłaściciela
                    <small>historia wizyt pojazdu pozostaje ciągła — zalecane</small>
                </span>
            </RadioRow>
            <RadioRow>
                <input
                    type="radio"
                    name="plate-collision"
                    checked={decision === 'TRANSFER_PRIMARY'}
                    onChange={() => setDecision('TRANSFER_PRIMARY')}
                />
                <span>
                    Przenieś pojazd do <strong>{customerLabel}</strong>
                    <small>dotychczasowi właściciele stracą go ze swojego garażu</small>
                </span>
            </RadioRow>
            <RadioRow>
                <input
                    type="radio"
                    name="plate-collision"
                    checked={decision === 'DIFFERENT'}
                    onChange={() => setDecision('DIFFERENT')}
                />
                <span>
                    To inny pojazd — kontynuuj dodawanie
                    <small>w bazie pojawią się dwa pojazdy o tej samej rejestracji</small>
                </span>
            </RadioRow>
            <ActionsRow>
                <ActionBtn $primary onClick={apply}>Zastosuj</ActionBtn>
            </ActionsRow>
        </CollisionBox>
    );
};

// ─── Edit form (deliberate mutation of the vehicle record) ────────────────────

const EditView = ({
    state, dispatch, showColorField, editExtras,
}: {
    state: Extract<VehicleSectionState, { kind: 'EDITING' }>;
    dispatch: VehicleCardProps['dispatch'];
    showColorField: boolean;
    editExtras?: ReactNode;
}) => {
    const [draft, setDraft] = useState<VehicleDraft>(state.draft);
    const isExisting = state.base.kind === 'SELECTED' || state.base.kind === 'SELECTED_MODIFIED';

    return (
        <>
            {isExisting && (
                <MutationNotice>
                    <TriangleAlert aria-hidden />
                    <span>
                        Edytujesz dane pojazdu <strong>{vehicleLabel(draft)}</strong>.
                        Zmiany zapiszą się w kartotece pojazdu i będą widoczne we wszystkich wizytach.
                    </span>
                </MutationNotice>
            )}
            <VehicleFields
                draft={draft}
                onChange={updates => setDraft(prev => ({ ...prev, ...updates }))}
                showColorField={showColorField}
            />
            {editExtras}
            <ActionsRow>
                <ActionBtn $primary onClick={() => dispatch({ type: 'VEHICLE_COMMIT_EDIT', draft })}>
                    Zatwierdź
                </ActionBtn>
                <ActionBtn onClick={() => dispatch({ type: 'VEHICLE_CANCEL_EDIT' })}>Anuluj</ActionBtn>
            </ActionsRow>
        </>
    );
};

const VehicleFields = ({
    draft, onChange, showColorField = false,
}: {
    draft: VehicleDraft;
    onChange: (updates: Partial<VehicleDraft>) => void;
    showColorField?: boolean;
}) => (
    <FormGrid>
        <Field as="div">
            Marka
            <BrandSelect
                value={draft.brand}
                onChange={val => onChange({ brand: val, model: '' })}
            />
        </Field>
        <Field as="div">
            Model
            <ModelSelect
                brand={draft.brand}
                value={draft.model}
                onChange={val => onChange({ model: val })}
            />
        </Field>
        <Field>
            Rocznik
            <TextInput
                value={draft.year ?? ''}
                onChange={e => {
                    const parsed = parseInt(e.target.value, 10);
                    onChange({ year: Number.isNaN(parsed) ? undefined : parsed });
                }}
                inputMode="numeric"
                autoComplete="off"
            />
        </Field>
        <Field>
            Nr rejestracyjny
            <TextInput
                value={draft.licensePlate ?? ''}
                onChange={e => onChange({ licensePlate: e.target.value.toUpperCase() })}
                autoComplete="off"
            />
        </Field>
        {showColorField && (
            <Field>
                Kolor
                <TextInput
                    value={draft.color ?? ''}
                    onChange={e => onChange({ color: e.target.value })}
                    autoComplete="off"
                />
            </Field>
        )}
    </FormGrid>
);
