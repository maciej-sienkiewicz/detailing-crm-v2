export { CheckInWizardView } from './views/CheckInWizardView';
export { MobilePhotoUploadView } from './views/MobilePhotoUploadView';

export { VerificationStep } from './components/VerificationStep';
export { PhotoDocumentationStep } from './components/PhotoDocumentationStep';
export { CheckinQRGenerator } from './components/CheckinQRGenerator';
export { UnfinishedCheckInsPanel } from './components/UnfinishedCheckInsPanel';
export { ResumeCheckInModal } from './components/ResumeCheckInModal';
/* Edytor mapy uszkodzeń jest wspólny dla przyjęcia i dla „Zaktualizuj uszkodzenia"
   w karcie wizyty — wizyta MUSI rysować tym samym narzędziem, bo inaczej dwa
   dokumenty tej samej sprawy wyglądałyby inaczej. */
export { VehicleDamageMapper } from './components/VehicleDamageMapper';

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
    DamagePoint,
    DamagePointPhoto,
    AnnotationStroke,
    AnnotationPoint,
} from './types';
