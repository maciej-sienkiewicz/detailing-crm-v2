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
import { DamageMapQrPanel } from './DamageMapQrPanel';
import { useDamageMapMobileSession } from '../hooks/useDamageMapMobileSession';
import { useDamageMapNotifyAvailability } from '../hooks/useDamageMapNotifyAvailability';
import {
    buildDamageMapNotificationDraft,
    buildDamageMapPayload,
    diffDamagePoints,
} from '../utils/damageMapUpdate';
import { hasPolishCharacters, pluralPl, smsSegments, smsWord } from '@/common/utils';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

type Step = 'mode' | 'edit' | 'notify';

/*
 * Ścieżka nie jest stała. Odpadają z niej kroki, które miałyby JEDNĄ możliwą
 * odpowiedź, bo taki ekran to kliknięcie na pusto przed właściwą pracą:
 *  - „co zrobić z dokumentem", gdy wizyta nie ma jeszcze mapy (nie ma czego nadpisać),
 *  - „poinformować klienta", gdy studio nie ma czym wysłać wiadomości.
 * Składa ją `stepOrder` w komponencie.
 */

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

    @media (max-width: 640px) {
        padding: 8px;
    }
`;

const Card = styled.div`
    width: 100%;
    max-width: 880px;
    max-height: calc(100dvh - 32px);
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 16px;
    overflow: hidden;

    @media (max-width: 640px) {
        max-height: calc(100dvh - 16px);
    }
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

    @media (max-width: 640px) {
        padding: 14px 14px 10px;
    }
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

/*
 * `overflow-x: hidden` to nie zamiatanie problemu pod dywan, a granica: przy
 * `overflow-y: auto` przeglądarka liczy drugą oś jako `auto`, więc jedna zbyt
 * szeroka kratka w środku sprawiała, że CAŁE okno dawało się przesuwać na boki
 * („pływało"). Kratki niżej same się zwężają (`min-width: 0` w mapperze), a to
 * jest zabezpieczenie na następną treść, która o tym zapomni.
 */
const Body = styled.div`
    flex: 1;
    min-height: 0;
    min-width: 0;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    overflow-x: hidden;

    @media (max-width: 640px) {
        padding: 14px;
    }
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

/*
 * Pasek stanu telefonu nad mapą. Zielony ODCIEŃ (tło + obwódka), bez wypełnienia:
 * wypełniony w tym oknie jest wyłącznie przycisk kroku następnego w stopce. To jest
 * informacja, którą operator sprawdza wzrokiem, a nie rzecz „do zrobienia teraz".
 */
const PhoneLinkBar = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    font-family: inherit;
    text-align: left;
    border: 1px solid rgba(16, 185, 129, 0.4);
    background: ${st.bgAccentGreen};
    border-radius: 10px;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: rgba(16, 185, 129, 0.1); border-color: ${st.accentGreen}; }
`;

const PhoneLinkDot = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: rgba(16, 185, 129, 0.16);
    color: #047857;

    svg { width: 15px; height: 15px; }
`;

const PhoneLinkTexts = styled.span`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const PhoneLinkTitle = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #047857;
`;

const PhoneLinkHint = styled.span`
    font-size: 11.5px;
    line-height: 1.45;
    color: ${st.textSecondary};
`;

const PhoneLinkChevron = styled.svg<{ $open: boolean }>`
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: #047857;
    transform: rotate(${p => (p.$open ? '180deg' : '0deg')});
    transition: transform 180ms ease;
`;

const PhonePanelWrap = styled.div`
    padding: 12px 14px;
    border: 1px solid ${st.border};
    border-radius: 10px;
    background: ${st.bg};
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

/*
 * „Klient nie zostanie powiadomiony, bo…". Neutralny, nie ostrzegawczy: to nie jest
 * błąd operatora ani rzecz do naprawienia w tym oknie, tylko fakt o studiu, który
 * musi być powiedziany przed zapisem, a nie po nim.
 */
