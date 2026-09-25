// src/modules/visits/components/InfoCards.tsx
//
// Szyna boczna wizyty: klient i przyjęcie pojazdu.
//
// Obie karty są PANELAMI - płasko, bez cienia (CLAUDE.md §2, „wyniesienie"):
// temat okna to usługi, a te karty są kontekstem. Wcześniej każda miała cień,
// nagłówek z kreską, zwijanie i etykiety 11px wersalikami - sześć takich samych
// ram obok siebie, z których żadna nie była ważniejsza.
//
// Etykieta i wartość to FieldRow: szara etykieta zwykłym pismem, wartość po prawej.

import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { ArrowUpRight, Check, IdCard, MessageSquare, Pencil, Phone, TriangleAlert } from 'lucide-react';
import { CustomerContactModal } from './CustomerContactModal';
import { MileageModal } from './MileageModal';
import { PiiValue, joinPiiName, isPiiMasked } from '@/common/pii';
import type { VehicleInfo, CustomerInfo } from '../types';
import { VisitCardLinkModal } from '@/modules/visit-card';
import { usePermissions } from '@/core/permissions';
import {
    Button, ButtonLink, FieldList, FieldRow, IconButton, Panel, SectionTitle, StatusPill, ui,
} from '@/common/components/ui';

// ─── Wspólne ──────────────────────────────────────────────────────────────────

const RailPanel = styled(Panel)`
    padding: 16px 18px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
`;

const Rows = styled(FieldList)`
    margin-top: 12px;
`;

const LinkLike = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: inherit;
    font-weight: 500;
    color: ${ui.brandInk};
    cursor: pointer;

    &:hover { color: ${ui.brandDeep}; text-decoration: underline; }
`;

const Missing = styled.span`
    color: ${ui.textFaint};
`;

// ─── Klient ───────────────────────────────────────────────────────────────────

const Person = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    min-width: 0;
`;

const Initials = styled.span`
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: ${ui.brandTintHover};
    color: ${ui.brandInk};
    font-size: 14px;
    font-weight: 700;
`;

const PersonText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const PersonName = styled.span`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const PersonSub = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const ContactButtons = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
`;

function initialsOf(first?: string | null, last?: string | null): string {
    const letters = [first, last].map(p => (p ?? '').trim().charAt(0)).join('').toUpperCase();
    return letters || '?';
}

interface CustomerInfoCardProps {
    customer: CustomerInfo;
    visitId?: string;
    onViewDetails?: () => void;
    /** Telefon: „Zadzwoń / SMS" zamiast wierszy kontaktu, historia w jednej linii. */
    compact?: boolean;
    /** Na telefonie przyjęcie pojazdu stoi w tej samej karcie, pod klientem. */
    children?: ReactNode;
    id?: string;
}

