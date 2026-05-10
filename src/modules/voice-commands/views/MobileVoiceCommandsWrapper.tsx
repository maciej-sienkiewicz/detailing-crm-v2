// src/modules/voice-commands/views/MobileVoiceCommandsWrapper.tsx
// Public route — no authentication required.
// URL format: /m/voice?token=<token>

import { useSearchParams } from 'react-router-dom';
import { MobileVoiceCommandsView } from './MobileVoiceCommandsView';

export const MobileVoiceCommandsWrapper = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    // Token validation is handled inside MobileVoiceCommandsView via the context API
    return <MobileVoiceCommandsView token={token} />;
};
