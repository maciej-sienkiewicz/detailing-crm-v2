export { VisitDetailView } from './views/VisitDetailView';

export {
    useVisitDetail,
    visitDetailQueryKey,
    useUpdateVisit,
    useCreateJournalEntry,
    useDeleteJournalEntry,
    useUploadDocument,
    useDeleteDocument,
} from './hooks';

export { useStateTransitionWizard } from './hooks/useStateTransition';

export { visitApi } from './api/visitApi';
export { stateTransitionApi } from './api/stateTransitionApi';

export { VisitHeader } from './components/VisitHeader';
export { StatusStepper } from './components/StatusStepper';
export { VehicleInfoCard, CustomerInfoCard } from './components/InfoCards';
export { ServicesTable } from './components/ServicesTable';
export { CommunicationJournal } from './components/CommunicationJournal';
export { DocumentGallery } from './components/DocumentGallery';
export { InProgressToReadyWizard, ReadyToCompletedWizard } from './components/transitions/TransitionWizards';
export { WizardLayout } from './components/transitions/WizardLayout';
export { QualityCheckStep } from './components/transitions/QualityCheckStep';
export { NotificationStep } from './components/transitions/NotificationStep';
export { ClientBriefingStep } from './components/transitions/ClientBriefingStep';
export { SignatureStep } from './components/transitions/SignatureStep';
export { PaymentStep } from './components/transitions/PaymentStep';

export type {
    Visit,
    VisitStatus,
    JournalEntry,
    JournalEntryType,
    VisitDocument,
    DocumentType,
    VehicleInfo,
    CustomerInfo,
    ServiceLineItem,
    MoneyAmount,
    VisitDetailResponse,
    UpdateVisitPayload,
    CreateJournalEntryPayload,
    UploadDocumentPayload,
} from './types';

export type {
    TransitionType,
    PaymentMethod,
    InvoiceType,
    QualityCheckItem,
    NotificationChannels,
    PaymentDetails,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
} from './hooks/useStateTransition.ts';