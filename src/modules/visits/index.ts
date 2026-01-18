export { VisitDetailView } from './views/VisitDetailView';

export {
    useVisitDetail,
    visitDetailQueryKey,
    useUpdateVisit,
    useUploadDocument,
    useDeleteDocument,
    useVisitComments,
    useAddComment,
    useUpdateComment,
    useDeleteComment,
} from './hooks';

export { useStateTransitionWizard } from './hooks/useStateTransition';

export { visitApi } from './api/visitApi';
export { visitCommentApi } from './api/visitCommentApi';
export { stateTransitionApi } from './api/stateTransitionApi';

export { VisitHeader } from './components/VisitHeader';
export { StatusStepper } from './components/StatusStepper';
export { VehicleInfoCard, CustomerInfoCard } from './components/InfoCards';
export { ServicesTable } from './components/ServicesTable';
export { VisitComments } from './components/VisitComments';
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
    VisitComment,
    CommentType,
    CommentRevision,
    VisitDocument,
    DocumentType,
    VehicleInfo,
    CustomerInfo,
    ServiceLineItem,
    MoneyAmount,
    VisitDetailResponse,
    UpdateVisitPayload,
    UploadDocumentPayload,
    AddCommentPayload,
    UpdateCommentPayload,
    GetCommentsResponse,
} from './types';

export type {
    WizardStep,
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
} from './hooks/useStateTransition';
