import { apiClient } from '@/core';
import type { VisitCommunicationResponse } from '../types';

const USE_MOCKS = false;

const mockVisitCommunication: VisitCommunicationResponse = {
    visitId: 'visit_1',
    entries: [
        {
            id: 'comm_1',
            visitId: 'visit_1',
            channel: 'EMAIL',
            messageType: 'VISIT_WELCOME_EMAIL',
            messageTypeLabel: 'Potwierdzenie przyjęcia pojazdu',
            recipientAddress: 'jan.kowalski@example.com',
            subject: 'Potwierdzenie przyjęcia pojazdu – VIS-2025-00042',
            bodyContent: `Szanowny Panie Janie,

Z przyjemnością informujemy, że Pana pojazd BMW X5 (WA 12345) został przyjęty do naszego warsztatu.

Numer wizyty: VIS-2025-00042
Data przyjęcia: 15.01.2025
Planowane usługi:
• Oklejanie PPF – cały przód
• Powłoka ceramiczna

O gotowości pojazdu do odbioru poinformujemy Pana SMS-em.

Z poważaniem,
Zespół Detailing Studio`,
            status: 'SENT',
            errorMessage: null,
            sentAt: '2025-01-15T09:30:00Z',
        },
        {
            id: 'comm_2',
            visitId: 'visit_1',
            channel: 'SMS',
            messageType: 'VISIT_READY_SMS',
            messageTypeLabel: 'Powiadomienie o gotowości pojazdu',
            recipientAddress: '+48 123 456 789',
            subject: null,
            bodyContent: 'Detailing Studio: Pojazd BMW X5 (WA 12345) jest gotowy do odbioru. Wizyta VIS-2025-00042. Zapraszamy!',
            status: 'SENT',
            errorMessage: null,
            sentAt: '2025-01-17T14:12:00Z',
        },
        {
            id: 'comm_3',
            visitId: 'visit_1',
            channel: 'EMAIL',
            messageType: 'SERVICE_CHANGE_NOTIFICATION',
            messageTypeLabel: 'Zmiana zakresu usług',
            recipientAddress: 'jan.kowalski@example.com',
            subject: 'Zmiana zakresu usług – VIS-2025-00042',
            bodyContent: `Szanowny Panie Janie,

W trakcie realizacji wizyty VIS-2025-00042 wykryliśmy konieczność rozszerzenia zakresu prac.

Proponowana zmiana:
• Dodanie: Korekta lakieru (1 etap) – 450,00 zł brutto

Prosimy o potwierdzenie lub odrzucenie zmiany przez link poniżej.

Z poważaniem,
Detailing Studio`,
            status: 'FAILED',
            errorMessage: 'SMTP connection timeout after 30s',
            sentAt: '2025-01-16T10:45:00Z',
        },
    ],
};

export const communicationApi = {
    getVisitCommunication: async (visitId: string): Promise<VisitCommunicationResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 400));
            return mockVisitCommunication;
        }
        const response = await apiClient.get(`/visits/${visitId}/communication`);
        return response.data;
    },
};
