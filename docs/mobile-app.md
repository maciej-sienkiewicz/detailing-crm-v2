# Aplikacja mobilna (iOS i Android)

Aplikacja ze sklepu to ta sama strona co w przeglądarce, otwierana z `https://detailboost.pl`
w natywnym oknie (Capacitor 8). Do tego dochodzi most do systemu:

- powiadomienia push przez Apple (APNs) i Google (FCM),
- pliki (PDF, CSV, zdjęcia) idą do systemowego „Udostępnij”: zapis w Plikach, wydruk, mail,
- obce strony otwierają się w przeglądarce wewnątrz aplikacji,
- przycisk „Wstecz” na Androidzie najpierw zamyka okno, potem cofa,
- strona „Brak połączenia”, gdy nie ma internetu.

Każdy deploy frontu od razu trafia do aplikacji. Nowa wersja w sklepie jest potrzebna tylko
przy zmianach w kodzie natywnym (`android/`, `ios/`, wtyczki, `capacitor.config.ts`).

## Dlaczego strona z serwera, a nie spakowana w aplikacji

Logowanie stoi na ciasteczku sesji `SameSite=Lax`, a CORS i WebSocket wpuszczają tylko
detailboost.pl. Spakowana strona miałaby adres `capacitor://localhost` i ciasteczko by do niej
nie dochodziło, chyba że osłabimy je do `SameSite=None`, a to otwiera drogę atakom CSRF dla
wszystkich użytkowników przeglądarki. Szczegóły w `capacitor.config.ts`.

## Co jest inaczej w aplikacji niż w przeglądarce

Rozpoznanie: `isNativeApp()` z `src/core/native/platform.ts`. Nagłówek User-Agent aplikacji
kończy się na `DetailBoostApp`.

| Co | W aplikacji |
|---|---|
| Zakupy (abonament, moduły, SMS-y) | ukryte, bez linków do zakupu (`canPurchaseHere()`), wymóg App Store 3.1.1 i Google Play |
| Powiadomienia | APNs/FCM zamiast Web Push; Service Worker wyłączony |
| `window.open`, `<a download>`, `a.click()` | przechwycone w `src/core/native/installNativeShell.ts` |
| Drukowanie wykazu usług | ukryte (WebView nie drukuje) |
| Podgląd roli | ukryty (potrzebuje drugiego okna) |
| Kontakty na iPhonie (CardDAV) | ścieżka „skopiuj link i otwórz w Safari” |
| Usuwanie konta | Ustawienia → Bezpieczeństwo → Usuń konto (wymóg App Store 5.1.1(v)) |

Kod modułów nie musi wiedzieć o aplikacji: nowe pobieranie pliku przez `saveBlobAsFile`,
`window.open` albo `<a download>` zadziała w niej samo.

## Wymagania

- Node 22+, `npm ci`
- Android: Android Studio (albo SDK + JDK 21)
- iOS: Mac z Xcode 16+, konto Apple Developer (99 USD rocznie)
- konto Google Play Console (25 USD jednorazowo)

## Budowanie

```bash
npm ci
npm run mobile:sync          # kopiuje konfigurację i wtyczki do android/ i ios/
npm run mobile:android       # otwiera Android Studio
npm run mobile:ios           # otwiera Xcode
```

Aplikacja na środowisko testowe: `CAP_SERVER_URL=https://test.detailboost.pl npm run mobile:sync`.
Adres musi być w `server.allowNavigation` w `capacitor.config.ts`.

Debug APK bez Android Studio:

```bash
cd android && ./gradlew assembleDebug   # → app/build/outputs/apk/debug/app-debug.apk
```

Wersję podbijasz w `android/app/build.gradle` (`versionCode`, `versionName`) i w Xcode
(`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`).

### Emulator Androida z lokalnym Vite

Backend wpuszcza przez CORS i WebSocket tylko `localhost`, `192.168.*.*` i detailboost.pl,
więc strona otwarta z `http://10.0.2.2:3000` dostaje 403 przy logowaniu. Zamiast poluzowania
backendu przekieruj port emulatora na Maca i buduj na `localhost`:

```bash
adb reverse tcp:3000 tcp:3000
CAP_SERVER_URL=http://localhost:3000 npx cap sync android
```

## Powiadomienia push: konfiguracja

Backend wysyła je sam (APNs po HTTP/2, FCM HTTP v1), bez dodatkowych bibliotek. Bez kluczy
działa jak dotąd: aplikacje ze sklepu po prostu nie dostają powiadomień, a w logach jest
ostrzeżenie. Klucze trafiają **wyłącznie** do zmiennych środowiskowych serwera, nigdy do repo.

### iPhone (APNs)

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers: identyfikator
   `pl.detailboost.app` z włączonym **Push Notifications**.
2. Keys → „+” → zaznacz **Apple Push Notifications service (APNs)** → pobierz plik `.p8`
   (da się pobrać tylko raz). Zapisz Key ID i Team ID (prawy górny róg portalu).
3. Zmienne środowiskowe backendu (`deploy/docker-compose.yaml` czyta je z `ENV_*`):

   | Zmienna | Wartość |
   |---|---|
   | `APNS_KEY_ID` | Key ID klucza |
   | `APNS_TEAM_ID` | Team ID |
   | `APNS_PRIVATE_KEY` | treść pliku `.p8` (może być w jednej linii z `\n`) albo jej base64 |
   | `APNS_BUNDLE_ID` | `pl.detailboost.app` (domyślnie) |
   | `APNS_SANDBOX` | `true` dla aplikacji uruchamianej z Xcode, `false` dla TestFlight i App Store |

