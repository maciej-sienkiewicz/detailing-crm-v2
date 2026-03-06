export { CheckInWizardView } from './views/CheckInWizardView';
export { MobilePhotoUploadView } from './views/MobilePhotoUploadView';

export { VerificationStep } from './components/VerificationStep';
export { PhotoDocumentationStep } from './components/PhotoDocumentationStep';
export { CheckinQRGenerator } from './components/CheckinQRGenerator';

export { useCheckInWizard } from './hooks/useCheckInWizard';
export { usePhotoUpload } from './hooks/usePhotoUpload';
export { useMobilePhotoUpload } from './hooks/useMobilePhotoUpload';
export { useCheckInValidation } from './hooks/useCheckInValidation';
export { useCheckinQRToken } from './hooks/useCheckinQRToken';
export { useCheckinSocket } from './hooks/useCheckinSocket';

export { checkinApi } from './api/checkinApi';

export type {
    CheckInFormData,
    CheckInStep,
    PhotoSlot,
    DepositItem,
    ReservationToVisitPayload,
    MobileUploadSession,
    QRTokenResponse,
    MobileCheckinContext,
    MobilePhotoUploadResponse,
    CheckinPhotoUploadedEvent,
    PendingPhoto,
} from './types';
