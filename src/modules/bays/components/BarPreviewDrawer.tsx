// src/modules/bays/components/BarPreviewDrawer.tsx
//
// Podgląd paska z planu stanowisk: CO jest do zrobienia przy tym aucie. Pasek mówi
// tylko „tablica, tytuł wizyty, ile trwa" - a mechanik, który patrzy na plan, pyta
// o listę usług. Wcześniej trzeba było otworzyć wizytę i wrócić na oś.
//
// Usługi są czytane z wizyty (auto przyjęte) albo z rezerwacji (jeszcze nie przyjęte).
// Odhaczanie to ta sama lista kontrolna co w wizycie (Ustawienia → Tablety): ten sam
// hook, te same zasady - pola tylko przy pracy w toku, rezerwacja ich nie ma, bo
// przy aucie, którego nie ma na hali, nic się jeszcze nie zrobiło.
//
// Jedyny wypełniony przycisk to „Otwórz wizytę" (CLAUDE.md §2); usunięcie z planu
// jest czerwienią bez wypełnienia.

import styled, { css } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button, DrawerBody, Notice, SectionTitle, SideDrawer, StatusPill, touch, ui } from '@/common/components/ui';
import { useVisitDetail } from '@/modules/visits/hooks';
import { useServiceChecklist } from '@/modules/visits/hooks/useServiceChecklist';
import { ServiceCheckToggle } from '@/modules/visits/components/ServiceCheckToggle';
import { appointmentDetailQuery } from '@/modules/appointments/api/appointmentDetailQuery';
import { useVisitViewConfig } from '@/modules/settings/hooks/useCompany';
import type { ServiceLineItem } from '@/modules/visits/types';
import type { WeekBar } from '../utils/weekLayout';
import { clockText, formatMinutes, rangeText, relativeDay, toDateKey } from '../utils/slots';
import { Plate } from './primitives';

const KIND_PILL = {
    plan: { tone: 'neutral', label: 'Plan' },
    active: { tone: 'info', label: 'Trwa' },
    done: { tone: 'neutral', label: 'Zrobione' },
} as const;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Head = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
`;

/* Ile zrobione - liczba, po którą się tu wraca, więc stoi w nagłówku sekcji. */
const Progress = styled.span<{ $all: boolean }>`
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${p => (p.$all ? ui.okInk : ui.textSecondary)};
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
`;

const Item = styled.li<{ $done: boolean; $checkable: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: ${p => (p.$checkable ? '6px 12px 6px 4px' : '11px 14px')};

    & + & { border-top: 1px solid ${ui.lineSoft}; }

    ${p => p.$done && css`
        strong { color: ${ui.textSecondary}; }
    `}
`;

const ItemText = styled.div<{ $checkable: boolean }>`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: ${p => (p.$checkable ? '6px' : '0')};
    /* Na dotyku pole ma cel 44 px - tekst schodzi do środka pola, nie do jego górnej krawędzi. */
    ${touch} { padding-top: ${p => (p.$checkable ? '12px' : '0')}; }

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    p { margin: 0; font-size: 12.5px; line-height: 1.45; color: ${ui.textMuted}; white-space: pre-line; }
`;

const Pills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const Package = styled.ul`
    margin: 2px 0 0;
    padding-left: 16px;
    font-size: 12.5px;
    color: ${ui.textSecondary};
`;

const CheckedBy = styled.span`
    font-size: 12px;
    color: ${ui.okInk};
`;

