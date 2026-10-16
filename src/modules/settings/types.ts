export interface CompanySettings {
    id: string;
    name: string;
    taxId: string;
    regon: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    website: string | null;
    bankAccount: string | null;
    logoUrl: string | null;
    /** Jasna podkładka pod logo w ciemnym menu: tylko przezroczyste logo z ciemnym tuszem. */
    logoNeedsLightPlate: boolean;
    /** Szerokość / wysokość logo; null dla logo sprzed analizy. */
    logoAspectRatio: number | null;
    emailAlias: string | null;
    updatedAt: string;
}

export interface UpdateCompanySettingsRequest {
    name: string;
    taxId: string;
    regon: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    website?: string | null;
    bankAccount?: string | null;
}

export interface UploadLogoResponse {
    logoUrl: string;
    logoNeedsLightPlate: boolean;
    logoAspectRatio: number | null;
}

// ─── Logo na dokumentach ──────────────────────────────────────────────────────

export interface DocumentLogoConfig {
    /** „Logo na dokumentach" — nagłówek systemowych protokołów i zgód. */
    showLogoOnDocuments: boolean;
    /** Bez wgranego logo przełącznik nic nie zmienia — UI mówi to wprost. */
    hasLogo: boolean;
}

export interface UpdateDocumentLogoConfigRequest {
    showLogoOnDocuments: boolean;
}

/**
 * Pola sekcji „Dane pojazdu" UKRYTE na formularzu wizyty („Ustawienia pól").
 * Pusta lista - wszystko widać; tak startuje każde studio.
 */
export interface VehicleFormConfig {
    hiddenFields: VehicleFormFieldKey[];
}

/** Marki i modelu nie da się ukryć: bez nich nie ma pojazdu. */
export type VehicleFormFieldKey = 'yearOfProduction' | 'licensePlate' | 'mileage' | 'color' | 'vin';

/** Widok wizyty: odhaczanie wykonanych usług (np. tablet na hali); domyślnie wyłączone. */
export interface VisitViewConfig {
    serviceChecklistEnabled: boolean;
}

/** Treść protokołu przyjęcia; oba przełączniki domyślnie wyłączone. */
export interface ProtocolContentConfig {
    /** Cena przy każdej usłudze. */
    showServicePrices: boolean;
    /**
     * Wiersz „VIN" w ramce pojazdu. Zmienia układ dokumentu: serwer podmienia plik
     * systemowego szablonu w tej samej operacji, w której zapisuje ustawienie.
     */
    showVin: boolean;
}

/** Zmiana treści protokołu - pominięte pole zostaje bez zmian. */
export type UpdateProtocolContentConfig = Partial<ProtocolContentConfig>;

// ─── Numeracja wizyt ──────────────────────────────────────────────────────────

export interface VisitNumberingConfig {
    /**
     * Szablon numeru, np. "VIS-{YYYY}-{SEQ}". Dostępne znaczniki: {YYYY} {YY} {MM} {DD}
     * i dokładnie jeden z {SEQ} (rosnący licznik) albo {RAND} (losowe cyfry, numer nie
     * zdradza liczby zrealizowanych wizyt).
     */
    format: string;
    /** Szerokość zerowego dopełnienia numeru porządkowego {SEQ}. */
    sequenceLength: number;
    /** Liczba losowych cyfr {RAND}. */
    randomLength: number;
    /** Przykładowy numer: dla {SEQ} zawsze z numerem 1, dla {RAND} świeżo wylosowany. */
    preview: string;
}

export interface UpdateVisitNumberingConfigRequest {
    format: string;
    sequenceLength: number;
    randomLength: number;
}

// ─── SMS Credits ──────────────────────────────────────────────────────────────

export type SmsCreditTransactionType = 'PURCHASE' | 'USAGE' | 'REFUND' | 'BONUS' | 'EXPIRY';

export interface SmsCreditBalance {
    availableCredits: number;
    totalPurchased: number;
    totalUsed: number;
    updatedAt: string;
}

export interface SmsCreditPackage {
    id: string;
    name: string;
    creditAmount: number;
    priceGross: number;
    currency: string;
    pricePerCredit: number;
}

export interface SmsCreditTransaction {
    id: string;
    type: SmsCreditTransactionType;
    amount: number;
    balanceAfter: number;
    description: string;
    referenceId: string | null;
    createdAt: string;
}

export interface SmsCreditTransactionPage {
    items: SmsCreditTransaction[];
    total: number;
    page: number;
    size: number;
}

export interface PurchaseCreditsResponse {
    availableCredits: number;
    message: string;
}

/**
 * Automatyczne tworzenie leadów — klasyfikacja przychodzącej poczty przez model.
 * `enabledAt` to moment włączenia: od niego liczy się próg „klasyfikujemy tylko
 * nowe wiadomości", więc jest null dokładnie wtedy, gdy funkcja jest wyłączona.
 */
export interface AutoLeadConfig {
    enabled: boolean;
    enabledAt: string | null;
}

/**
 * Progi stygnięcia sprawy — po ilu godzinach kolejka zaczyna mówić podniesionym głosem.
 *
 * To są liczby, które dzielą kolejkę na sekcje i decydują o kolorze paska przy
 * każdym wierszu, więc należą do studia, a nie do kodu: właściciel wie, po ilu
 * godzinach JEGO klient dzwoni do konkurencji. Zakres 1–720 h pilnuje backend.
 */
export interface LeadAlertConfig {
    leadStagnantOurThresholdHours: number;
    leadStagnantClientThresholdHours: number;
}

// ─── Eskalacja czekających zapytań (Ustawienia → Leady) ─────────────────────────
// Kontrakt: GET/PUT /v1/leads/escalation-policy (backend LeadEscalationPolicyController).

export type EscalationChannel = 'PUSH' | 'SMS';

/** TEAM - każdy obsługujący zapytania (tylko push); USER - osoba z konta; PHONE - numer (tylko SMS). */
export type EscalationRecipientKind = 'TEAM' | 'USER' | 'PHONE';

export interface EscalationRecipient {
    kind: EscalationRecipientKind;
    userId?: string | null;
    phone?: string | null;
    label?: string | null;
}

export interface EscalationStep {
    id: string;
    /** 0 = od razu. */
    afterMinutes: number;
    channel: EscalationChannel;
    /** Czas zegarowy, także poza godzinami pracy. */
    anytime: boolean;
    recipients: EscalationRecipient[];
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface EscalationWorkingHours {
    alwaysOn: boolean;
    fromHour: number;
    /** Wyłącznie: 20 = do 19:59, 24 = do północy. */
    toHour: number;
    days: DayOfWeek[];
}

export interface EscalationPolicy {
    steps: EscalationStep[];
    workingHours: EscalationWorkingHours;
}

export interface EscalationPerson {
    userId: string;
    name: string;
    phone: string | null;
    isOwner: boolean;
}

export interface EscalationPolicyResponse {
    /** false = studio działa na polityce domyślnej. */
    custom: boolean;
    policy: EscalationPolicy;
    people: EscalationPerson[];
}
