import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Aplikacja ze sklepu (iOS, Android) = ta sama strona co w przeglądarce, wczytywana
 * z serwera, plus most do systemu (powiadomienia, pliki, „Wstecz").
 *
 * Dlaczego z serwera, a nie z plików w aplikacji: logowanie stoi na ciasteczku sesji
 * SameSite=Lax, a CORS i WebSocket wpuszczają wyłącznie detailboost.pl. Strona
 * spakowana do aplikacji miałaby adres capacitor://localhost - ciasteczko by do niej
 * nie dochodziło bez osłabienia go do SameSite=None, czyli bez otwarcia drogi atakom
 * CSRF dla wszystkich użytkowników przeglądarki. Przy okazji każdy deploy frontu
 * od razu trafia do aplikacji, bez czekania na przegląd w sklepie.
 *
 * CAP_SERVER_URL pozwala zbudować aplikację na środowisko testowe
 * (np. CAP_SERVER_URL=https://test.detailboost.pl npx cap sync).
 */
const serverUrl = process.env.CAP_SERVER_URL ?? 'https://detailboost.pl';

const config: CapacitorConfig = {
    appId: 'pl.detailboost.app',
    appName: 'DetailBoost',
    // Tylko strona „brak połączenia" - reszta przychodzi z serwera (patrz wyżej).
    webDir: 'mobile/www',
    // Pozwala serwerowi i stronie rozpoznać aplikację ze sklepu w nagłówku User-Agent.
    appendUserAgent: 'DetailBoostApp',
    backgroundColor: '#0f172a',
    server: {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
        // Nawigacja poza te adresy wychodzi do przeglądarki systemowej.
        allowNavigation: ['detailboost.pl', '*.detailboost.pl'],
        errorPath: 'offline.html',
    },
    ios: {
        // Wcięcie pod pasek stanu robi kontener (AppContainerViewController), jak w aplikacji
        // z ekranu początkowego - na tym układzie strona jest dopracowana.
        contentInset: 'never',
    },
    plugins: {
        // Wcięcia systemowych pasków robi MainActivity (patrz komentarz tam) - wtyczka ich nie dubluje.
        SystemBars: { insetsHandling: 'disable' },
        PushNotifications: {
            // Powiadomienie przy otwartej aplikacji też się pokazuje - tak jak w przeglądarce.
            presentationOptions: ['badge', 'sound', 'alert'],
        },
    },
};

export default config;
