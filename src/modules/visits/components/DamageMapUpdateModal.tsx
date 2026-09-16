// src/modules/visits/components/DamageMapUpdateModal.tsx
//
// „Zaktualizuj uszkodzenia" — okno z karty wizyty.
//
// Zgłoszenie z produkcji brzmiało tak: w trakcie prac wychodzi rysa, której nie ma
// w protokole przyjęcia, i nie ma jej gdzie dopisać. Mapa uszkodzeń powstawała raz,
// przy przyjęciu, i od tej chwili była plikiem, nie danymi.
//
// Okno prowadzi przez trzy decyzje, w tej kolejności, bo tak wygląda rozmowa przy
// stanowisku: co zrobić z dotychczasowym dokumentem → co dorysować → czy mówić o
// tym klientowi. Pierwsza jest pierwsza świadomie: po dorysowaniu dziesięciu
// punktów nikt nie czyta wyjaśnień o nadpisywaniu podpisanego protokołu.

import { useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useModalViewport } from '@/common/hooks';
/* Bezpośrednio z pliku komponentu, nie z barrel-a modułu: barrel checkinu ciągnie
   kreator przyjęcia, a ten kolejne pół aplikacji — w oknie wizyty potrzebny jest
   sam edytor mapy. */
import { VehicleDamageMapper } from '@/modules/checkin/components/VehicleDamageMapper';
import type { DamagePoint, PhotoSlot } from '@/modules/checkin/types';
import type { DamageMapUpdateMode, VisitPhoto } from '../types';
import {
    buildDamageMapNotificationDraft,
    buildDamageMapPayload,
    describeDamageMapChange,
    diffDamagePoints,
    markWord,
} from '../utils/damageMapUpdate';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

type Step = 'mode' | 'edit' | 'notify';

const STEP_ORDER: Step[] = ['mode', 'edit', 'notify'];

// ─── Styles ───────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 9999;
`;

const Card = styled.div`
    width: 100%;
    max-width: 880px;
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
`;

const Header = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${st.border};
`;

const HeaderTexts = styled.div`
    min-width: 0;
`;

const Title = styled.h4`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: ${st.text};
`;

const Subtitle = styled.p`
    margin: 3px 0 0;
    font-size: 12px;
    color: ${st.textMuted};
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    padding: 5px;
    color: ${st.textMuted};
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    transition: all 150ms ease;

    &:hover { color: ${st.accentRed}; background: ${st.bgAccentRed}; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    svg { width: 15px; height: 15px; }
`;

/* Kropki kroków, nie numerowany „wizard": trzy decyzje mieszczą się w jednym
   spojrzeniu, a pasek postępu sugerowałby dłuższą drogę, niż to jest. */
const StepDots = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
`;

const StepDot = styled.span<{ $state: 'done' | 'current' | 'todo' }>`
    height: 4px;
    border-radius: 999px;
    transition: all 200ms ease;
    ${p => p.$state === 'current' && css`width: 26px; background: ${BRAND};`}
    ${p => p.$state === 'done' && css`width: 14px; background: rgba(14, 165, 233, 0.4);`}
    ${p => p.$state === 'todo' && css`width: 14px; background: ${st.border};`}
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
`;

const SectionHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const SectionIcon = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(14, 165, 233, 0.1);
    color: ${BRAND_DARK};

    svg { width: 16px; height: 16px; }
`;

/* Nagłówek sekcji pismem tekstowym, nie wersalikami 11 px w szarości: ta druga
   forma jest w tym repozytorium wycofywana wszędzie, gdzie była JEDYNĄ ramą
   sekcji — bo wtedy nic w kolumnie nie jest przedmiotem. */
const SectionTitle = styled.h5`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
`;

