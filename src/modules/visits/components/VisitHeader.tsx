// src/modules/visits/components/VisitHeader.tsx
//
// Nagłówek wizyty: CO to za auto, NA KIEDY i CO ZROBIĆ DALEJ - w jednym ciemnym bloku.
//
// Wcześniej były to dwa osobne ciemne bloki jeden pod drugim: nagłówek z tytułem
// i akcjami, a pod nim pasek postępu „W realizacji - Do odbioru - Zakończona".
// Dwa ciemne prostokąty zabierały ~250px nad wykazem usług, a termin odbioru
// (pytanie, które pada przy ladzie) był zakresem dat bez godziny w szarej linijce.
// Teraz postęp i termin stoją w jednym rzędzie pod tytułem.
//
// W oknie jest dokładnie JEDNO wypełnienie (CLAUDE.md §2): zielone „Oznacz jako
// gotowe" / „Wydaj pojazd" (albo akcja rozliczenia po wydaniu). „Door to door"
// i menu ⋯ są obrysowane na ciemnym tle.
//
// Układ zależy od szerokości NAGŁÓWKA, nie okna: obok rozwiniętego menu aplikacji
// nagłówek ma realnie mniej miejsca, niż twierdzi `@media`, a tytuł łamał się
// wtedy po jednej literze (zgłoszenie z produkcji).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { CalendarDays, Check, FileText, FilePlus, MoreHorizontal, Pencil, Sparkles, Trash2, Truck, X } from 'lucide-react';
import type { Visit, VisitStatus } from '../types';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { usePermissions } from '@/core/permissions';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { ActionMenu, Button, IconButton, MenuItem, ui, useActionMenu } from '@/common/components/ui';
import { useContainerWidth } from '@/common/hooks';
import { pickupPhrase } from '../utils/pickupPhrase';

/** Poniżej tej szerokości nagłówka układ telefonu: akcja główna na całą szerokość pod spodem. */
const COMPACT_MAX_WIDTH = 640;

const COMPLETE_LABEL: Partial<Record<VisitStatus, string>> = {
    IN_PROGRESS: 'Oznacz jako gotowe',
    READY_FOR_PICKUP: 'Wydaj pojazd',
};

const STEPS: { status: VisitStatus; label: string }[] = [
    { status: 'IN_PROGRESS', label: 'W realizacji' },
    { status: 'READY_FOR_PICKUP', label: 'Do odbioru' },
    { status: 'COMPLETED', label: 'Zakończona' },
];

const SPECIAL_STATUS: Partial<Record<VisitStatus, string>> = {
    DRAFT: 'Przyjęcie niedokończone, czeka na podpisy',
    REJECTED: 'Wizyta odrzucona',
    ARCHIVED: 'Wizyta w archiwum',
};

// ─── Styl ─────────────────────────────────────────────────────────────────────

const Hero = styled.header`
    container: visit-hero / inline-size;
    border-radius: 18px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.18);
    color: #fff;
    margin-bottom: 16px;
`;

const Inner = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 26px 18px;

    @container visit-hero (max-width: 640px) { gap: 12px; padding: 16px; }
`;

const Top = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px 24px;
    min-width: 0;
    flex-wrap: wrap;

    @container visit-hero (max-width: 640px) { flex-wrap: nowrap; gap: 10px; }
`;

const Identity = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    /* Baza, nie zero: to ona decyduje, kiedy akcje zejdą do drugiego wiersza,
       zamiast ściskać tytuł do kilkunastu pikseli. */
    flex: 1 1 360px;

    @container visit-hero (max-width: 640px) { flex: 1 1 auto; }
`;

/* Jasna płytka pod logo: logotypy marek są rysowane na biało i część z nich
   (Audi, Peugeot, Skoda) na granacie znika. */
const LogoTile = styled.div`
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    box-sizing: border-box;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.12);

    @container visit-hero (max-width: 640px) { display: none; }
`;

const IdentText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;

    @container visit-hero (max-width: 640px) { gap: 6px; }
`;

