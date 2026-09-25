// src/modules/visits/views/VisitDetailView.tsx
//
// Karta wizyty. Jedna kolejność czytania: co to za auto i na kiedy (nagłówek),
// co robimy i za ile (usługi), dowody i rozmowa (zdjęcia, komunikacja, historia),
// a z prawej kontekst - klient, przyjęcie, notatka, komentarze.
//
// Trzy nośniki hierarchii (CLAUDE.md §2):
//   wypełnienie - JEDNO w oknie: zielona akcja kroku następnego w nagłówku,
//   wyniesienie - JEDNO w kolumnie: karta „Usługi"; reszta to płaskie panele,
//   odcień      - znaczenie: plakietki stanu, bursztyn dla „przeczytaj".
// Przed przebudową okno miało cztery stale wypełnione przyciski, dziesięć
// jednakowo wyniesionych kart i sześć stylów nagłówków sekcji.
//
// Klocki (Button, Panel, SectionTitle, StatusPill…) są wspólne ze zleceniami
// zbiorczymi - common/components/ui.
//
// Telefon: jedna kolumna i przypięte skróty do sekcji pod nagłówkiem. Dawny pasek
// zakładek przy dolnej krawędzi dublował globalną nawigację aplikacji i chował
// połowę karty za przełączaniem.

import { useRef, useState, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Award, CarFront, ChevronDown, MessageSquare, Pencil, Plus, Truck } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import {
    Button, ButtonLabel, Panel, PanelActions, PanelBody, PanelHead, SectionTitle, StatusPill, ui,
} from '@/common/components/ui';
import { useMediaQuery } from '@/common/hooks';
import { useVisitDetail, useVisitDocuments, useVisitPhotos, visitDetailQueryKey, visitPhotosQueryKey } from '../hooks';
import { useVisitDamageMap, useUpdateVisitDamageMap } from '../hooks';
import { ConsumerInvoiceModal } from '../components/ConsumerInvoiceModal';
import { RevenueInvoiceDetailModal } from '@/modules/finance/components/RevenueInvoiceDetailModal';
import { useUpdateVisit, useUpdateVisitTitle, useUpdateEstimatedCompletionDate, useUpdateArrivalState } from '../hooks';
import { useUploadDocument, useUploadPhoto, useDeleteDocument, useDeletePhoto } from '../hooks';
import { useVisitComments, useVisitCommunication } from '../hooks';
import { VisitHeader } from '../components/VisitHeader';
import { VehicleInfoCard, CustomerInfoCard } from '../components/InfoCards';
import { TechnicalNotesCard } from '../components/TechnicalNotesCard';
import { ServicesTable } from '../components/ServicesTable';
import { DocumentGallery } from '../components/DocumentGallery';
import { VisitComments } from '../components/VisitComments';
import { VisitCommunicationHistory } from '../components/VisitCommunicationHistory';
import { SectionChips } from '../components/SectionChips';
import { HandoverSheet, MarkReadyDialog } from '../components/handover';
import { QualityCertificateModal } from '../components/QualityCertificateModal';
import { SmsReminderModal } from '../components/SmsReminderModal';
import { useSmsReminder, type SmsReminderResponse } from '../hooks/useSmsReminder';
import { useDeleteVisit } from '../hooks/useDeleteVisit';
import { GeneratePostModal } from '@/modules/competition-monitoring/components/GeneratePostModal';
import type { GeneratePostPrefill } from '@/modules/competition-monitoring/components/GeneratePostModal';
import type { DocumentType } from '../types';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import { DeleteOperationModal } from '@/modules/operations/components/DeleteOperationModal';
import { DoorToDoorModal } from '../components/DoorToDoorModal';
import { DamageMapUpdateModal } from '../components/DamageMapUpdateModal';
import { EntityActivityTimeline } from '@/modules/activity';
import { VisitProductsSection, useVisitProducts } from '@/modules/products';
import { useFeature } from '@/modules/subscription/hooks/useFeature';
import { formatDateTime } from '@/common/utils';

// ─── Układ ────────────────────────────────────────────────────────────────────

// Opacity-only: animacja z transformem na przodku psuje modale z position: fixed
// (przodek staje się dla nich blokiem zawierającym).
const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

/* Jednolite tło: sześciokąty przebijały spod kart i brudziły powierzchnie,
   które mają czytać się jako płaskie panele. */
const ViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    max-width: 100%;
    /* clip, nie hidden: widok nigdy nie rozepchnie strony, a sticky dalej działa. */
    overflow-x: clip;
    background: ${ui.bg};
    animation: ${fadeIn} 0.3s ease both;
`;

const ContentArea = styled(PageContainer)`
    flex: 1;
    min-width: 0;
    padding-block-end: 40px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding-block-end: 48px;
    }