const SectionNote = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: ${st.textSecondary};
`;

const OptionGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

/*
 * Kafelki wyboru noszą swój ODCIEŃ (tło + obwódka), ale nigdy WYPEŁNIENIA:
 * wypełniony jest tylko przycisk kroku następnego w stopce. Dwa wypełnienia w
 * jednym oknie znaczą tyle samo co zero — użytkownik nie ma czym rozstrzygnąć,
 * na co patrzeć najpierw.
 */
const OptionTile = styled.button<{ $selected: boolean; $tone: 'brand' | 'amber' }>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 14px 16px;
    text-align: left;
    font-family: inherit;
    border-radius: 12px;
    cursor: pointer;
    transition: all 160ms ease;

    ${p => {
        const accent = p.$tone === 'amber' ? st.accentAmber : BRAND;
        const tint = p.$tone === 'amber' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(14, 165, 233, 0.07)';
        const strong = p.$tone === 'amber' ? '#b45309' : BRAND_DARK;
        return p.$selected
            ? css`
                border: 1.5px solid ${accent};
                background: ${tint};
                box-shadow: 0 0 0 3px ${p.$tone === 'amber' ? 'rgba(245,158,11,0.14)' : 'rgba(14,165,233,0.14)'};
                color: ${strong};
            `
            : css`
                border: 1.5px solid ${st.border};
                background: ${st.bgCard};
                color: ${st.text};

                &:hover:not(:disabled) { border-color: ${st.borderHover}; background: ${st.bg}; }
            `;
    }}

    &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }
`;

const OptionTitle = styled.span`
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13.5px;
    font-weight: 700;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const OptionDesc = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: ${st.textSecondary};
`;

const OptionBadge = styled.span`
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid rgba(14, 165, 233, 0.35);
    background: rgba(14, 165, 233, 0.08);
    color: ${BRAND_DARK};
`;

const WarnBox = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    background: ${st.bgAccentAmber};
    border-radius: 10px;
    font-size: 12.5px;
    line-height: 1.55;
    color: #92400e;

    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 2px; }
`;

const SummaryBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: 10px;
`;

/* Liczba, po którą się wraca, jest nagłówkiem — rozpisanie jest dowodem pod nią. */
const SummaryHeadline = styled.span`
    font-size: 15px;
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const SummaryDetail = styled.span`
    font-size: 12.5px;
    line-height: 1.5;
    color: ${st.textSecondary};
`;

const FieldGroup = styled.div<{ $focused?: boolean }>`
    border: 1.5px solid ${p => (p.$focused ? BRAND : st.border)};
    border-radius: 10px;
    background: ${st.bgCard};
    overflow: hidden;
    transition: border-color 180ms;
    ${p => p.$focused && css`box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);`}