const Eyebrow = styled.span`
    font-size: 12.5px;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;

    @container visit-hero (max-width: 640px) { font-size: 12px; }
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const Title = styled.h1<{ $placeholder?: boolean }>`
    margin: 0;
    min-width: 0;
    font-size: 24px;
    font-weight: ${p => p.$placeholder ? 400 : 700};
    font-style: ${p => p.$placeholder ? 'italic' : 'normal'};
    letter-spacing: -0.01em;
    line-height: 1.2;
    color: ${p => p.$placeholder ? 'rgba(148, 163, 184, 0.7)' : '#fff'};
    overflow-wrap: anywhere;

    @container visit-hero (max-width: 640px) { font-size: 20px; }
`;

const TitlePlaceholderBtn = styled.button`
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
`;

const TitleInput = styled.input`
    min-width: 0;
    width: 340px;
    max-width: 100%;
    padding: 4px 12px;
    border: 1.5px solid rgba(14, 165, 233, 0.6);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    font-family: inherit;
    font-weight: 700;
    outline: none;

    /* Podwójny selektor: globalne 16px dla dotyku nie może zmniejszyć pola tytułu. */
    && { font-size: 20px; }
    &:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2); }
    @container visit-hero (max-width: 640px) { width: 100%; && { font-size: 17px; } }
`;

const Meta = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 14px;
    min-width: 0;
    font-size: 13px;
    color: #cbd5e1;

    span { overflow-wrap: anywhere; }
`;

const Plate = styled.span`
    padding: 2px 8px;
    border-radius: 5px;
    background: #e2e8f0;
    color: ${ui.ink};
    font-family: ${ui.mono};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    white-space: nowrap;
`;

const Faint = styled.span`
    color: #94a3b8;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
`;

/* Jedyne wypełnienie w oknie jest zbudowane tak, żeby nie dało się go pomylić
   z „Zapisz": wyższe, większe pismo, cień w kolorze (CLAUDE.md §2, część druga). */
const PrimaryAction = styled(Button)`
    height: 44px;
    padding: 0 20px;
    font-size: 14.5px;

    @container visit-hero (max-width: 640px) { width: 100%; height: 48px; font-size: 15px; }
`;

const Progress = styled.div`
    display: flex;
    align-items: center;
    gap: 12px 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 0;
    flex-wrap: wrap;

    @container visit-hero (max-width: 640px) { padding-top: 0; border-top: none; gap: 10px; }
`;

const Steps = styled.ol`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1 1 360px;
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;

    @container visit-hero (max-width: 640px) { flex: 1 1 100%; gap: 8px; }
`;

const pulse = keyframes`
    0%, 100% { box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2); }
    50%      { box-shadow: 0 0 0 7px rgba(56, 189, 248, 0.06); }
`;

type StepState = 'done' | 'active' | 'future';

const Step = styled.li<{ $state: StepState }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-size: 13px;
    font-weight: ${p => p.$state === 'active' ? 600 : 500};
    white-space: nowrap;
    color: ${p => p.$state === 'active' ? '#fff' : p.$state === 'done' ? '#86efac' : '#94a3b8'};

    @container visit-hero (max-width: 640px) { gap: 6px; font-size: 12.5px; }
    @container visit-hero (max-width: 360px) { font-size: 11.5px; }
`;

const Dot = styled.span<{ $state: StepState }>`
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border-radius: 50%;
    box-sizing: border-box;
    ${p => p.$state === 'active' ? css`
        background: #38bdf8;
        animation: ${pulse} 2.4s ease-in-out infinite;
        @media (prefers-reduced-motion: reduce) { animation: none; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2); }
    ` : p.$state === 'done' ? css`
        background: #4ade80;
    ` : css`
        border: 2px solid #475569;
    `}
`;

const Line = styled.li<{ $state: 'done' | 'leading' | 'future' }>`
    flex: 1 1 24px;
    min-width: 12px;
    height: 2px;
    border-radius: 1px;
    background: ${p => p.$state === 'done' ? '#4ade80'
        : p.$state === 'leading' ? 'linear-gradient(90deg, #38bdf8, rgba(255, 255, 255, 0.12))'
        : 'rgba(255, 255, 255, 0.12)'};
`;

const Special = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
`;