export const CustomerInfoCard = ({ customer, visitId, onViewDetails, compact, children, id }: CustomerInfoCardProps) => {
    const fullName = joinPiiName(customer.firstName, customer.lastName) ?? '';
    const masked = isPiiMasked(fullName);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    /* null = zamknięte; wartość mówi, od którego pola zaczął użytkownik. */
    const [contactModalField, setContactModalField] = useState<'phone' | 'email' | null>(null);
    const { can } = usePermissions();

    /* Dane zamaskowane przez backend = i tak ich nie zobaczymy, więc nie ma czego
       uzupełniać. Edycja wymaga dostępu do kartoteki klientów. */
    const canEditContact = can('CUSTOMERS_VIEW') && !masked;
    const phoneUsable = !!customer.phone && !isPiiMasked(customer.phone);
    /* Bez groszy: w sumie życiowej klienta „,00" nie niesie informacji. */
    const totalSpentLabel = new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: customer.stats.totalSpent.currency || 'PLN',
        maximumFractionDigits: 0,
    }).format(customer.stats.totalSpent.grossAmount / 100);
    const visitsLabel = `${customer.stats.totalVisits} ${customer.stats.totalVisits === 1 ? 'wizyta' : 'wizyty'}`;

    const phoneValue = customer.phone ? (
        phoneUsable
            ? <a href={`tel:${customer.phone}`}><PiiValue value={customer.phone} kind="phone" /></a>
            : <PiiValue value={customer.phone} kind="phone" />
    ) : canEditContact ? (
        /* Brak numeru to nie stan do odnotowania, tylko rzecz do uzupełnienia - i to
           najczęściej właśnie wtedy, gdy patrzy się na wizytę i trzeba zadzwonić. */
        <LinkLike type="button" onClick={() => setContactModalField('phone')}>Dodaj numer</LinkLike>
    ) : <Missing>Brak numeru</Missing>;

    const emailValue = customer.email ? (
        isPiiMasked(customer.email)
            ? <PiiValue value={customer.email} kind="email" />
            : <a href={`mailto:${customer.email}`}><PiiValue value={customer.email} kind="email" /></a>
    ) : canEditContact ? (
        <LinkLike type="button" onClick={() => setContactModalField('email')}>Dodaj adres e-mail</LinkLike>
    ) : <Missing>Brak adresu</Missing>;

    const sub = compact
        ? [visitsLabel, can('VISITS_SERVICE_PRICES_VIEW') ? `${totalSpentLabel} łącznie` : null].filter(Boolean).join(', ')
        : customer.companyName;

    return (
        <RailPanel id={id} aria-labelledby="visit-customer-title">
            <Head>
                <SectionTitle id="visit-customer-title">Klient</SectionTitle>
                {onViewDetails && can('CUSTOMERS_VIEW') && (
                    <Button variant="ghost" size="sm" onClick={onViewDetails}>
                        Profil klienta<ArrowUpRight />
                    </Button>
                )}
            </Head>

            <Person>
                <Initials aria-hidden="true">{masked ? '?' : initialsOf(customer.firstName, customer.lastName)}</Initials>
                <PersonText>
                    <PersonName><PiiValue value={fullName} kind="name" emptyFallback="Brak nazwy" /></PersonName>
                    {sub && <PersonSub>{sub}</PersonSub>}
                </PersonText>
            </Person>

            {compact ? (
                <>
                    {phoneUsable ? (
                        <ContactButtons>
                            <ButtonLink href={`tel:${customer.phone}`} $variant="outline" $size="md"><Phone />Zadzwoń</ButtonLink>
                            <ButtonLink href={`sms:${customer.phone}`} $variant="outline" $size="md"><MessageSquare />SMS</ButtonLink>
                        </ContactButtons>
                    ) : canEditContact && !customer.phone ? (
                        <Button block style={{ marginTop: 12 }} onClick={() => setContactModalField('phone')}>
                            <Phone />Dodaj numer telefonu
                        </Button>
                    ) : null}
                    <Rows>
                        {(customer.email || canEditContact) && <FieldRow label="E-mail">{emailValue}</FieldRow>}
                        {children}
                    </Rows>
                </>
            ) : (
                <Rows>
                    <FieldRow label="Telefon">{phoneValue}</FieldRow>
                    <FieldRow label="E-mail">{emailValue}</FieldRow>
                    <FieldRow label="Wizyty"><strong>{customer.stats.totalVisits}</strong></FieldRow>
                    {can('VISITS_SERVICE_PRICES_VIEW') && (
                        <FieldRow label="Łącznie"><strong>{totalSpentLabel}</strong></FieldRow>
                    )}
                    {customer.stats.vehiclesCount > 0 && (
                        <FieldRow label="Pojazdy"><strong>{customer.stats.vehiclesCount}</strong></FieldRow>
                    )}
                </Rows>
            )}

            {/* Karta Wizyty: widok dla klienta. */}
            {visitId && can('VISITS_CREATE') && (
                <>
                    <Button block style={{ marginTop: 12 }} onClick={() => setIsCardModalOpen(true)}>
                        <IdCard />Karta wizyty dla klienta
                    </Button>
                    <VisitCardLinkModal
                        visitId={visitId}
                        isOpen={isCardModalOpen}
                        onClose={() => setIsCardModalOpen(false)}
                    />
                </>
            )}

            {contactModalField && (
                <CustomerContactModal
                    isOpen
                    customerId={customer.id}
                    visitId={visitId}
                    initialPhone={customer.phone}
                    initialEmail={customer.email}
                    focusField={contactModalField}
                    onClose={() => setContactModalField(null)}
                />
            )}
        </RailPanel>
    );
};

// ─── Przyjęcie pojazdu ────────────────────────────────────────────────────────