4. W Xcode: target App → Signing & Capabilities → sprawdź, że jest **Push Notifications**
   (plik `ios/App/App/App.entitlements` już to deklaruje).

### Android (FCM)

1. [Firebase Console](https://console.firebase.google.com) → nowy projekt → dodaj aplikację
   Android z pakietem `pl.mm.detailboost` (na Androidzie identyfikator w Google Play jest inny
   niż na iOS, patrz `applicationId` w `android/app/build.gradle`).
2. Pobierz `google-services.json` i połóż w `android/app/`. Plik jest w `.gitignore`: trzymaj
   go w sejfie z sekretami i kopiuj przed budowaniem wydania. Bez niego aplikacja się zbuduje,
   ale nie dostanie tokenu FCM.
3. Ustawienia projektu → Konta usługi → „Wygeneruj nowy klucz prywatny” → plik JSON.
4. Zmienna backendu `FCM_SERVICE_ACCOUNT_JSON`: cały JSON albo jego base64 (łatwiej wkleić).

### Dane klienta w powiadomieniach

Domyślnie aplikacja ze sklepu dostaje powiadomienia **bez danych osobowych** („Nowe zapytanie”
zamiast imienia i telefonu), bo widać je na zablokowanym ekranie, a App Store (4.5.4) zabrania
w nich danych wrażliwych. Przeglądarka dostaje wersję z imieniem jak dotąd.
`PUSH_NATIVE_PERSONAL_DATA=true` włącza imiona także w aplikacji, tylko dla osób z prawem
do danych klientów.

### Sprawdzenie

W aplikacji: Ustawienia → Tablety, telefon, kontakty → Powiadomienia → „Włącz powiadomienia”,
potem „Wyślij próbne”. Próbne idzie tą samą drogą co prawdziwe.

## Podpisywanie i wydanie

### Android

```bash
keytool -genkey -v -keystore detailboost-release.jks -alias detailboost \
  -keyalg RSA -keysize 2048 -validity 10000
```

Keystore i hasła trzymaj poza repo. W Android Studio: Build → Generate Signed App Bundle → AAB.
Przy pierwszym wydaniu włącz **Play App Signing** (Google trzyma klucz wydania, Ty tylko klucz
przesyłania, więc jego utrata nie jest końcem aplikacji).

### iOS

Xcode → Product → Archive → Distribute App → App Store Connect. Najpierw TestFlight, potem
wysłanie do przeglądu.

## Zgłoszenie do sklepów: lista kontrolna

Przegląd Apple sprawdza, czy aplikacja to coś więcej niż opakowana strona (4.2). Pokaż
w notatce dla recenzenta, co działa natywnie: powiadomienia push, zdjęcia z aparatu przy
przyjęciu auta, udostępnianie protokołów i faktur, skan VIN.

- [ ] **Konto demo dla recenzenta** z danymi (klienci, wizyty, rezerwacje), z aktywnym
      abonamentem, niewygasające w czasie przeglądu. Login i hasło w App Store Connect →
      App Review Information oraz w Play Console → Dostęp do aplikacji.
- [ ] Notatka dla recenzenta: aplikacja jest narzędziem B2B dla studiów detailingu;
      abonament kupuje się poza aplikacją, a w aplikacji nie ma żadnych zakupów ani linków
      do nich (3.1.3(b) Multiplatform Services). Konto usuwa się w Ustawienia → Bezpieczeństwo.
- [ ] Polityka prywatności pod publicznym adresem (wymagana w obu sklepach).
- [ ] App Store Connect → App Privacy i Google Play → Bezpieczeństwo danych: dane kontaktowe,
      identyfikatory urządzenia (token push), zdjęcia i dane klientów studia; bez śledzenia.
- [ ] Zrzuty ekranu: iPhone 6,9” i 6,5”, iPad 13” (aplikacja działa też na iPadzie),
      telefon z Androidem.
- [ ] Kategoria: Biznes. Wiek: 4+ / Wszyscy.
- [ ] Google Play: deklaracja uprawnień (aparat, mikrofon, powiadomienia) i formularz
      „Usuwanie konta” z adresem strony z instrukcją usunięcia.

## Do sprawdzenia na prawdziwym telefonie

Tego nie da się sprawdzić bez urządzenia, więc przed pierwszym wydaniem:

- pasek stanu: treść zaczyna się pod nim (iOS: `AppContainerViewController` w
  `ios/App/App/SceneDelegate.swift`, Android: `MainActivity`),
- klawiatura nie zasłania pól w oknach (Android odsuwa widok o wysokość klawiatury),
- logowanie przeżywa zamknięcie i ponowne otwarcie aplikacji,
- powiadomienie przy zamkniętej aplikacji otwiera właściwy ekran po stuknięciu,
- zdjęcie z aparatu przy przyjęciu auta i skan VIN,
- „Udostępnij” dla protokołu PDF i eksportu CSV.

## Usuwanie konta

Właściciel: Ustawienia → Bezpieczeństwo → Usuń konto (nazwa firmy i hasło). Serwer od razu
blokuje konta całego zespołu i kończy ich sesje, a dane kasuje w tle tym samym mechanizmem
co „Wyczyść konto” (`StudioResetJobRunner`). Na końcu konto się zamyka: dane firmy znikają,
abonament wygasa, konta osób dostają anonimowy adres. Zostaje historia płatności za abonament
(przepisy rachunkowe) i dziennik audytu.