const Schedule = styled.div`
    display: flex;
    align-items: center;
    gap: 4px 8px;
    flex-wrap: wrap;
    padding-left: 16px;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    min-width: 0;

    @container visit-hero (max-width: 640px) { padding-left: 0; border-left: none; flex: 1 1 100%; }
`;

const ScheduleText = styled.span<{ $overdue: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${p => p.$overdue ? '#fcd34d' : '#cbd5e1'};

    svg { width: 15px; height: 15px; color: ${p => p.$overdue ? '#fcd34d' : '#94a3b8'}; flex-shrink: 0; }
`;

const QuietIcon = styled(IconButton)`
    color: #94a3b8;
    &:hover:not(:disabled) { color: #fff; background: rgba(255, 255, 255, 0.08); }
`;

const ScheduleBtn = styled(Button)`
    color: #94a3b8;
    &:hover:not(:disabled) { color: #fff; background: rgba(255, 255, 255, 0.08); }
`;

// ─── Komponent ────────────────────────────────────────────────────────────────

interface VisitHeaderProps {
    visit: Visit;
    onCompleteVisit: () => void;
    /** Wizyta zakończona bez faktury: wystawienie faktury konsumenckiej. */
    onIssueConsumerInvoice?: () => void;
    /** Wizyta zakończona z fakturą: podgląd wystawionego dokumentu. */
    onPreviewInvoice?: () => void;
    onCancelVisit: () => void;
    onGeneratePost: () => void;
    onDoorToDoor?: () => void;
    onTitleUpdate?: (title: string) => Promise<void>;
    onEstimatedCompletionDateUpdate?: (isoDate: string) => Promise<void>;
}

function stepState(index: number, current: number): StepState {
    return index < current ? 'done' : index === current ? 'active' : 'future';
}

export const VisitHeader = ({
    visit,
    onCompleteVisit,
    onIssueConsumerInvoice,
    onPreviewInvoice,
    onCancelVisit,
    onGeneratePost,
    onDoorToDoor,
    onTitleUpdate,
    onEstimatedCompletionDateUpdate,
}: VisitHeaderProps) => {
    const { can } = usePermissions();
    const [heroRef, heroWidth] = useContainerWidth<HTMLElement>();
    const compact = heroWidth === null
        ? typeof window !== 'undefined' && window.innerWidth <= COMPACT_MAX_WIDTH
        : heroWidth <= COMPACT_MAX_WIDTH;
    const menu = useActionMenu();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [draftDate, setDraftDate] = useState('');
    const [isSavingDate, setIsSavingDate] = useState(false);

    useEffect(() => {
        if (isEditingTitle) titleInputRef.current?.focus();
    }, [isEditingTitle]);

    /** Tytuł da się edytować tylko wtedy, gdy jest i handler, i uprawnienie. */
    const canEditTitle = Boolean(onTitleUpdate) && can('VISITS_CREATE');
    const canEditDate = Boolean(onEstimatedCompletionDateUpdate) && can('VISITS_CREATE');
    const isTerminal = visit.status === 'COMPLETED' || visit.status === 'REJECTED' || visit.status === 'ARCHIVED';

    const startEditTitle = () => { setDraftTitle(visit.title ?? ''); setIsEditingTitle(true); };
    const cancelEditTitle = () => setIsEditingTitle(false);
    const saveTitle = async () => {
        if (!onTitleUpdate || isSavingTitle) return;
        setIsSavingTitle(true);
        try {
            await onTitleUpdate(draftTitle.trim());
            setIsEditingTitle(false);
        } finally {
            setIsSavingTitle(false);
        }
    };

    const openDateModal = () => {
        setDraftDate(visit.estimatedCompletionDate
            ? new Date(visit.estimatedCompletionDate).toISOString().slice(0, 16)
            : '');
        setIsDateModalOpen(true);
    };
    const saveDateModal = async () => {
        if (!onEstimatedCompletionDateUpdate || !draftDate || isSavingDate) return;
        setIsSavingDate(true);
        try {
            await onEstimatedCompletionDateUpdate(new Date(draftDate).toISOString());
            setIsDateModalOpen(false);
        } finally {
            setIsSavingDate(false);
        }
    };

    /*
     * Wizyta zakończona: „Zakończ wizytę" nie ma już czego zrobić. Zastępuje ją akcja
     * wynikająca z tego, czym wizytę rozliczono: faktura w KSeF → podgląd dokumentu,
     * inny dokument → wystawienie brakującej faktury konsumenckiej. Sprawdzamy
     * revenueInvoiceId, nie documentType: dokument typu INVOICE może istnieć bez
     * rekordu KSeF (adnotacja bez wysyłki), a wtedy nie ma czego pokazać.
     */
    const invoiceId = visit.settlement?.revenueInvoiceId ?? null;
    const settlementAction: 'preview' | 'issue' | null =
        visit.status !== 'COMPLETED' ? null
        : invoiceId && onPreviewInvoice ? 'preview'
        : visit.settlement?.documentType && visit.settlement.documentType !== 'INVOICE' && onIssueConsumerInvoice ? 'issue'
        : null;

    const primary = settlementAction === 'preview' && can('VISITS_VIEW') ? (
        <PrimaryAction variant="success" onClick={onPreviewInvoice}><FileText />Podgląd faktury</PrimaryAction>
    ) : settlementAction === 'issue' && can('VISITS_CREATE') ? (
        <PrimaryAction variant="success" onClick={onIssueConsumerInvoice}><FilePlus />Wystaw fakturę konsumencką</PrimaryAction>
    ) : settlementAction === null && can('VISITS_VIEW') && !isTerminal ? (
        <PrimaryAction variant="success" onClick={onCompleteVisit}>
            <Check />{COMPLETE_LABEL[visit.status] ?? 'Zakończ wizytę'}
        </PrimaryAction>
    ) : null;

    const canUseDoorToDoor = Boolean(onDoorToDoor) && can('VISITS_CREATE');
    const moreButton = can('VISITS_CREATE') && (
        <IconButton
            label="Więcej akcji wizyty"
            variant="onDark"
            size={compact ? 'md' : 'lg'}
            aria-haspopup="menu"
            aria-expanded={menu.isOpen()}
            onClick={e => menu.toggle(e, null)}
        >
            <MoreHorizontal />
        </IconButton>
    );

    const vehicleLine = [
        [visit.vehicle.brand, visit.vehicle.model].filter(Boolean).join(' '),
        !compact && visit.vehicle.yearOfProduction ? String(visit.vehicle.yearOfProduction) : null,
        !compact && visit.vehicle.color ? visit.vehicle.color : null,
    ].filter(Boolean).join(', ');

    const currentStep = STEPS.findIndex(s => s.status === visit.status);
    const special = SPECIAL_STATUS[visit.status];
    const pickup = pickupPhrase(visit.status, visit.estimatedCompletionDate, visit.pickupDate);

    return (
        <Hero ref={heroRef}>
            <Inner>
                <Top>
                    <Identity>
                        <LogoTile title={visit.vehicle.brand || undefined}>
                            <CarLogoImage brand={visit.vehicle.brand} size="md" />
                        </LogoTile>
                        <IdentText>
                            <Eyebrow>Wizyta {visit.visitNumber}</Eyebrow>
                            <TitleRow>
                                {isEditingTitle ? (
                                    <>
                                        <TitleInput
                                            ref={titleInputRef}
                                            aria-label="Tytuł wizyty"
                                            value={draftTitle}
                                            onChange={e => setDraftTitle(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveTitle();
                                                if (e.key === 'Escape') cancelEditTitle();
                                            }}
                                            disabled={isSavingTitle}
                                        />
                                        <IconButton label="Zapisz tytuł" variant="onDark" size="sm" onClick={saveTitle} disabled={isSavingTitle}>
                                            <Check />
                                        </IconButton>
                                        <IconButton label="Anuluj" variant="onDark" size="sm" onClick={cancelEditTitle}>
                                            <X />
                                        </IconButton>
                                    </>
                                ) : visit.title ? (
                                    <>
                                        <Title>{visit.title}</Title>
                                        {canEditTitle && (
                                            <QuietIcon label="Zmień nazwę wizyty" variant="ghost" size="sm" onClick={startEditTitle}>
                                                <Pencil />
                                            </QuietIcon>
                                        )}
                                    </>
                                ) : canEditTitle ? (
                                    <Title $placeholder>
                                        <TitlePlaceholderBtn type="button" onClick={startEditTitle}>Nadaj wizycie nazwę</TitlePlaceholderBtn>
                                    </Title>
                                ) : (
                                    /* Bez uprawnienia zaproszenie do nadania nazwy prowadziłoby donikąd. */
                                    <Title $placeholder>Bez nazwy</Title>
                                )}
                            </TitleRow>
                            <Meta>
                                {visit.vehicle.licensePlate && <Plate>{visit.vehicle.licensePlate}</Plate>}
                                {vehicleLine && <span>{vehicleLine}</span>}
                                {!compact && visit.acceptedByName && (
                                    <Faint title="Pracownik, który przyjął pojazd">Przyjęcie: {visit.acceptedByName}</Faint>
                                )}
                            </Meta>
                        </IdentText>
                    </Identity>

                    <Actions>
                        {!compact && canUseDoorToDoor && (
                            <Button variant="onDark" size="lg" onClick={onDoorToDoor}><Truck />Door to door</Button>
                        )}
                        {moreButton}
                        {!compact && primary}
                    </Actions>
                </Top>

                <Progress>
                    {special ? (
                        <Special>{special}</Special>
                    ) : (
                        <Steps aria-label="Etap wizyty">
                            {STEPS.map((step, i) => {
                                const state = stepState(i, currentStep);
                                return (
                                    <FragmentStep key={step.status} withLine={i > 0} lineState={
                                        i <= currentStep ? 'done' : i === currentStep + 1 ? 'leading' : 'future'
                                    }>
                                        <Step $state={state} aria-current={state === 'active' ? 'step' : undefined}>
                                            <Dot $state={state} aria-hidden="true" />{step.label}
                                        </Step>
                                    </FragmentStep>
                                );
                            })}
                        </Steps>
                    )}
                    {!special && (
                        <Schedule>
                            <ScheduleText $overdue={pickup.overdue}>
                                <CalendarDays aria-hidden="true" />{pickup.text}
                            </ScheduleText>
                            {canEditDate && visit.status !== 'COMPLETED' && (
                                <ScheduleBtn variant="ghost" size="sm" onClick={openDateModal}>
                                    {visit.estimatedCompletionDate ? 'Zmień termin' : 'Ustal termin'}
                                </ScheduleBtn>
                            )}
                        </Schedule>
                    )}
                </Progress>

                {compact && primary}
            </Inner>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje wizyty">
                {compact && canUseDoorToDoor && (
                    <MenuItem icon={<Truck />} onClick={onDoorToDoor}>Door to door</MenuItem>
                )}
                <MenuItem icon={<Sparkles />} onClick={onGeneratePost}>Generuj post</MenuItem>
                {can('VISITS_DELETE') && (
                    <MenuItem icon={<Trash2 />} danger disabled={isTerminal} onClick={onCancelVisit}>Usuń wizytę</MenuItem>
                )}
            </ActionMenu>

            <ModalShell isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Termin odbioru</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setIsDateModalOpen(false)} />
                </ModalHeader>
                <ModalContent>
                    <DateTimePicker
                        value={draftDate}
                        onChange={setDraftDate}
                        showTime
                        placeholder="Wybierz datę i godzinę"
                        accentColor={ui.brand}
                    />
                </ModalContent>
                <ModalFooter>
                    <Button onClick={() => setIsDateModalOpen(false)}>Anuluj</Button>
                    <Button variant="primary" onClick={saveDateModal} disabled={!draftDate || isSavingDate}>
                        {isSavingDate ? 'Zapisywanie...' : 'Zapisz termin'}
                    </Button>
                </ModalFooter>
            </ModalShell>
        </Hero>
    );
};

/** Krok z kreską przed nim - kreska jest częścią listy, nie osobnym elementem <li>. */
function FragmentStep({ withLine, lineState, children }: {
    withLine: boolean;
    lineState: 'done' | 'leading' | 'future';
    children: ReactNode;
}) {
    return (
        <>
            {withLine && <Line $state={lineState} role="presentation" aria-hidden="true" />}
            {children}
        </>
    );
}
