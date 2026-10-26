// src/modules/bays/components/BarPreviewDrawer.tsx
//
// Podgląd auta z planu stanowisk. Odpowiada na pytania, z którymi
// ktoś klika w pasek: gdzie i do kiedy to auto stoi, czy zdążymy na obiecany odbiór,
// czyje to auto i jak się z nim skontaktować, co je czeka dalej (inne stanowiska) i co
// jest do zrobienia. Dawniej był tu sam czas i lista usług - wszystko inne wymagało
// otwarcia wizyty i powrotu na oś.
//
// Układ według CLAUDE.md §2: JEDNA wyniesiona karta (stanowisko i czas - temat okna),
// reszta płasko z nagłówkami; JEDEN wypełniony przycisk („Otwórz wizytę").
//
// Usługi są czytane z wizyty (auto przyjęte) albo z rezerwacji (jeszcze nie przyjęte).
// Odhaczanie to ta sama lista kontrolna co w wizycie (Ustawienia → Tablety): pola tylko
// przy pracy w toku, rezerwacja ich nie ma.

import styled, { css } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CalendarPlus, Phone, StickyNote, User } from 'lucide-react';
import { Button, Card, DrawerBody, Notice, SideDrawer, StatusPill, touch, ui } from '@/common/components/ui';
import { formatPhoneNumber } from '@/common/utils/formatters';
import { useVisitDetail } from '@/modules/visits/hooks';
import { useServiceChecklist } from '@/modules/visits/hooks/useServiceChecklist';
import { ServiceCheckToggle } from '@/modules/visits/components/ServiceCheckToggle';
import { appointmentDetailQuery } from '@/modules/appointments/api/appointmentDetailQuery';
import { useVisitViewConfig } from '@/modules/settings/hooks/useCompany';
import type { ServiceLineItem } from '@/modules/visits/types';
import type { BayCar, BaysSnapshot } from '../types';
import { carStages, type WeekBar } from '../utils/weekLayout';
import { clockText, durationLabel, formatMinutes, rangeText, relativeDay, toDateKey } from '../utils/slots';
import { Plate } from './primitives';
import { carLabel } from '../utils/labels';

const KIND_PILL = {
    plan: { tone: 'neutral', label: 'Plan' },
    active: { tone: 'info', label: 'Trwa' },
    done: { tone: 'neutral', label: 'Zrobione' },
} as const;

/* Auto bez paska: odcień „przeczytaj” zostaje dla spóźnień, tu tylko stan. */
const WAITING_PILL = {
    waiting: { tone: 'neutral', label: 'Czeka' },
    booked: { tone: 'neutral', label: 'Rezerwacja' },
} as const;

const when = (d: Date, now: Date) => `${relativeDay(toDateKey(d), now)} ${clockText(d)}`;

/* ── Karta stanowiska: jedyna wyniesiona powierzchnia ─────────────────────── */

const Hero = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
`;

const HeroTop = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;

    h3 { margin: 0; font-size: 18px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 13px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; white-space: nowrap; }
`;

const HeroRange = styled.div`
    font-size: 15px;
    font-weight: 600;
    color: ${ui.inkSoft};
    font-variant-numeric: tabular-nums;
`;

/* Ile planu już minęło - pasek czyta się szybciej niż dwie godziny do odjęcia w głowie. */
const Track = styled.div`
    position: relative;
    height: 8px;
    border-radius: 999px;
    background: ${ui.surfaceAlt};
    overflow: hidden;
`;

const Fill = styled.div<{ $over: boolean }>`
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 999px;
    background: ${p => (p.$over ? '#f59e0b' : ui.brand)};
`;

