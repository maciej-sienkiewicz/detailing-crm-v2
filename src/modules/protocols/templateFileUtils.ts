import type { ProtocolTemplateFormat, ProtocolTemplateVerification } from './types';

export const MAX_TEMPLATE_FILE_SIZE = 10 * 1024 * 1024;

export const detectFileFormat = (file: File): ProtocolTemplateFormat | null => {
    const name = file.name.toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
    if (file.type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) return 'HTML';
    return null;
};

export const validateTemplateFile = (file: File): string | null => {
    if (!detectFileFormat(file)) return 'Dozwolone są tylko pliki PDF lub HTML';
    if (file.size > MAX_TEMPLATE_FILE_SIZE) return 'Plik jest za duży. Maksymalny rozmiar to 10 MB';
    return null;
};

/** Polskie etykiety pól szablonu: do czytelnego raportu braków po weryfikacji. */
const FIELD_LABELS: Record<string, string> = {
    brand: 'Marka pojazdu',
    model: 'Model pojazdu',
    licenseplate: 'Nr rejestracyjny',
    mileage: 'Przebieg',
    services: 'Zakres usługi',
    remarks: 'Uwagi',
    fullname: 'Imię i nazwisko',
    companyname: 'Nazwa firmy',
    phonenumber: 'Nr telefonu',
    email: 'E-mail',
    tax: 'NIP',
    date: 'Data i godzina przyjęcia',
    price: 'Łączny koszt usług',
    keys: 'Przekazano kluczyk (checkbox)',
    documents: 'Przekazano dokumenty (checkbox)',
    signature: 'Podpis zleceniodawcy (obszar podpisu)',
    company_signature: 'Podpis zleceniobiorcy (obszar podpisu)',
    protocolnumber: 'Nr protokołu',
    receivedby: 'Osoba przyjmująca pojazd',
    provider: 'Usługodawca',
};

export const fieldLabel = (fieldName: string): string =>
    FIELD_LABELS[fieldName] ? `${fieldName} (${FIELD_LABELS[fieldName]})` : fieldName;

/** Zbuduj komunikat o odrzuceniu pliku po weryfikacji pól. */
export const buildRejectionMessage = (verification: ProtocolTemplateVerification): string => {
    const details = [
        ...verification.missingFields.map(f => `brakujące pole: ${fieldLabel(f)}`),
        ...verification.problems,
    ];
    return `Plik nie przeszedł weryfikacji: ${details.join('; ')}. ` +
        'Popraw plik zgodnie z instrukcją (przycisk „Dowiedz się więcej”) i wgraj go ponownie.';
};
