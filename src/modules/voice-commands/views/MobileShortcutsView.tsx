// src/modules/voice-commands/views/MobileShortcutsView.tsx
//
// Dawna strona „Skróty mobilne". Nic w aplikacji do niej nie linkowało, więc skrót
// głosowy, instalacja aplikacji i parowanie do dzwonienia przeszły do
// Ustawienia → Telefon. Adres zostaje, bo siedzi w zakładkach i na ekranach telefonów:
// telefon z tokenem dalej trafia prosto do nagrywania, wszystko inne - do ustawień.

import { Navigate } from 'react-router-dom';
import { useMediaQuery } from '@/common/hooks';
import { useMobileShortcutToken } from '../hooks/useMobileShortcutToken';

const PHONE_SETTINGS = '/settings?tab=phone&view=voice';

export const MobileShortcutsView = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { data: token, isLoading } = useMobileShortcutToken({ enabled: isMobile });

    if (isMobile && isLoading) return null;
    if (isMobile && token) {
        // Token we fragmencie (#), nie w query stringu: fragment nie trafia do serwera,
        // więc ani do logów proxy, ani do nagłówka Referer.
        return <Navigate to={{ pathname: '/m/voice', hash: `#token=${encodeURIComponent(token)}` }} replace />;
    }
    return <Navigate to={PHONE_SETTINGS} replace />;
};