const TrackLegend = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12.5px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const PromiseLine = styled.div<{ $late: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid ${ui.lineSoft};
    font-size: 13px;
    color: ${p => (p.$late ? ui.warnInk : ui.textSecondary)};

    svg { width: 15px; height: 15px; flex-shrink: 0; }
    strong { font-weight: 600; }
`;

/* ── Sekcje płaskie ──────────────────────────────────────────────────────── */

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 30px;

    h3 { margin: 0; font-size: 15px; font-weight: 700; color: ${ui.ink}; }
`;

const Progress = styled.span<{ $all: boolean }>`
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${p => (p.$all ? ui.okInk : ui.textSecondary)};
`;

const Person = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const PersonIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    background: ${ui.surfaceAlt};
    color: ${ui.textSecondary};

    svg { width: 17px; height: 17px; }
`;

const PersonText = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    span { font-size: 13px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

const CallLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    flex-shrink: 0;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${ui.line};
    background: ${ui.surface};
    color: ${ui.inkSoft};
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;

    svg { width: 14px; height: 14px; }
    &:hover { border-color: ${ui.lineStrong}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
    ${touch} { height: 44px; }
`;

const List = styled.ol`
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
`;

/* Etap auta: numer, stanowisko, czas. Etap, w który kliknięto, ma tło marki. */
const StageRow = styled.li<{ $current: boolean }>`
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${p => (p.$current ? ui.brandTint : 'transparent')};

    & + & { border-top: 1px solid ${ui.lineSoft}; }
    &:first-child { border-radius: ${ui.radiusRow} ${ui.radiusRow} 0 0; }
    &:last-child { border-radius: 0 0 ${ui.radiusRow} ${ui.radiusRow}; }
`;

const StageNo = styled.span<{ $done: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid ${p => (p.$done ? ui.line : ui.brandLine)};
    font-size: 11.5px;
    font-weight: 700;
    color: ${p => (p.$done ? ui.textMuted : ui.brandDeep)};
`;

const StageText = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 12.5px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

/* Przerwa między etapami - auto czeka na placu; widać, ile. */
const Gap = styled.li`
    padding: 4px 12px 4px 46px;
    border-top: 1px solid ${ui.lineSoft};
    font-size: 12px;
    color: ${ui.textMuted};
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

const Note = styled.div`
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: ${ui.radiusRow};
    background: ${ui.surfaceAlt};
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.inkSoft};
    white-space: pre-line;

    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 2px; color: ${ui.textMuted}; }
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

/** Usługa czekająca na zgodę klienta: dopisana albo do usunięcia - mówimy, która. */
const pendingLabel = (s: ServiceLineItem): string | null => {
    const pending = s.hasPendingChange ?? s.status === 'PENDING';
    if (!pending) return null;
    if (s.pendingOperation === 'DELETE') return 'Do usunięcia, czeka na zgodę klienta';
    if (s.pendingOperation === 'EDIT') return 'Zmiana czeka na zgodę klienta';
    return 'Czeka na zgodę klienta';
};

interface AppointmentService { id: string; serviceName: string; note?: string | null }
interface AppointmentDetail {
    customer?: { firstName?: string; lastName?: string; phone?: string; companyName?: string | null };
    services?: AppointmentService[];
}

interface Props {
    /** Pasek na osi; null - auto czeka na przypisanie (chips z paska oczekujących). */
    bar: WeekBar | null;
    /** Auto podglądu - przy pasku to `bar.car`. */
    car: BayCar;
    snap: BaysSnapshot;
    now: Date;
    canEdit: boolean;
    onClose: () => void;
    onDeleteBooking: (bookingId: string) => void;
    /** Auto stoi na stanowisku: zdjęcie z osi zamyka odcinek pracy. Brak - akcji nie ma. */
    onUnassign?: () => void;
    /** Kolejny etap auta na innym stanowisku albo w innym czasie. */
    onAddStage?: () => void;
}

export function BarPreviewDrawer({ bar, car, snap, now, canEdit, onClose, onDeleteBooking, onUnassign, onAddStage }: Props) {
    const navigate = useNavigate();
    // Auto bez paska czeka na przypisanie: ten sam podgląd (klient, usługi, notatki), bez osi.
    const pill = bar ? KIND_PILL[bar.kind] : WAITING_PILL[car.stage === 'BOOKED' ? 'booked' : 'waiting'];
    const bayName = (id: string) => snap.bays.find(b => b.id === id)?.name ?? '';
    const thisBay = !bar ? undefined
        : snap.bays.find(b => snap.bookings.some(x => x.id === bar.bookingId && x.bayId === b.id))
            ?? snap.bays.find(b => snap.stints.some(s => s.id === bar.id && s.bayId === b.id));
    const canDelete = canEdit && bar?.kind === 'plan' && !!bar.bookingId;
    const canUnassign = canEdit && bar?.kind === 'active' && !!car.visitId && !!onUnassign;

    const { visitDetail, isLoading: visitLoading, isError: visitError, notStarted } = useVisitDetail(car.visitId ?? '');
    const visit = visitDetail?.visit;
    const appointment = useQuery({
        ...appointmentDetailQuery(car.appointmentId ?? '', { quiet: true }),
        enabled: !car.visitId && !!car.appointmentId,
    });
    const appt = appointment.data as AppointmentDetail | undefined;
    const checklist = useServiceChecklist(car.visitId ?? undefined, visit?.status);
    const { config } = useVisitViewConfig();

    const stages = carStages(snap, car.id, now);
    const promised = car.promisedAt ? new Date(car.promisedAt) : null;
    const late = !!promised && stages.some(s => s.kind !== 'done' && s.end > promised);

    const span = bar ? Math.max(1, bar.end.getTime() - bar.start.getTime()) : 1;
    const elapsed = bar ? Math.min(1, Math.max(0, (now.getTime() - bar.start.getTime()) / span)) : 0;

    const customer = visit
        ? { name: [visit.customer.firstName, visit.customer.lastName].filter(Boolean).join(' '), phone: visit.customer.phone, company: visit.customer.companyName }
        : appt?.customer
            ? { name: [appt.customer.firstName, appt.customer.lastName].filter(Boolean).join(' '), phone: appt.customer.phone, company: appt.customer.companyName }
            : null;

    const services: (ServiceLineItem | AppointmentService)[] = visit
        ? visit.services.filter(s => s.status !== 'REJECTED')
        : appt?.services ?? [];
    const done = visit ? services.filter(s => checklist.checkOf(s.id)).length : 0;
    const loading = car.visitId ? visitLoading : appointment.isLoading;
    const notes = [visit?.technicalNotes, visit?.inspectionNotes].filter((n): n is string => !!n && !!n.trim());

    return (
        <SideDrawer
            onClose={onClose}
            titleId="bar-preview-title"
            title={<Plate $size="lg">{carLabel(car)}</Plate>}
            status={<StatusPill $tone={pill.tone}>{pill.label}</StatusPill>}
            subtitle={car.vehicleName}
            width={540}
            footer={(
                <>
                    {canDelete && (
                        <Button variant="tintedDanger" size="lg" onClick={() => { onDeleteBooking(bar!.bookingId!); onClose(); }}>Usuń z planu</Button>
                    )}
                    {canUnassign && (
                        <Button variant="tintedDanger" size="lg" onClick={() => { onUnassign!(); onClose(); }}>Zdejmij ze stanowiska</Button>
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
                <Hero aria-label={bar ? 'Na stanowisku' : 'Oczekuje na przypisanie'}>
                    <HeroTop>
                        <h3>{bar ? thisBay?.name ?? 'Stanowisko' : 'Oczekuje na przypisanie'}</h3>
                        <span>{car.jobTitle}</span>
                    </HeroTop>
                    {bar ? <HeroRange>{rangeText(bar.start, bar.end, now)}</HeroRange> : (
                        <TrackLegend><span>{canEdit ? 'Przeciągnij auto z paska na stanowisko, żeby je zaplanować.' : 'Auto nie ma jeszcze planu na stanowisku.'}</span></TrackLegend>
                    )}
                    {bar?.kind === 'active' && (
                        <>
                            <Track role="progressbar" aria-label="Ile planu minęło" aria-valuenow={Math.round(elapsed * 100)} aria-valuemin={0} aria-valuemax={100}>
                                <Fill $over={bar.overPlan} style={{ width: `${elapsed * 100}%` }} />
                            </Track>
                            <TrackLegend>
                                <span>na stanowisku {formatMinutes(bar.minutes)}</span>
                                <span>{bar.overPlan ? 'dłużej niż plan' : `plan do ${when(bar.end, now)}`}</span>
                            </TrackLegend>
                        </>
                    )}
                    {bar?.kind === 'plan' && <TrackLegend><span>{durationLabel(bar.minutes)} pracy</span></TrackLegend>}
                    {promised && (
                        <PromiseLine $late={late}>
                            <CalendarClock aria-hidden="true" />
                            <span>Odbiór obiecany <strong>{when(promised, now)}</strong>{late ? ', plan kończy się później' : ''}</span>
                        </PromiseLine>
                    )}
                </Hero>

                {customer && (customer.name || customer.company || customer.phone) && (
                    <Section aria-labelledby="bar-customer-title">
                        <Head><h3 id="bar-customer-title">Klient</h3></Head>
                        <Person>
                            <PersonIcon aria-hidden="true"><User /></PersonIcon>
                            <PersonText>
                                <strong>{customer.name || customer.company || formatPhoneNumber(customer.phone ?? '')}</strong>
                                {customer.company && customer.name && <span>{customer.company}</span>}
                                {customer.phone && <span>{formatPhoneNumber(customer.phone)}</span>}
                            </PersonText>
                            {customer.phone && (
                                <CallLink href={`tel:${customer.phone.replace(/\s+/g, '')}`}>
                                    <Phone aria-hidden="true" />Zadzwoń
                                </CallLink>
                            )}
                        </Person>
                    </Section>
                )}

                <Section aria-labelledby="bar-stages-title">
                    <Head>
                        <h3 id="bar-stages-title">Trasa auta</h3>
                        {onAddStage && (
                            <Button variant="tinted" size="sm" onClick={onAddStage}>
                                <CalendarPlus aria-hidden="true" />Dodaj etap
                            </Button>
                        )}
                    </Head>
                    <List>
                        {stages.flatMap((st, i) => {
                            const prev = stages[i - 1];
                            const pause = prev ? (st.start.getTime() - prev.end.getTime()) / 60_000 : 0;
                            const row = (
                                <StageRow key={st.barId} $current={st.barId === bar?.id} aria-current={st.barId === bar?.id ? 'true' : undefined}>
                                    <StageNo $done={st.kind === 'done'}>{i + 1}</StageNo>
                                    <StageText>
                                        <strong>{bayName(st.bayId)}</strong>
                                        <span>{rangeText(st.start, st.end, now)}</span>
                                    </StageText>
                                    <StatusPill $tone={KIND_PILL[st.kind].tone}>{KIND_PILL[st.kind].label}</StatusPill>
                                </StageRow>
                            );
                            return pause >= 30
                                ? [<Gap key={`gap-${st.barId}`}>przerwa {formatMinutes(Math.round(pause))}, auto czeka na przypisanie</Gap>, row]
                                : [row];
                        })}
                    </List>
                    {stages.length === 0 && <Muted>Auto nie ma jeszcze etapów na stanowiskach.</Muted>}
                    {stages.length === 1 && onAddStage && (
                        <Muted>Auto pojedzie potem na inne stanowisko? Dodaj etap i zaznacz jego czas na osi.</Muted>
                    )}
                </Section>

                <Section aria-labelledby="bar-services-title">
                    <Head>
                        <h3 id="bar-services-title">Usługi</h3>
                        {services.length > 0 && (
                            checklist.enabled
                                ? <Progress $all={done === services.length}>{done} z {services.length} zrobione</Progress>
                                : <Progress $all={false}>{services.length}</Progress>
                        )}
                    </Head>
                    {checklist.enabled && services.length > 0 && (
                        <Track aria-hidden="true"><Fill $over={false} style={{ width: `${(done / services.length) * 100}%`, background: ui.okInk }} /></Track>
                    )}
                    {loading ? <Muted>Wczytywanie usług…</Muted>
                        : notStarted ? <Notice tone="info" title="Przyjęcie nie jest dokończone">Usługi pokażą się po dokończeniu przyjęcia pojazdu.</Notice>
                            : (car.visitId && visitError) || (!car.visitId && appointment.isError)
                                ? <Notice tone="warn" title="Nie udało się wczytać usług">Otwórz {car.visitId ? 'wizytę' : 'rezerwację'}, żeby je zobaczyć.</Notice>
                                : services.length === 0 ? <Muted>{car.visitId || car.appointmentId ? 'Brak usług.' : 'Auto nie ma wizyty ani rezerwacji.'}</Muted> : (
                                    <List as="ul">
                                        {services.map(s => {
                                            const line = visit ? (s as ServiceLineItem) : null;
                                            const check = line && checklist.enabled ? checklist.checkOf(s.id) : undefined;
                                            const pending = line ? pendingLabel(line) : null;
                                            const checkable = !!line && checklist.enabled;
                                            return (
                                                <Item key={s.id} $done={!!check} $checkable={checkable}>
                                                    {checkable && (
                                                        <ServiceCheckToggle checked={!!check} serviceName={s.serviceName} onChange={v => checklist.toggle(s.id, v)} />
                                                    )}
                                                    <ItemText $checkable={checkable}>
                                                        <strong>{s.serviceName}</strong>
                                                        {line?.isPackage && line.packageItems && line.packageItems.length > 0 && (
                                                            <Package>{line.packageItems.map(p => <li key={p.serviceId + p.position}>{p.serviceName}</li>)}</Package>
                                                        )}
                                                        {s.note && <p>{s.note}</p>}
                                                        {check && (
                                                            <CheckedBy>
                                                                Zrobione {when(new Date(check.checkedAt), now)}{check.checkedByName ? `, ${check.checkedByName}` : ''}
                                                            </CheckedBy>
                                                        )}
                                                        {pending && <Pills><StatusPill $tone="warn">{pending}</StatusPill></Pills>}
                                                    </ItemText>
                                                </Item>
                                            );
                                        })}
                                    </List>
                                )}
                    {!car.visitId && config?.serviceChecklistEnabled && services.length > 0 && (
                        <Muted>Usługi odhaczysz po przyjęciu auta.</Muted>
                    )}
                </Section>

                {notes.length > 0 && (
                    <Section aria-labelledby="bar-notes-title">
                        <Head><h3 id="bar-notes-title">Notatki z przyjęcia</h3></Head>
                        {notes.map((n, i) => <Note key={i}><StickyNote aria-hidden="true" />{n}</Note>)}
                    </Section>
                )}
            </DrawerBody>
        </SideDrawer>
    );
}
