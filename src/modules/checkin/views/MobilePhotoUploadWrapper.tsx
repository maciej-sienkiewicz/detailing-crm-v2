import { useParams, useSearchParams } from 'react-router-dom';
import { MobilePhotoUploadView } from './MobilePhotoUploadView';
import { ErrorScreen } from '../components/ErrorScreen';
import { t } from '@/common/i18n';

export const MobilePhotoUploadWrapper = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    if (!sessionId || !token) {
        return (
            <ErrorScreen
                title={t.checkin.mobile.invalidSession}
                message="Link do wgrywania zdjęć jest nieprawidłowy. Zeskanuj kod QR ponownie."
            />
        );
    }

    return <MobilePhotoUploadView sessionId={sessionId} token={token} />;
};