const BayName = styled.strong`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

interface Props {
    bar: WeekBar;
    bayName: string;
    now: Date;
    canEdit: boolean;
    onClose: () => void;
    onDeleteBooking: (bookingId: string) => void;
}

/** Usługa czekająca na zgodę klienta: dopisana albo do usunięcia - mówimy, która. */
const pendingLabel = (s: ServiceLineItem): string | null => {
    const pending = s.hasPendingChange ?? s.status === 'PENDING';
    if (!pending) return null;
    if (s.pendingOperation === 'DELETE') return 'Do usunięcia, czeka na zgodę klienta';
    if (s.pendingOperation === 'EDIT') return 'Zmiana czeka na zgodę klienta';
    return 'Czeka na zgodę klienta';
};

function VisitServices({ visitId, now }: { visitId: string; now: Date }) {
    const { visitDetail, isLoading, isError, notStarted } = useVisitDetail(visitId);
    const visit = visitDetail?.visit;
    const checklist = useServiceChecklist(visitId, visit?.status);

    if (isLoading) return <Muted>Wczytywanie usług…</Muted>;
    if (notStarted) return <Notice tone="info" title="Przyjęcie nie jest dokończone">Usługi pokażą się po dokończeniu przyjęcia pojazdu.</Notice>;
    if (isError || !visit) return <Notice tone="warn" title="Nie udało się wczytać usług">Otwórz wizytę, żeby je zobaczyć.</Notice>;

    const services = visit.services.filter(s => s.status !== 'REJECTED');
    const done = services.filter(s => checklist.checkOf(s.id)).length;

    return (
        <Section aria-labelledby="bar-services-title">
            <Head>
                <SectionTitle as="h3" id="bar-services-title" count={checklist.enabled ? undefined : services.length}>Usługi</SectionTitle>
                {checklist.enabled && services.length > 0 && (
                    <Progress $all={done === services.length}>{done} z {services.length} zrobione</Progress>
                )}
            </Head>
            {services.length === 0 ? <Muted>Wizyta nie ma jeszcze usług.</Muted> : (
                <List>
                    {services.map(s => {
                        const check = checklist.enabled ? checklist.checkOf(s.id) : undefined;
                        const pending = pendingLabel(s);
                        return (
                            <Item key={s.id} $done={!!check} $checkable={checklist.enabled}>
                                {checklist.enabled && (
                                    <ServiceCheckToggle checked={!!check} serviceName={s.serviceName} onChange={v => checklist.toggle(s.id, v)} />
                                )}
                                <ItemText $checkable={checklist.enabled}>
                                    <strong>{s.serviceName}</strong>
                                    {s.isPackage && s.packageItems && s.packageItems.length > 0 && (
                                        <Package>{s.packageItems.map(p => <li key={p.serviceId + p.position}>{p.serviceName}</li>)}</Package>
                                    )}
                                    {s.note && <p>{s.note}</p>}
                                    {check && (
                                        <CheckedBy>
                                            Zrobione {relativeDay(toDateKey(new Date(check.checkedAt)), now)} {clockText(new Date(check.checkedAt))}
                                            {check.checkedByName ? `, ${check.checkedByName}` : ''}
                                        </CheckedBy>
                                    )}
                                    {pending && <Pills><StatusPill $tone="warn">{pending}</StatusPill></Pills>}
                                </ItemText>
                            </Item>
                        );
                    })}
                </List>
            )}
        </Section>
    );
}

interface AppointmentService { id: string; serviceName: string; note?: string | null }

function AppointmentServices({ appointmentId }: { appointmentId: string }) {
    const { data, isLoading, isError } = useQuery(appointmentDetailQuery(appointmentId, { quiet: true }));
    const { config } = useVisitViewConfig();

    if (isLoading) return <Muted>Wczytywanie usług…</Muted>;
    if (isError || !data) return <Notice tone="warn" title="Nie udało się wczytać usług">Otwórz rezerwację, żeby je zobaczyć.</Notice>;

    const services: AppointmentService[] = data.services ?? [];
    return (
        <Section aria-labelledby="bar-services-title">
            <SectionTitle as="h3" id="bar-services-title" count={services.length}>Usługi</SectionTitle>
            {services.length === 0 ? <Muted>Rezerwacja nie ma usług.</Muted> : (
                <List>
                    {services.map(s => (
                        <Item key={s.id} $done={false} $checkable={false}>
                            <ItemText $checkable={false}>
                                <strong>{s.serviceName}</strong>
                                {s.note && <p>{s.note}</p>}
                            </ItemText>
                        </Item>
                    ))}
                </List>
            )}
            {config?.serviceChecklistEnabled && services.length > 0 && (
                <Muted>Usługi odhaczysz po przyjęciu auta.</Muted>
            )}
        </Section>
    );
}

export function BarPreviewDrawer({ bar, bayName, now, canEdit, onClose, onDeleteBooking }: Props) {
    const navigate = useNavigate();
    const { car } = bar;
    const pill = KIND_PILL[bar.kind];
    const canDelete = canEdit && bar.kind === 'plan' && !!bar.bookingId;

    return (
        <SideDrawer
            onClose={onClose}
            titleId="bar-preview-title"
            title={<Plate $size="lg">{car.licensePlate}</Plate>}
            status={<StatusPill $tone={pill.tone}>{pill.label}</StatusPill>}
            subtitle={car.vehicleName}
            width={520}
            footer={(
                <>
                    {canDelete && (
                        <Button variant="tintedDanger" size="lg" onClick={() => { onDeleteBooking(bar.bookingId!); onClose(); }}>Usuń z planu</Button>
                    )}
                    {car.visitId ? (
                        <Button variant="primary" size="lg" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/visits/${car.visitId}`)}>Otwórz wizytę</Button>
                    ) : car.appointmentId ? (
                        <Button variant="primary" size="lg" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/calendar/appointments/${car.appointmentId}`)}>Otwórz rezerwację</Button>
                    ) : null}
                </>
            )}
        >
            <DrawerBody>
                <Section aria-label="Na stanowisku">
                    <Head>
                        <BayName>{bayName}</BayName>
                        <Progress $all={false}>{bar.kind === 'plan' ? 'plan' : bar.kind === 'active' ? 'trwa' : 'trwało'} {formatMinutes(bar.minutes)}</Progress>
                    </Head>
                    <Muted>{rangeText(bar.start, bar.end, now)}</Muted>
                </Section>

                {car.visitId ? <VisitServices visitId={car.visitId} now={now} />
                    : car.appointmentId ? <AppointmentServices appointmentId={car.appointmentId} />
                        : <Muted>Auto nie ma wizyty ani rezerwacji, więc nie ma listy usług.</Muted>}
            </DrawerBody>
        </SideDrawer>
    );
}
