// src/modules/checkin/views/MobilePhotoUploadWrapper.tsx
// Public route — no authentication required.
// URL format: /m/upload?t=<token>

import { useSearchParams } from 'react-router-dom';
import { MobilePhotoUploadView } from './MobilePhotoUploadView';

export const MobilePhotoUploadWrapper = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('t') ?? '';
    // Token validation is handled inside MobilePhotoUploadView via the context API
    return <MobilePhotoUploadView token={token} />;
};
