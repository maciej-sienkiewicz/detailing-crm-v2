// src/modules/voice-commands/utils/voiceToken.ts

/**
 * Token strony `/m/voice` czytamy z fragmentu adresu (`#token=`), bo fragment nie trafia
 * do serwera: ani do logów proxy, ani do nagłówka Referer. Linki zapisane na telefonach
 * przed tą zmianą mają `?token=` - taki adres działa dalej, a token od razu przenosimy
 * do fragmentu, żeby nie wracał do serwera przy odświeżeniu ani nie trafił do skrótu
 * „Dodaj do ekranu głównego".
 */
export const readVoiceToken = (
    location: Pick<Location, 'pathname' | 'search' | 'hash'>,
    history: Pick<History, 'replaceState' | 'state'>,
): string => {
    const fromHash = new URLSearchParams(location.hash.replace(/^#/, '')).get('token');
    if (fromHash) return fromHash;

    const query = new URLSearchParams(location.search);
    const legacy = query.get('token');
    if (!legacy) return '';
    query.delete('token');
    const rest = query.toString();
    history.replaceState(
        history.state ?? null,
        '',
        `${location.pathname}${rest ? `?${rest}` : ''}#token=${encodeURIComponent(legacy)}`,
    );
    return legacy;
};