`;

const Textarea = styled.textarea`
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 92px;
    resize: vertical;
    padding: 10px 12px;
    border: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: ${st.text};
    background: transparent;
    outline: none;

    &::placeholder { color: ${st.textMuted}; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: ${st.textMuted};
`;

const Footer = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 20px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};
`;

const FooterLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const GhostBtn = styled.button`
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: ${st.textSecondary};
    background: transparent;
    border: 1.5px solid ${st.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover:not(:disabled) { background: ${st.bgCardAlt}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

/* JEDYNY wypełniony element w tym oknie. Wolno mu być wypełnionym, bo otwarty
   edytor przejmuje okno i jego „Zapisz" jest na ten moment krokiem następnym. */
const PrimaryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    color: #ffffff;
    background: linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%);
    border: none;
    border-radius: 9px;
    cursor: pointer;
    box-shadow: 0 3px 12px rgba(14, 165, 233, 0.3);
    transition: all 160ms ease;

    svg { width: 14px; height: 14px; }

    &:hover:not(:disabled) {
        box-shadow: 0 5px 16px rgba(14, 165, 233, 0.38);
        transform: translateY(-1px);
    }
    &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; transform: none; }
`;

const LoadingRow = styled.div`
    padding: 32px 0;
    text-align: center;
    font-size: 13px;
    color: ${st.textMuted};
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    visitNumber: string;
    /** Punkty zapisane dla tej wizyty (z API). */
    initialPoints: DamagePoint[];
    initialVehicleType: string | null;
    /**
     * false = punktów nie da się odtworzyć (wizyta sprzed zapisu punktów).
     * Okno mówi o tym wprost, bo inaczej „aktualizacja" skasowałaby wszystkie
     * oznaczenia z przyjęcia, i to bez śladu.
     */
    pointsRecoverable: boolean;
    /** Czy wizyta ma już wygenerowany PDF mapy — decyduje, czy jest co nadpisywać. */
    hasDocument: boolean;
    /** Zdjęcia wizyty, które można przypiąć do punktu. */
    visitPhotos: VisitPhoto[];
    isLoading: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: ReturnType<typeof buildDamageMapPayload>) => Promise<unknown>;
}

export const DamageMapUpdateModal = ({
    visitNumber,
    initialPoints,
    initialVehicleType,
    pointsRecoverable,
    hasDocument,
    visitPhotos,
    isLoading,
    isSaving,
    onClose,
    onSubmit,
}: Props) => {
    const [step, setStep] = useState<Step>('mode');
    const [mode, setMode] = useState<DamageMapUpdateMode>('NEW_FILE');
    const [notifyCustomer, setNotifyCustomer] = useState<boolean | null>(null);
    const [messageFocused, setMessageFocused] = useState(false);

    /*
     * Punkty dochodzą PO otwarciu okna (zapytanie leci dopiero wtedy), więc propsy
     * zmieniają się już przy otwartym edytorze. Stan lokalny trzyma więc wyłącznie
     * to, co zmienił użytkownik, a `null` znaczy „jeszcze nic" — wtedy wygrywają
     * propsy. Odwrotnie (stan startowy z propsów + efekt synchronizujący) trzeba
     * było pilnować referencją „czy już tknięte", a i tak doładowanie mapy potrafiło
     * zdmuchnąć świeżo postawiony punkt.
     */
    const [editedPoints, setEditedPoints] = useState<DamagePoint[] | null>(null);
    const [editedVehicleType, setEditedVehicleType] = useState<string | null>(null);
    const points = editedPoints ?? initialPoints;
    const vehicleType = editedVehicleType ?? initialVehicleType ?? 'sedan';

    const overlayRef = useRef<HTMLDivElement>(null);
    useModalViewport(true, overlayRef, isSaving ? undefined : onClose);

    const diff = useMemo(() => diffDamagePoints(initialPoints, points), [initialPoints, points]);

    /*
     * Szkic wiadomości też jest wyliczany, nie przechowywany: liczy się z RÓŻNICY,
     * a ta zmienia się, gdy użytkownik wróci do edytora i dorysuje kolejny punkt.
     * `message === null` znaczy „operator nic nie napisał" — wtedy w polu jest
     * aktualny szkic. Pusty string to świadome wyczyszczenie pola i zostaje pusty
     * (backend użyje wtedy własnego tekstu domyślnego).
     */
    const [message, setMessage] = useState<string | null>(null);
    const messageDraft = useMemo(
        () => buildDamageMapNotificationDraft(diff, visitNumber),
        [diff, visitNumber]
    );
    const messageValue = message ?? messageDraft;

    const availablePhotos: PhotoSlot[] = useMemo(
        () => visitPhotos.map(photo => ({
            id: photo.id,
            fileName: photo.fileName,
            uploadedAt: photo.uploadedAt,
            thumbnailUrl: photo.thumbnailUrl,
            previewUrl: photo.fullSizeUrl,
            tags: photo.tags,
        })),
        [visitPhotos]
    );

    const handleSubmit = async () => {
        try {
            await onSubmit(buildDamageMapPayload({
                damagePoints: points,
                vehicleType,
                mode,
                notifyCustomer: notifyCustomer === true,
                notifyMessage: messageValue,
            }));
        } catch {
            /*
             * Okno ZOSTAJE otwarte. Komunikat o błędzie pokazuje mutacja, a tu
             * liczy się to, żeby operator nie stracił dorysowanych punktów: zamknięcie
             * przy nieudanym zapisie znaczyłoby klikanie mapy od nowa.
             */
            return;
        }
        onClose();
    };

    const stepIndex = STEP_ORDER.indexOf(step);

    return (
        <Overlay ref={overlayRef} onClick={() => { if (!isSaving) onClose(); }}>
            <Card
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Aktualizacja mapy uszkodzeń"
            >
                <Header>
                    <HeaderTexts>
                        <Title>Zaktualizuj uszkodzenia</Title>
                        <Subtitle>Wizyta {visitNumber}</Subtitle>
                        <StepDots aria-hidden="true">
                            {STEP_ORDER.map((s, index) => (
                                <StepDot
                                    key={s}
                                    $state={index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'todo'}
                                />
                            ))}
                        </StepDots>
                    </HeaderTexts>
                    <CloseBtn type="button" onClick={onClose} disabled={isSaving} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </Header>

                <Body>
                    {step === 'mode' && (
                        <>
                            <SectionHead>
                                <SectionIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </SectionIcon>
                                <SectionTitle>Co zrobić z dotychczasowym dokumentem?</SectionTitle>
                            </SectionHead>

                            <SectionNote>
                                Mapa uszkodzeń z przyjęcia bywa podpisana przez klienta i wysłana mailem.
                                Dlatego to pytanie jest pierwsze, a nie ostatnie.
                            </SectionNote>

                            <OptionGrid>
                                <OptionTile
                                    type="button"
                                    $selected={mode === 'NEW_FILE'}
                                    $tone="brand"
                                    onClick={() => setMode('NEW_FILE')}
                                    aria-pressed={mode === 'NEW_FILE'}
                                >
                                    <OptionTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="12" y1="18" x2="12" y2="12" />
                                            <line x1="9" y1="15" x2="15" y2="15" />
                                        </svg>
                                        Wygeneruj nowy plik
                                        <OptionBadge>zalecane</OptionBadge>
                                    </OptionTitle>
                                    <OptionDesc>
                                        Nowa mapa pojawi się w dokumentacji obok dotychczasowej.
                                        Wersja z przyjęcia zostaje nietknięta — widać, co było na starcie,
                                        a co dopisano w trakcie.
                                    </OptionDesc>
                                </OptionTile>

                                <OptionTile
                                    type="button"
                                    $selected={mode === 'REPLACE_EXISTING'}
                                    $tone="amber"
                                    onClick={() => setMode('REPLACE_EXISTING')}
                                    aria-pressed={mode === 'REPLACE_EXISTING'}
                                    disabled={!hasDocument}
                                    title={hasDocument ? undefined : 'Ta wizyta nie ma jeszcze wygenerowanej mapy uszkodzeń'}
                                >
                                    <OptionTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Zaktualizuj istniejący
                                    </OptionTitle>
                                    <OptionDesc>
                                        {hasDocument
                                            ? 'Dotychczasowy plik zostanie nadpisany. W dokumentacji zostanie jedna, aktualna mapa — poprzedniej wersji nie da się odzyskać.'
                                            : 'Niedostępne: ta wizyta nie ma jeszcze wygenerowanej mapy uszkodzeń.'}
                                    </OptionDesc>
                                </OptionTile>
                            </OptionGrid>

                            {mode === 'REPLACE_EXISTING' && (
                                <WarnBox>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <span>
                                        Jeśli klient dostał już mapę z przyjęcia, po nadpisaniu nie pokażesz,
                                        jak dokument wyglądał przy przyjęciu pojazdu.
                                    </span>
                                </WarnBox>
                            )}

                            {!pointsRecoverable && (
                                <WarnBox>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>
                                        {hasDocument
                                            ? 'Ta wizyta jest starsza niż zapis oznaczeń — z przyjęcia został tylko gotowy plik PDF, bez współrzędnych punktów. Mapę trzeba rozrysować od nowa; otwórz dotychczasowy dokument w sekcji Dokumentacja i przenieś z niego oznaczenia.'
                                            : 'Ta wizyta nie ma jeszcze mapy uszkodzeń — rozrysujesz ją od zera.'}
                                    </span>
                                </WarnBox>
                            )}
                        </>
                    )}

                    {step === 'edit' && (
                        <>
                            <SectionHead>
                                <SectionIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="9" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                </SectionIcon>
                                <SectionTitle>Oznacz uszkodzenia</SectionTitle>
                            </SectionHead>

                            {isLoading ? (
                                <LoadingRow>Wczytywanie zapisanych oznaczeń...</LoadingRow>
                            ) : (
                                <VehicleDamageMapper
                                    points={points}
                                    onChange={setEditedPoints}
                                    availablePhotos={availablePhotos}
                                    vehicleType={vehicleType}
                                    onVehicleTypeChange={setEditedVehicleType}
                                />
                            )}
                        </>
                    )}

                    {step === 'notify' && (
                        <>
                            <SummaryBox>
                                <SummaryHeadline>
                                    {points.length} {markWord(points.length)} na mapie
                                </SummaryHeadline>
                                <SummaryDetail>{describeDamageMapChange(diff)}</SummaryDetail>
                                <SummaryDetail>
                                    {mode === 'NEW_FILE'
                                        ? 'Zapis utworzy nowy plik w dokumentacji; wersja z przyjęcia zostaje.'
                                        : 'Zapis nadpisze dotychczasowy plik mapy uszkodzeń.'}
                                </SummaryDetail>
                            </SummaryBox>

                            <SectionHead>
                                <SectionIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="M2 7l10 7 10-7" />
                                    </svg>
                                </SectionIcon>
                                <SectionTitle>Poinformować klienta o zmianach?</SectionTitle>
                            </SectionHead>

                            <OptionGrid>
                                <OptionTile
                                    type="button"
                                    $selected={notifyCustomer === true}
                                    $tone="brand"
                                    onClick={() => setNotifyCustomer(true)}
                                    aria-pressed={notifyCustomer === true}
                                >
                                    <OptionTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Tak, powiadom
                                    </OptionTitle>
                                    <OptionDesc>
                                        Klient dostanie e-mail z aktualnym dokumentem w załączniku.
                                        Jeśli nie ma adresu — SMS z informacją, że mapa się zmieniła.
                                    </OptionDesc>
                                </OptionTile>

                                <OptionTile
                                    type="button"
                                    $selected={notifyCustomer === false}
                                    $tone="brand"
                                    onClick={() => setNotifyCustomer(false)}
                                    aria-pressed={notifyCustomer === false}
                                >
                                    <OptionTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                        Nie, powiem osobiście
                                    </OptionTitle>
                                    <OptionDesc>
                                        Mapa zapisze się bez wysyłki. Zmiana zostanie w historii wizyty,
                                        więc widać, kto i kiedy ją wprowadził.
                                    </OptionDesc>
                                </OptionTile>
                            </OptionGrid>

                            {notifyCustomer === true && (
                                <>
                                    <FieldGroup $focused={messageFocused}>
                                        <Textarea
                                            value={messageValue}
                                            onChange={e => setMessage(e.target.value)}
                                            onFocus={() => setMessageFocused(true)}
                                            onBlur={() => setMessageFocused(false)}
                                            placeholder="Treść wiadomości do klienta"
                                            aria-label="Treść wiadomości do klienta"
                                        />
                                    </FieldGroup>
                                    <Hint>
                                        Bez polskich znaków — tej samej treści używamy w SMS-ie,
                                        a ogonki tną segment ze 160 znaków do 70.
                                    </Hint>
                                </>
                            )}
                        </>
                    )}
                </Body>

                <Footer>
                    <FooterLeft>
                        {step !== 'mode' && (
                            <GhostBtn
                                type="button"
                                onClick={() => setStep(STEP_ORDER[stepIndex - 1])}
                                disabled={isSaving}
                            >
                                Wróć
                            </GhostBtn>
                        )}
                        <GhostBtn type="button" onClick={onClose} disabled={isSaving}>
                            Anuluj
                        </GhostBtn>
                    </FooterLeft>

                    {step === 'notify' ? (
                        <PrimaryBtn
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving || notifyCustomer === null || !diff.hasChanges}
                            title={
                                !diff.hasChanges ? 'Nic się nie zmieniło — nie ma czego zapisywać'
                                : notifyCustomer === null ? 'Wybierz, czy poinformować klienta'
                                : undefined
                            }
                        >
                            {isSaving ? 'Zapisywanie...' : 'Zapisz mapę uszkodzeń'}
                            {!isSaving && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            )}
                        </PrimaryBtn>
                    ) : (
                        <PrimaryBtn
                            type="button"
                            onClick={() => setStep(STEP_ORDER[stepIndex + 1])}
                            disabled={isSaving || (step === 'edit' && !diff.hasChanges)}
                            title={step === 'edit' && !diff.hasChanges ? 'Dodaj lub popraw oznaczenie, żeby przejść dalej' : undefined}
                        >
                            {step === 'mode' ? 'Przejdź do mapy' : 'Podsumowanie'}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </PrimaryBtn>
                    )}
                </Footer>
            </Card>
        </Overlay>
    );
};
