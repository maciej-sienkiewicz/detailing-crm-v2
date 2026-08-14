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

export { useHandover } from './hooks/useHandover';
export { useMarkReady } from './hooks/useMarkReady';

export { visitApi } from './api/visitApi';
export { visitCommentApi } from './api/visitCommentApi';
export { stateTransitionApi } from './api/stateTransitionApi';

export { VisitHeader } from './components/VisitHeader';
export { StatusStepper } from './components/StatusStepper';
export { VehicleInfoCard, CustomerInfoCard } from './components/InfoCards';
export { ServicesTable } from './components/ServicesTable';
export { VisitComments } from './components/VisitComments';
export { DocumentGallery } from './components/DocumentGallery';
export {
    HandoverSheet,
    MarkReadyDialog,
    CustomerNotesSection,
    SettlementSection,
    InvoiceSection,
    InvoiceItemsEditor,
    BuyerEditor,
    ProtocolSection,
    HandoverResultView,
} from './components/handover';

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
    TransitionType,
    PaymentMethod,
    InvoiceType,
    NotificationChannels,
    PaymentDetails,
    CompleteInvoicePayload,
    CompleteVisitResponse,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
} from './types/stateTransitions';

export type {
    HandoverState,
    HandoverItem,
    HandoverBuyer,
    HandoverProblem,
    VatRateCode,
} from './types/handover';