const NoNotifyNote = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 10px 13px;
    border: 1px solid ${st.border};
    background: ${st.bg};
    border-radius: 10px;
    font-size: 12.5px;
    line-height: 1.55;
    color: ${st.textSecondary};

    svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 2px; color: ${st.textMuted}; }
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
    flex-wrap: wrap;

    @media (max-width: 640px) {
        padding: 10px 14px;
    }
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
    visitId: string;
    visitNumber: string;
    /** Do rozstrzygnięcia, czy „Poinformuj klienta" ma czym wyjść. */
    customerEmail: string | null;
    customerPhone: string | null;
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
    /**
     * Źródło „Z pliku": wysyła plik do galerii wizyty i oddaje gotowy kafelek.
     * Rzuca, gdy się nie udało — edytor pokazuje wtedy komunikat i zostaje otwarty.
     */
    onUploadPhotoFile: (file: File) => Promise<PhotoSlot>;
    /** Telefon dorzucił zdjęcia do galerii wizyty — trzeba odświeżyć listę zdjęć. */
    onPhotosClaimed: () => void;
}

export const DamageMapUpdateModal = ({
    visitId,
    visitNumber,
    customerEmail,
    customerPhone,
    initialPoints,
    initialVehicleType,
    pointsRecoverable,
    hasDocument,
    visitPhotos,
    isLoading,
    isSaving,
    onClose,
    onSubmit,
    onUploadPhotoFile,
    onPhotosClaimed,
}: Props) => {
    /*
     * `null` = nie wybrano jeszcze kroku ręcznie, więc obowiązuje pierwszy z listy.
     * Lista zależy od `hasDocument`, a ten przychodzi z zapytania — dlatego ciało okna
     * pokazuje wczytywanie, dopóki nie wiemy, ile kroków ma ta ścieżka. Inaczej
     * operator widziałby mapę, która po chwili przeskakuje na pytanie o dokument.
     */
    const [step, setStep] = useState<Step | null>(null);
    const [mode, setMode] = useState<DamageMapUpdateMode>('NEW_FILE');
    const [notifyCustomer, setNotifyCustomer] = useState<boolean | null>(null);
    const [messageFocused, setMessageFocused] = useState(false);
    const [isPhonePanelOpen, setIsPhonePanelOpen] = useState(false);

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

    /*
     * Koszt wiadomości liczony tak, jak liczy go operator: jeden ogonek przełącza
     * CAŁĄ treść na UCS-2 i segment kurczy się ze 160 znaków do 70. Operator widzi
     * więc nie samą regułę, tylko jej skutek dla tego, co właśnie napisał.
     */
    const messageLength = messageValue.trim().length;
    const messageSegments = smsSegments(messageLength, hasPolishCharacters(messageValue));

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

    /*
     * Punkty z telefonu ZASTĘPUJĄ listę w edytorze, nie doklejają się do niej.
     * Sesja mobilna jest zasiewana aktualnymi punktami przy wydaniu kodu, więc to,
     * co przychodzi z telefonu, jest pełną mapą po jego edycji — scalanie po
     * numerach dublowałoby punkty usunięte na telefonie.
     */
    const handlePointsFromPhone = (fromPhone: DamagePoint[], phoneVehicleType: string | null) => {
        setEditedPoints(fromPhone);
        if (phoneVehicleType) setEditedVehicleType(phoneVehicleType);
    };

    /*
     * Sesja telefonu żyje tak długo jak OKNO, nie jak zakładka z kodem QR. Panel
     * niżej jest zakładką w oknie wyboru zdjęcia — operator zamyka je i odchodzi do
     * samochodu, a to jest dokładnie moment, w którym telefon ma działać. Gdy sesja
     * siedziała w panelu, jego odmontowanie zabijało gniazdo i zdjęcia z telefonu
     * nigdy nie docierały do mapy.
     */
    const notifyAvailability = useDamageMapNotifyAvailability({
        customerEmail,
        customerPhone,
    });

    const mobileSession = useDamageMapMobileSession({
        visitId,
        points,
        vehicleType,
        onPointsFromPhone: handlePointsFromPhone,
        onPhotosClaimed,
    });

    const handleSubmit = async () => {
        try {
            await onSubmit(buildDamageMapPayload({
                damagePoints: points,
                vehicleType,
                mode,
                // Gdy kroku o klienta nie było, wysyłki nie zamawiamy — bramka i tak
                // by odmówiła, a zamówienie zostawiłoby w historii komunikacji wpis
                // o nieudanej wysyłce, której nikt nie zlecił.
                notifyCustomer: notifyAvailability.canNotify && notifyCustomer === true,
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

    /*
     * Krok z pytaniem o klienta ma sens tylko wtedy, gdy wiadomość ma czym wyjść.
     * Bez modułu komunikacji nie pójdzie ani mail, ani SMS, więc pytanie miałoby
     * jedną możliwą odpowiedź — a ekran z jedną możliwą odpowiedzią to kliknięcie
     * na pusto przed zapisem.
     */
    /*
     * Kształt ścieżki zależy od dwóch odpowiedzi z serwera (czy jest dokument, czy
     * można powiadomić klienta). Dopóki ich nie znamy, ciało okna pokazuje
     * wczytywanie — inaczej operator widziałby mapę, która po chwili przeskakuje
     * na inny krok, albo krok, który zaraz zniknie.
     */
    const bodyLoading = isLoading || notifyAvailability.isLoading;

    const stepOrder = useMemo<Step[]>(() => [
        ...(hasDocument ? (['mode'] as Step[]) : []),
        'edit' as Step,
        ...(notifyAvailability.canNotify ? (['notify'] as Step[]) : []),
    ], [hasDocument, notifyAvailability.canNotify]);
    const currentStep = step ?? stepOrder[0];
    const stepIndex = stepOrder.indexOf(currentStep);
    const isLastStep = stepIndex === stepOrder.length - 1;

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
                        {!bodyLoading && (
                            <StepDots aria-hidden="true">
                                {stepOrder.map((s, index) => (
                                    <StepDot
                                        key={s}
                                        $state={index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'todo'}
                                    />
                                ))}
                            </StepDots>
                        )}
                    </HeaderTexts>
                    <CloseBtn type="button" onClick={onClose} disabled={isSaving} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </Header>

                <Body>
                    {bodyLoading && (
                        <LoadingRow>Wczytywanie zapisanych oznaczeń...</LoadingRow>
                    )}

                    {!bodyLoading && currentStep === 'mode' && (
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
                                        Wersja z przyjęcia zostaje nietknięta: widać, co było na starcie,
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
                                            ? 'Dotychczasowy plik zostanie nadpisany. W dokumentacji zostanie jedna, aktualna mapa, a poprzedniej wersji nie da się odzyskać.'
                                            : 'Niedostępne: ta wizyta nie ma jeszcze wygenerowanej mapy uszkodzeń.'}
                                    </OptionDesc>
                                </OptionTile>
                            </OptionGrid>

                            {!pointsRecoverable && (
                                <WarnBox>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>
                                        {hasDocument
                                            ? 'Ta wizyta jest starsza niż zapis oznaczeń: z przyjęcia został tylko gotowy plik PDF, bez współrzędnych punktów. Mapę trzeba rozrysować od nowa. Otwórz dotychczasowy dokument w sekcji Dokumentacja i przenieś z niego oznaczenia.'
                                            : 'Ta wizyta nie ma jeszcze mapy uszkodzeń, rozrysujesz ją od zera.'}
                                    </span>
                                </WarnBox>
                            )}
                        </>
                    )}

                    {!bodyLoading && currentStep === 'edit' && (
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

                            {mobileSession.phoneSeen && (
                                <>
                                    <PhoneLinkBar
                                        type="button"
                                        onClick={() => setIsPhonePanelOpen(open => !open)}
                                        aria-expanded={isPhonePanelOpen}
                                    >
                                        <PhoneLinkDot>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="6" y="2" width="12" height="20" rx="2" />
                                                <line x1="10" y1="18" x2="14" y2="18" />
                                            </svg>
                                        </PhoneLinkDot>
                                        <PhoneLinkTexts>
                                            <PhoneLinkTitle>Połączono z telefonem</PhoneLinkTitle>
                                            <PhoneLinkHint>
                                                Oznaczenia i zdjęcia z telefonu pojawiają się tu na bieżąco.
                                            </PhoneLinkHint>
                                        </PhoneLinkTexts>
                                        <PhoneLinkChevron
                                            $open={isPhonePanelOpen}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </PhoneLinkChevron>
                                    </PhoneLinkBar>

                                    {isPhonePanelOpen && (
                                        <PhonePanelWrap>
                                            <DamageMapQrPanel
                                                session={mobileSession}
                                                onConnected={() => { /* już połączony — nie ma czego zamykać */ }}
                                            />
                                        </PhonePanelWrap>
                                    )}
                                </>
                            )}

                            {!notifyAvailability.canNotify && notifyAvailability.blockedReason && (
                                <NoNotifyNote>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    <span>
                                        Klient nie zostanie powiadomiony o zmianie:
                                        {' '}{notifyAvailability.blockedReason}. Mapa zapisze się normalnie.
                                    </span>
                                </NoNotifyNote>
                            )}

                            <VehicleDamageMapper
                                points={points}
                                onChange={setEditedPoints}
                                availablePhotos={availablePhotos}
                                vehicleType={vehicleType}
                                onVehicleTypeChange={setEditedVehicleType}
                                onUploadPhotoFile={onUploadPhotoFile}
                                renderQrPanel={close => (
                                    <DamageMapQrPanel session={mobileSession} onConnected={close} />
                                )}
                            />
                        </>
                    )}

                    {!bodyLoading && currentStep === 'notify' && (
                        <>
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
                                        Jeśli nie ma adresu, wyślemy SMS z informacją, że mapa się zmieniła.
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
                                        Nie używaj polskich znaków, żeby zaoszczędzić kredyty SMS.
                                        {' '}Twój rozmiar wiadomości: {messageLength} {pluralPl(messageLength, 'znak', 'znaki', 'znaków')}
                                        {' '}({messageSegments} {smsWord(messageSegments)})
                                    </Hint>
                                </>
                            )}
                        </>
                    )}
                </Body>

                <Footer>
                    <FooterLeft>
                        {stepIndex > 0 && (
                            <GhostBtn
                                type="button"
                                onClick={() => setStep(stepOrder[stepIndex - 1])}
                                disabled={isSaving}
                            >
                                Wróć
                            </GhostBtn>
                        )}
                        <GhostBtn type="button" onClick={onClose} disabled={isSaving}>
                            Anuluj
                        </GhostBtn>
                    </FooterLeft>

                    {isLastStep ? (
                        <PrimaryBtn
                            type="button"
                            onClick={handleSubmit}
                            disabled={
                                isSaving
                                || !diff.hasChanges
                                || (notifyAvailability.canNotify && notifyCustomer === null)
                            }
                            title={
                                !diff.hasChanges ? 'Nic się nie zmieniło, nie ma czego zapisywać'
                                : notifyAvailability.canNotify && notifyCustomer === null
                                    ? 'Wybierz, czy poinformować klienta'
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
                            onClick={() => setStep(stepOrder[stepIndex + 1])}
                            disabled={bodyLoading || isSaving || (currentStep === 'edit' && !diff.hasChanges)}
                            title={currentStep === 'edit' && !diff.hasChanges ? 'Dodaj lub popraw oznaczenie, żeby przejść dalej' : undefined}
                        >
                            {currentStep === 'mode' ? 'Przejdź do mapy' : 'Podsumowanie'}
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