`;

/**
 * Dwie kolumny od 960px szerokości TREŚCI (zapytanie kontenerowe), nie okna: obok
 * rozwiniętego menu aplikacji okno 1200px daje treści ~900px, a szyna 344px
 * ścisnęłaby wtedy wykaz usług do połowy.
 *
 * W jednej kolumnie kolumny rozpadają się (`display: contents`), a sekcje ustawia
 * `order`: usługi, zdjęcia, klient, komentarze - kolejność z makiety telefonu.
 */
const Layout = styled.div`
    container: visit-layout / inline-size;
    min-width: 0;
`;

const MainColumn = styled.div`
    display: contents;
`;

const Rail = styled.aside`
    display: contents;
`;

const Slot = styled.div<{ $order: number }>`
    order: ${p => p.$order};
    min-width: 0;
    /* Przewinięcie ze skrótu zostawia oddech nad sekcją i pod przypiętym paskiem. */
    scroll-margin-top: 64px;
`;

/* Zapytanie kontenerowe dotyczy PRZODKA - szerokość mierzy Layout, a siatkę
   ustawia jego wnętrze. */
const Columns = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;

    @container visit-layout (min-width: 960px) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 344px;
        gap: 20px;
        align-items: start;

        ${MainColumn}, ${Rail} {
            display: flex;
            flex-direction: column;
            gap: 14px;
            min-width: 0;
        }
    }
`;

const D2dStrip = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 14px;
    padding: 11px 16px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.brandTint};
    border: 1px solid ${ui.brandLineSoft};
    font-size: 13px;
    color: ${ui.brandDeep};
    overflow-wrap: anywhere;

    > svg { width: 16px; height: 16px; flex-shrink: 0; }
    strong { font-weight: 700; }
`;

const D2dChange = styled(Button)`
    margin-left: auto;
    color: ${ui.brandDeep};
`;

const HistoryToggle = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 14px 18px;
    border: none;
    border-radius: ${ui.radiusPanel};
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    > svg { width: 16px; height: 16px; color: ${ui.textMuted}; transition: transform 200ms ease; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
    @media (max-width: 640px) { padding: 14px 16px; }
`;

const RailPanel = styled(Panel)`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 16px 18px;
`;

const RailHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
`;

const ReminderWhen = styled.span`
    font-size: 13px;
    color: ${ui.textSecondary};
    font-variant-numeric: tabular-nums;
