// src/modules/voice-commands/views/MobileVoiceCommandsWrapper.tsx
// Public route: no authentication required.
// URL format: /m/voice#token=<token> (stare linki: /m/voice?token=<token>, patrz readVoiceToken)

import { useState } from 'react';
import { readVoiceToken } from '../utils/voiceToken';
import { MobileVoiceCommandsView } from './MobileVoiceCommandsView';

export const MobileVoiceCommandsWrapper = () => {
    const [token] = useState(() => readVoiceToken(window.location, window.history));
    // Token validation is handled inside MobileVoiceCommandsView via the context API
    return <MobileVoiceCommandsView token={token} />;
};