const Handoff = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid ${ui.warnLine};
    background: ${ui.warnTint};
    font-size: 13px;
    color: ${ui.warnInk};

    strong { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    svg { width: 14px; height: 14px; }
    span { color: ${ui.inkSoft}; overflow-wrap: anywhere; }
`;

interface VehicleInfoCardProps {
    vehicle: VehicleInfo;
    mileageAtArrival?: number;
    keysHandedOver: boolean;
    documentsHandedOver: boolean;
    vehicleHandoff?: {
        isHandedOffByOtherPerson: boolean;
        contactPerson: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
        };
    };
    onMileageChange: (mileage: number) => void;
    /** Uprawnienie do edycji stanu przy przyjęciu (VISITS_CREATE). Domyślnie tak. */
    canEdit?: boolean;
    onKeysToggle: (checked: boolean) => void;
    onDocumentsToggle: (checked: boolean) => void;
    onViewDetails?: () => void;
    /** Kto przyjął pojazd i kiedy - wiersz „Przyjęcie". */
    acceptedByName?: string;
    acceptedAt?: string;
    /** Same wiersze, bez własnego panelu - na telefonie w karcie klienta. */
    embedded?: boolean;
}

const shortDay = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const VehicleInfoCard = ({
    mileageAtArrival,
    keysHandedOver,
    documentsHandedOver,
    vehicleHandoff,
    onMileageChange,
    canEdit = true,
    onViewDetails,
    acceptedByName,
    acceptedAt,
    embedded,
}: VehicleInfoCardProps) => {
    const hasMileage = typeof mileageAtArrival === 'number' && mileageAtArrival > 0;
    /* Przebieg spisany przy ladzie bywa z literówką (12 400 zamiast 124 000).
       Poprawka idzie oknem - tak samo jak uzupełnienie kontaktu klienta obok. */
    const [mileageModalOpen, setMileageModalOpen] = useState(false);
    const accepted = [acceptedByName, shortDay(acceptedAt)].filter(Boolean).join(', ');

    /* Nieprzekazanie kluczyków czy dokumentów to normalny wynik, nie błąd:
       czerwień czytałaby się jak „coś poszło nie tak". Kolor ma tylko „tak". */
    const rows = (
        <>
            <FieldRow label="Przebieg">
                {hasMileage
                    ? <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{mileageAtArrival!.toLocaleString('pl-PL')} km</strong>
                    : <Missing>Nie podano</Missing>}
                {canEdit && (
                    <IconButton
                        label={hasMileage ? 'Popraw przebieg' : 'Uzupełnij przebieg'}
                        variant="ghost"
                        size="sm"
                        onClick={() => setMileageModalOpen(true)}
                    >
                        <Pencil />
                    </IconButton>
                )}
            </FieldRow>
            <FieldRow label="Kluczyki">
                {keysHandedOver
                    ? <StatusPill $tone="ok"><Check />Przekazane</StatusPill>
                    : <StatusPill $tone="neutral">Nie przekazano</StatusPill>}
            </FieldRow>
            <FieldRow label="Dokumenty pojazdu">
                {documentsHandedOver
                    ? <StatusPill $tone="ok"><Check />Przekazane</StatusPill>
                    : <StatusPill $tone="neutral">Nie przekazano</StatusPill>}
            </FieldRow>
            {accepted && <FieldRow label="Przyjęcie">{accepted}</FieldRow>}
        </>
    );

    const handoff = vehicleHandoff?.isHandedOffByOtherPerson && (
        <Handoff>
            <strong><TriangleAlert />Auto przywiozła inna osoba</strong>
            <span>
                <PiiValue value={joinPiiName(vehicleHandoff.contactPerson.firstName, vehicleHandoff.contactPerson.lastName)} kind="name" />
            </span>
            {vehicleHandoff.contactPerson.phone && (
                <span><PiiValue value={vehicleHandoff.contactPerson.phone} kind="phone" /></span>
            )}
            {vehicleHandoff.contactPerson.email && (
                <span><PiiValue value={vehicleHandoff.contactPerson.email} kind="email" /></span>
            )}
        </Handoff>
    );

    const modal = mileageModalOpen && (
        <MileageModal
            isOpen
            mileage={mileageAtArrival}
            onSave={onMileageChange}
            onClose={() => setMileageModalOpen(false)}
        />
    );

    if (embedded) {
        return <>{rows}{handoff}{modal}</>;
    }

    return (
        <RailPanel aria-labelledby="visit-intake-title">
            <Head>
                <SectionTitle id="visit-intake-title">Przyjęcie pojazdu</SectionTitle>
                {onViewDetails && (
                    <Button variant="ghost" size="sm" onClick={onViewDetails}>
                        Karta pojazdu<ArrowUpRight />
                    </Button>
                )}
            </Head>
            <Rows>{rows}</Rows>
            {handoff}
            {modal}
        </RailPanel>
    );
};