`;

const ReminderText = styled.p`
    margin: 0;
    max-width: 100%;
    font-size: 12.5px;
    color: ${ui.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const AfterCare = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AfterCareNote = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${ui.textMuted};
    text-align: center;
`;

// ─── Wczytywanie i błędy ──────────────────────────────────────────────────────

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 16px;
`;

const Spinner = styled.div`
    width: 38px;
    height: 38px;
    border: 3px solid ${ui.line};
    border-top-color: ${ui.brand};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const LoadingText = styled.p`
    margin: 0;
    color: ${ui.textMuted};
    font-size: 14px;
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 32px;
    text-align: center;
`;

const ErrorTitle = styled.h2`
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: ${ui.dangerInk};
`;

const ErrorMessage = styled.p`
    max-width: 560px;
    margin: 0 0 20px;
    color: ${ui.textSecondary};
    font-size: 14px;
    line-height: 1.55;
`;

/** Nierozpoczęta wizyta to stan procesu, nie awaria - stąd inny kolor niż przy błędzie. */
const NotStartedTitle = styled.h2`
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: ${ui.ink};
`;

/** 1 zdjęcie, 2 zdjęcia, 5 zdjęć, 22 zdjęcia. */
function photosWord(n: number): string {
    if (n === 1) return '1 zdjęcie';
    const units = n % 10;
    const tens = n % 100;
    return `${n} ${units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? 'zdjęcia' : 'zdjęć'}`;
}

// ─── Widok ────────────────────────────────────────────────────────────────────

export const VisitDetailView = () => {
    const { visitId } = useParams<{ visitId: string }>();
    const navigate = useNavigate();

    const [isTransitionWizardOpen, setIsTransitionWizardOpen] = useState(false);
    const [isDoorToDoorOpen, setIsDoorToDoorOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transitionType, setTransitionType] = useState<'in_progress_to_ready' | 'ready_to_completed' | null>(null);
    const [isGeneratePostOpen, setIsGeneratePostOpen] = useState(false);
    // Rozliczenie wizyty zakończonej: wystawienie brakującej faktury albo
    // podgląd już wystawionej.
    const [isConsumerInvoiceOpen, setIsConsumerInvoiceOpen] = useState(false);
    const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
    const [isSmsReminderOpen, setIsSmsReminderOpen] = useState(false);
    const [isCertificateOpen, setIsCertificateOpen] = useState(false);
    const [smsReminderForEdit, setSmsReminderForEdit] = useState<SmsReminderResponse | null>(null);
    const [highlightPendingServices, setHighlightPendingServices] = useState(false);
    const [isDamageMapOpen, setIsDamageMapOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    // Telefon: jedna kolumna, skróty do sekcji zamiast zakładek, klient razem z przyjęciem.
    const isPhone = useMediaQuery('(max-width: 767px)');
    const docFileInputRef = useRef<HTMLInputElement>(null);

    // Zapytania (GET-y) pytają o wizytę tylko dopóki ona istnieje; mutacje niżej
    // dostają nadal `visitId`, bo działają na konkretnym rekordzie sprzed usunięcia.
    const { deleteVisit, isDeleting, isDeleted, activeVisitId } = useDeleteVisit(visitId!);

    const { visitDetail, isLoading, isError, notStarted, refetch } = useVisitDetail(activeVisitId);
    const { documents } = useVisitDocuments(activeVisitId);
    const { photos: visitPhotos, isLoading: isLoadingPhotos } = useVisitPhotos(activeVisitId);
    const { updateVisit } = useUpdateVisit(visitId!);
    const { updateArrivalState } = useUpdateArrivalState(visitId!);
    const { updateTitle } = useUpdateVisitTitle(visitId!);
    const { updateEstimatedCompletionDate } = useUpdateEstimatedCompletionDate(visitId!);
    const { uploadDocument, isUploading } = useUploadDocument(visitId!);
    const { uploadPhoto, isUploading: isUploadingPhoto } = useUploadPhoto(visitId!);
    const { deleteDocument } = useDeleteDocument(visitId!);
    const { deletePhoto } = useDeletePhoto(visitId!);
    const { comments, isLoading: isLoadingComments } = useVisitComments(activeVisitId);
    const { entries: communicationEntries, isLoading: isLoadingCommunication } = useVisitCommunication(activeVisitId);
    // Punkty uszkodzeń pytamy dopiero przy otwartym oknie: przy każdym wejściu w
    // kartę wizyty byłoby to zapytanie, którego nikt nie czyta.
    const { damageMap, isLoading: isLoadingDamageMap } = useVisitDamageMap(activeVisitId, isDamageMapOpen);
    const { updateDamageMap, isUpdating: isUpdatingDamageMap } = useUpdateVisitDamageMap(visitId!);
    const { showWarning, showSuccess, showError } = useToast();
    const { pendingReminder } = useSmsReminder(activeVisitId);

    const { can } = usePermissions();
    // Sekcja produktów pojawia się tylko, gdy studio ma wykupiony moduł — inaczej
    // API zwróciłoby 402 i sekcja pokazywałaby błąd zamiast treści.
    const productsFeatureEnabled = useFeature('PRODUCTS').enabled;
    // Liczba dopiętych produktów zasila licznik w nagłówku sekcji — ten sam klucz
    // zapytania co w VisitProductsSection, więc to odczyt z cache, nie drugi request.
    const { links: visitProductLinks } = useVisitProducts(
        productsFeatureEnabled && can('PRODUCTS_VIEW') ? visitId : undefined
    );

    const queryClient = useQueryClient();

    // Między usunięciem a przejściem na listę widok nie ma czego pokazać: dane wizyty
    // już nie przyjdą, a zwykła ścieżka renderu wyświetliłaby w tym miejscu „nie
    // znaleziono wizyty" - komunikat o błędzie po operacji, która się udała.
    if (isDeleted) {
        return (
            <ViewContainer>
                <ContentArea>
                    <LoadingContainer>
                        <Spinner />
                        <LoadingText>Usuwanie wizyty...</LoadingText>
                    </LoadingContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isLoading) {
        return (
            <ViewContainer>
                <ContentArea>
                    <LoadingContainer>
                        <Spinner />
                        <LoadingText>Ładowanie szczegółów wizyty...</LoadingText>
                    </LoadingContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    /*
     * Wizyta w statusie DRAFT nie jest wizytą, tylko przyjęciem pojazdu, którego nikt
     * nie dokończył - API odpowiada na nią 404. Wejście tu bierze się z zapamiętanego
     * adresu albo ze starego linku; „Błąd ładowania" byłby w tym miejscu kłamstwem,
     * a użytkownik i tak nie wiedziałby, co dalej. Mówimy więc, co się stało, i
     * odsyłamy tam, gdzie da się to domknąć.
     */
    if (notStarted) {
        return (
            <ViewContainer>
                <ContentArea>
                    <ErrorContainer>
                        <NotStartedTitle>Wizyta nie została rozpoczęta</NotStartedTitle>
                        <ErrorMessage>
                            Przyjęcie tego pojazdu zostało zapisane, ale nie zostało dokończone -
                            brakuje podpisów i zatwierdzenia, więc wizyta jeszcze nie ruszyła.
                            Znajdziesz ją w sekcji „Nieukończone przyjęcia".
                        </ErrorMessage>
                        <Button variant="primary" onClick={() => navigate('/operations')}>
                            Przejdź do nieukończonych przyjęć
                        </Button>
                    </ErrorContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isError || !visitDetail) {
        return (
            <ViewContainer>
                <ContentArea>
                    <ErrorContainer>
                        <ErrorTitle>Błąd ładowania</ErrorTitle>
                        <ErrorMessage>
                            Nie udało się załadować szczegółów wizyty. Spróbuj ponownie.
                        </ErrorMessage>
                        <Button variant="primary" onClick={() => refetch()}>
                            Spróbuj ponownie
                        </Button>
                    </ErrorContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    const { visit } = visitDetail;

    const handleCompleteVisit = () => {
        if (visit.status === 'IN_PROGRESS') {
            const pendingCount = visit.services.filter(s => s.status === 'PENDING').length;
            if (pendingCount > 0) {
                showWarning(
                    'Nie można oznaczyć wizyty jako gotowej',
                    `${pendingCount === 1 ? 'Jedna usługa wymaga' : `${pendingCount} usługi wymagają`} potwierdzenia przed zakończeniem.`
                );
                setHighlightPendingServices(true);
                setTimeout(() => setHighlightPendingServices(false), 4000);
                return;
            }
            setTransitionType('in_progress_to_ready');
            setIsTransitionWizardOpen(true);
        } else if (visit.status === 'READY_FOR_PICKUP') {
            setTransitionType('ready_to_completed');
            setIsTransitionWizardOpen(true);
        } else if (window.confirm('Czy na pewno chcesz zakończyć tę wizytę?')) {
            updateVisit({ status: 'COMPLETED' });
        }
    };

    const closeTransition = () => {
        setIsTransitionWizardOpen(false);
        setTransitionType(null);
    };

    const buildGeneratePostPrefill = (): GeneratePostPrefill => {
        const { vehicle, services, status } = visit;
        const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
        const serviceNames = services
            .filter(s => s.status !== 'REJECTED')
            .map(s => s.serviceName);

        const topic = [vehicleLabel, serviceNames.length > 0 ? serviceNames.join(', ') : '']
            .filter(Boolean)
            .join(': ');

        const statusLabel =
            status === 'COMPLETED'        ? 'Realizacja zakończona.'       :
            status === 'READY_FOR_PICKUP' ? 'Pojazd gotowy do odbioru.'    :
            status === 'IN_PROGRESS'      ? 'Realizacja w toku.'           : '';

        /*
         * Rozpoznana kategoria usługi trafia do KONTEKSTU, a nie do osobnego pola.
         * Wcześniej wracała jako `serviceType`, którego okno generatora nigdy nie
         * czytało - heurystyka liczyła się przy każdym otwarciu i lądowała w koszu
         * (obiekt z nadmiarowym polem to po stronie JS zwykłe pominięcie, więc nikt
         * tego nie zauważył poza kompilatorem typów).
         */
        const namesLower = serviceNames.map(n => n.toLowerCase()).join(' ');
        const serviceCategory =
            /\bppf\b|paint protection/.test(namesLower)       ? 'folia ochronna PPF'      :
            /ceramik|ceramic/.test(namesLower)                ? 'powłoka ceramiczna'      :
            /tapicerk|wnętrze|interior|skór/.test(namesLower) ? 'renowacja wnętrza'       :
            /oklej|wrap|foli(?!a ppf)/.test(namesLower)       ? 'oklejanie folią'         :
            /poler|polish|korekta/.test(namesLower)           ? 'korekta i polerowanie'   :
            /detailing/.test(namesLower)                      ? 'detailing'               :
            null;

        const context = [
            statusLabel,
            serviceNames.length > 0 ? `Usługi: ${serviceNames.join(', ')}.` : '',
            serviceCategory ? `Kategoria: ${serviceCategory}.` : '',
        ].filter(Boolean).join(' ');

        return { topic, context };
    };

    const handleCancelVisit = () => setIsDeleteModalOpen(true);
    const handleConfirmDelete = () => deleteVisit();

    const handleMileageChange = (mileage: number) => { updateArrivalState({ mileageAtArrival: mileage }); };
    const handleKeysToggle = (checked: boolean) => { updateArrivalState({ keysHandedOver: checked }); };
    const handleDocumentsToggle = (checked: boolean) => { updateArrivalState({ documentsHandedOver: checked }); };

    const handleUploadDocument = (file: File, type: DocumentType, category: string) => {
        uploadDocument({ visitId: visitId!, customerId: visit.customer.id, file, type, category });
    };

    const handleUploadPhoto = (file: File, description?: string) => {
        uploadPhoto({ visitId: visitId!, file, description });
    };

    /**
     * „Z pliku" w oknie uszkodzeń: zdjęcie ma być zdjęciem WIZYTY, nie bytem
     * lokalnym okna — inaczej przepadłoby przy pierwszym odświeżeniu, a mapa
     * zostałaby ze wskaźnikiem na nic.
     *
     * Kafelek wraca z lokalnym `previewUrl`, bo `uploadPhoto` nie zwraca
     * presignowanej miniatury, a pisak do zaznaczania otwiera się natychmiast po
     * przypięciu (ten sam wzorzec ma kreator przyjęcia). Presignowany adres
     * dociągnie unieważnione niżej zapytanie o zdjęcia wizyty.
     */
    const handleUploadDamagePhoto = async (file: File) => {
        const uploaded = await visitApi.uploadPhoto({ visitId: visitId!, file });
        queryClient.invalidateQueries({ queryKey: visitPhotosQueryKey(visitId!) });
        return {
            id: uploaded.photoId,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            previewUrl: URL.createObjectURL(file),
        };
    };

    const handleDeleteDocument = (documentId: string) => { deleteDocument(documentId); };
    const handleDeletePhoto = (photoId: string) => { deletePhoto(photoId); };

    /*
     * Liczniki w nagłówku muszą zgadzać się z tym, co pokazuje galeria (patrz
     * `documentPhotos` / `pdfs` w DocumentGallery), a ta dzieli pliki po
     * ROZSZERZENIU, nie po typie dokumentu. Mapa uszkodzeń jest PDF-em od dawna
     * (`S3DamageMapStorageService` zapisuje `damage-map.pdf`), więc licząc ją do
     * zdjęć nagłówek obiecywał zdjęcie, którego w kafelkach nie było — a przy
     * każdej aktualizacji mapy rozjazd rósł o jeden.
     */
    const isPdfDocument = (doc: { type: DocumentType; fileName: string }) =>
        doc.fileName.toLowerCase().endsWith('.pdf') || !['PHOTO', 'DAMAGE_MAP'].includes(doc.type);

    const photoCount = visitPhotos.length + documents.filter(d => !isPdfDocument(d)).length;
    const pdfCount = documents.filter(isPdfDocument).length;
    const docsSummary = [
        photoCount > 0 ? photosWord(photoCount) : null,
        pdfCount > 0 ? `${pdfCount} PDF` : null,
    ].filter(Boolean).join(', ');

    const handleDocFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
        if (isImage) {
            handleUploadPhoto(file);
        } else {
            handleUploadDocument(file, 'PDF', 'inne');
        }
        if (docFileInputRef.current) docFileInputRef.current.value = '';
    };


    const canSeeCustomer = can('CUSTOMERS_VIEW');
    const canSeeProducts = productsFeatureEnabled && can('PRODUCTS_VIEW');
    const canSeeCommunication = can('COMMUNICATION_SEND');
    const canSeeHistory = can('VISITS_CREATE');
    const visibleCommentCount = comments.filter(c => !c.isDeleted).length;
    const failedMessages = communicationEntries.filter(e => e.status === 'FAILED').length;

    /* Door to Door: `enabled === false` to świadoma rezygnacja klienta - adresy
       zostają zapisane, ale wizyta nie jest już Door to Door. */
    const d2d = visit.doorToDoor && visit.doorToDoor.enabled !== false ? visit.doorToDoor : null;
    const d2dPickup = d2d ? [d2d.pickupAddress?.street, d2d.pickupAddress?.city].filter(Boolean).join(', ') : '';
    const d2dDelivery = d2d ? [d2d.deliveryAddress?.street, d2d.deliveryAddress?.city].filter(Boolean).join(', ') : '';

    const vehicleCard = can('CUSTOMERS_VIEW') && (
        <VehicleInfoCard
            vehicle={visit.vehicle}
            mileageAtArrival={visit.mileageAtArrival}
            keysHandedOver={visit.keysHandedOver}
            documentsHandedOver={visit.documentsHandedOver}
            vehicleHandoff={visit.vehicleHandoff}
            onMileageChange={handleMileageChange}
            canEdit={can('VISITS_CREATE')}
            onKeysToggle={handleKeysToggle}
            onDocumentsToggle={handleDocumentsToggle}
            onViewDetails={() => navigate(`/vehicles/${visit.vehicle.id}`)}
            acceptedByName={visit.acceptedByName}
            acceptedAt={visit.createdAt}
            embedded={isPhone}
        />
    );

    const chips = [
        { id: 'visit-services', label: 'Usługi' },
        { id: 'visit-docs', label: 'Zdjęcia', count: photoCount + pdfCount },
        ...(canSeeCustomer ? [{ id: 'visit-customer', label: 'Klient' }] : []),
        { id: 'visit-comments', label: 'Komentarze', count: visibleCommentCount },
        ...(canSeeCommunication ? [{ id: 'visit-communication', label: 'Wiadomości', count: communicationEntries.length }] : []),
        ...(canSeeHistory ? [{ id: 'visit-history', label: 'Historia' }] : []),
    ];

    return (
    <>
        <ViewContainer>
            <ContentArea>
                <VisitHeader
                    visit={visit}
                    onCompleteVisit={handleCompleteVisit}
                    onIssueConsumerInvoice={() => setIsConsumerInvoiceOpen(true)}
                    onPreviewInvoice={() => setPreviewInvoiceId(visit.settlement?.revenueInvoiceId ?? null)}
                    onCancelVisit={handleCancelVisit}
                    onGeneratePost={() => setIsGeneratePostOpen(true)}
                    onDoorToDoor={() => setIsDoorToDoorOpen(true)}
                    onTitleUpdate={updateTitle}
                    onEstimatedCompletionDateUpdate={updateEstimatedCompletionDate}
                />

                {isPhone && (
                    <SectionChips
                        items={chips}
                        onOpen={id => { if (id === 'visit-history') setIsAuditOpen(true); }}
                    />
                )}

                <Layout>
                <Columns>
                    <MainColumn>
                        {/* Door to Door jako płaski pasek informacji: każdy fakt osobno,
                            nie jeden ciąg sklejony kropkami (CLAUDE.md §4). */}
                        {d2d && (d2dPickup || d2dDelivery) && (
                            <D2dStrip style={{ order: 0 }}>
                                <Truck aria-hidden="true" />
                                <strong>Door to door</strong>
                                {d2dPickup && <span>Odbiór{d2d.scheduledAt ? ` ${formatDateTime(d2d.scheduledAt)}` : ''}, {d2dPickup}</span>}
                                {d2dDelivery && (
                                    <span>{d2dDelivery === d2dPickup ? 'Dostawa pod ten sam adres' : `Dostawa: ${d2dDelivery}`}</span>
                                )}
                                {d2d.driverName && <span>Kierowca {d2d.driverName}</span>}
                                {can('VISITS_CREATE') && (
                                    <D2dChange variant="ghost" size="sm" onClick={() => setIsDoorToDoorOpen(true)}>Zmień</D2dChange>
                                )}
                            </D2dStrip>
                        )}

                        <Slot id="visit-services" $order={1}>
                            <ServicesTable
                                services={visit.services}
                                visitStatus={visit.status}
                                visitId={visitId!}
                                highlightPending={highlightPendingServices}
                                settlement={visit.settlement}
                            />
                        </Slot>

                        {canSeeProducts && (
                            <Slot $order={2}>
                                <Panel aria-labelledby="visit-products-title">
                                    <PanelHead>
                                        <SectionTitle id="visit-products-title" count={visitProductLinks.length || undefined}>
                                            Użyte produkty
                                        </SectionTitle>
                                    </PanelHead>
                                    <PanelBody>
                                        <VisitProductsSection
                                            visitId={visitId!}
                                            canUsage={can('PRODUCTS_USAGE')}
                                            canManageProducts={can('PRODUCTS_MANAGE')}
                                            canSeeCosts={can('PRODUCTS_COSTS')}
                                        />
                                    </PanelBody>
                                </Panel>
                            </Slot>
                        )}

                        <Slot id="visit-docs" $order={3}>
                            <Panel aria-labelledby="visit-docs-title">
                                <PanelHead>
                                    <SectionTitle id="visit-docs-title" count={docsSummary || undefined}>
                                        Zdjęcia i dokumenty
                                    </SectionTitle>
                                    <PanelActions>
                                        {/* Mapa uszkodzeń jest edytowalna, dopóki pojazd jest w studiu.
                                            Po wydaniu (COMPLETED) i po odrzuceniu wizyty backend odmawia
                                            zapisu, więc przycisk też nie może obiecywać, że się uda. */}
                                        {can('VISITS_CREATE') && visit.status !== 'COMPLETED'
                                            && visit.status !== 'REJECTED' && visit.status !== 'ARCHIVED' && !isPhone && (
                                            <Button
                                                size="sm"
                                                onClick={() => setIsDamageMapOpen(true)}
                                                title="Dopisz uszkodzenia, które pojawiły się w trakcie wizyty"
                                            >
                                                <CarFront />Mapa uszkodzeń
                                            </Button>
                                        )}
                                        <ButtonLabel
                                            $variant="tinted"
                                            $size="sm"
                                            aria-disabled={isUploading || isUploadingPhoto}
                                        >
                                            <Plus />
                                            {isUploading || isUploadingPhoto ? 'Wysyłanie...' : isPhone ? 'Dodaj' : 'Dodaj plik'}
                                            <input
                                                ref={docFileInputRef}
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleDocFileSelect}
                                                disabled={isUploading || isUploadingPhoto}
                                            />
                                        </ButtonLabel>
                                    </PanelActions>
                                </PanelHead>
                                <DocumentGallery
                                    documents={documents}
                                    visitPhotos={visitPhotos}
                                    isLoadingPhotos={isLoadingPhotos}
                                    onDelete={handleDeleteDocument}
                                    onDeletePhoto={handleDeletePhoto}
                                />
                                {isPhone && can('VISITS_CREATE') && visit.status !== 'COMPLETED'
                                    && visit.status !== 'REJECTED' && visit.status !== 'ARCHIVED' && (
                                    <PanelBody>
                                        <Button block onClick={() => setIsDamageMapOpen(true)}><CarFront />Mapa uszkodzeń</Button>
                                    </PanelBody>
                                )}
                            </Panel>
                        </Slot>

                        {canSeeCommunication && (
                            <Slot id="visit-communication" $order={8}>
                                <Panel aria-labelledby="visit-communication-title">
                                    <PanelHead>
                                        <SectionTitle id="visit-communication-title" count={communicationEntries.length || undefined}>
                                            Komunikacja z klientem
                                        </SectionTitle>
                                        {failedMessages > 0 && (
                                            <StatusPill $tone="danger">
                                                {failedMessages === 1 ? 'Jedna wiadomość nie wyszła' : `${failedMessages} wiadomości nie wyszły`}
                                            </StatusPill>
                                        )}
                                    </PanelHead>
                                    <VisitCommunicationHistory entries={communicationEntries} isLoading={isLoadingCommunication} />
                                </Panel>
                            </Slot>
                        )}

                        {canSeeHistory && (
                            <Slot id="visit-history" $order={9}>
                                <Panel>
                                    <HistoryToggle
                                        type="button"
                                        onClick={() => setIsAuditOpen(v => !v)}
                                        aria-expanded={isAuditOpen}
                                        aria-controls="visit-history-body"
                                    >
                                        <SectionTitle as="span">Historia zmian</SectionTitle>
                                        <ChevronDown aria-hidden="true" style={{ transform: isAuditOpen ? 'rotate(180deg)' : undefined }} />
                                    </HistoryToggle>
                                    {isAuditOpen && (
                                        <PanelBody id="visit-history-body">
                                            <EntityActivityTimeline scope={{ visitId: visitId! }} />
                                        </PanelBody>
                                    )}
                                </Panel>
                            </Slot>
                        )}
                    </MainColumn>

                    <Rail>
                        {pendingReminder && (
                            <Slot $order={4}>
                                <RailPanel aria-labelledby="visit-reminder-title">
                                    <RailHead>
                                        <SectionTitle id="visit-reminder-title">SMS przypominający</SectionTitle>
                                        <StatusPill $tone="info">Zaplanowany</StatusPill>
                                    </RailHead>
                                    <ReminderWhen>
                                        {new Date(pendingReminder.scheduledFor).toLocaleString('pl-PL', {
                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                        })}
                                    </ReminderWhen>
                                    <ReminderText>{pendingReminder.messageContent}</ReminderText>
                                    <Button size="sm" onClick={() => { setSmsReminderForEdit(pendingReminder); setIsSmsReminderOpen(true); }}>
                                        <Pencil />Edytuj
                                    </Button>
                                </RailPanel>
                            </Slot>
                        )}

                        {/* Po wydaniu pojazdu: certyfikat i przypomnienie. Obrysowane - to akcje
                            dostępne, nie krok następny (CLAUDE.md §2). */}
                        {visit.status === 'COMPLETED' && (
                            <Slot $order={4}>
                                <AfterCare>
                                    <Button block onClick={() => setIsCertificateOpen(true)}><Award />Certyfikat jakości</Button>
                                    {!pendingReminder && (
                                        <>
                                            {/* Przycisk zawsze coś otwiera - brak numeru wyjaśnia i naprawia okno. */}
                                            <Button block onClick={() => { setSmsReminderForEdit(null); setIsSmsReminderOpen(true); }}>
                                                <MessageSquare />Zaplanuj SMS przypominający
                                            </Button>
                                            {!visit.customer.phone?.trim() && (
                                                <AfterCareNote>Klient nie ma numeru telefonu, uzupełnij go w karcie klienta.</AfterCareNote>
                                            )}
                                        </>
                                    )}
                                </AfterCare>
                            </Slot>
                        )}

                        {canSeeCustomer && (
                            <Slot $order={4}>
                                <CustomerInfoCard
                                    id="visit-customer"
                                    customer={visit.customer}
                                    visitId={visit.id}
                                    onViewDetails={() => navigate(`/customers/${visit.customer.id}`)}
                                    compact={isPhone}
                                >
                                    {isPhone && vehicleCard}
                                </CustomerInfoCard>
                            </Slot>
                        )}
                        {!isPhone && vehicleCard && <Slot $order={5}>{vehicleCard}</Slot>}
                        {canSeeCustomer && (
                            <Slot $order={6}>
                                <TechnicalNotesCard
                                    notes={visit.technicalNotes ?? null}
                                    visitId={visit.id}
                                    canEdit={can('VISITS_CREATE')}
                                />
                            </Slot>
                        )}
                        <Slot $order={7}>
                            <VisitComments
                                id="visit-comments"
                                visitId={visitId!}
                                comments={comments}
                                isLoading={isLoadingComments}
                            />
                        </Slot>
                    </Rail>
                </Columns>
                </Layout>
            </ContentArea>

            {transitionType === 'in_progress_to_ready' && (
                <MarkReadyDialog
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={closeTransition}
                    onSuccess={closeTransition}
                />
            )}

            {isCertificateOpen && (
                <QualityCertificateModal visit={visit} onClose={() => setIsCertificateOpen(false)} />
            )}

            {transitionType === 'ready_to_completed' && (
                <HandoverSheet
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={closeTransition}
                />
            )}

            {/* Montowany warunkowo: inaczej stan formularza zamraża się przy
                pierwszym renderze widoku i nie widzi danych wizyty, gdy te
                doładują się później. */}
            {can('VISITS_CREATE') && isDoorToDoorOpen && <DoorToDoorModal
                isOpen
                initialData={visit.doorToDoor}
                customerAddress={{
                    city: visit.customer.companyAddress?.city,
                    street: visit.customer.companyAddress?.street,
                }}
                onClose={() => setIsDoorToDoorOpen(false)}
                onConfirm={async (data) => {
                    /* Wcześniej: .then() bez .catch(). Gdy zapis padał (brak
                       sieci, 4xx), użytkownik i tak widział ekran wyglądający
                       na potwierdzenie - wizyta zostawała bez adresu, a nikt
                       o tym nie wiedział. */
                    try {
                        await visitApi.updateDoorToDoor(visit.id, {
                            enabled: data.enabled,
                            pickupAddress: data.pickupAddress,
                            deliveryAddress: data.deliveryAddress,
                            notes: data.notes || undefined,
                            driverId: data.driverId ?? null,
                            scheduledAt: data.scheduledAt ?? null,
                        });
                        /* Karta wizyty czyta Door to Door z zapytania o WIZYTĘ -
                           bez tego unieważnienia zmiana była widoczna dopiero po
                           odświeżeniu strony. */
                        queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visit.id) });
                        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
                        showSuccess(data.enabled
                            ? 'Door to Door zapisany'
                            : 'Door to Door wyłączony dla tej wizyty');
                    } catch {
                        showError('Nie udało się zapisać Door to Door');
                        throw new Error('door-to-door save failed');
                    }
                }}
            />}

            {/* Montowany warunkowo: okno pyta o punkty uszkodzeń dopiero przy
                otwarciu, a jego stan (wybrany tryb, dorysowane punkty) ma zaczynać
                od zera przy każdym wejściu. */}
            {isDamageMapOpen && (
                <DamageMapUpdateModal
                    visitId={visitId!}
                    visitNumber={visit.visitNumber}
                    customerEmail={visit.customer.email ?? null}
                    customerPhone={visit.customer.phone ?? null}
                    initialPoints={damageMap?.damagePoints ?? []}
                    initialVehicleType={damageMap?.vehicleType ?? null}
                    pointsRecoverable={damageMap?.pointsRecoverable ?? false}
                    hasDocument={damageMap?.hasDocument ?? false}
                    visitPhotos={visitPhotos}
                    isLoading={isLoadingDamageMap}
                    isSaving={isUpdatingDamageMap}
                    onClose={() => setIsDamageMapOpen(false)}
                    onSubmit={updateDamageMap}
                    onUploadPhotoFile={handleUploadDamagePhoto}
                    onPhotosClaimed={() => {
                        // Zdjęcia z telefonu są już zdjęciami wizyty — lista
                        // „Istniejące" w edytorze i galeria niżej muszą je zobaczyć.
                        queryClient.invalidateQueries({ queryKey: visitPhotosQueryKey(visitId!) });
                    }}
                />
            )}

            {isGeneratePostOpen && (
                <GeneratePostModal
                    onClose={() => setIsGeneratePostOpen(false)}
                    prefill={buildGeneratePostPrefill()}
                />
            )}

            {isConsumerInvoiceOpen && (
                <ConsumerInvoiceModal
                    visit={visit}
                    isOpen
                    onClose={() => setIsConsumerInvoiceOpen(false)}
                    onIssued={() => {
                        // Detal wizyty niesie settlement, więc po wystawieniu przycisk
                        // sam zamienia się na „Podgląd faktury".
                        queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId!) });
                    }}
                />
            )}

            {previewInvoiceId && (
                <RevenueInvoiceDetailModal
                    invoiceId={previewInvoiceId}
                    onClose={() => setPreviewInvoiceId(null)}
                />
            )}

            <SmsReminderModal
                isOpen={isSmsReminderOpen}
                visitId={visitId!}
                customer={visit.customer}
                existingReminder={smsReminderForEdit}
                onClose={() => { setIsSmsReminderOpen(false); setSmsReminderForEdit(null); }}
            />

            <DeleteOperationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                operationName={`${visit.customer.firstName} ${visit.customer.lastName}`}
            />
        </ViewContainer>
    </>
    );
};
