// src/modules/dashboard/components/mailSetup/inquiriesTour.ts
//
// Animacje-instrukcje działu „Zapytania i poczta” ze strony „Poznaj program”
// (repozytorium detailboost-webpage, public/animacje/<slug>/). Pliki są skopiowane
// do public/animacje/ aplikacji: serwer strony pozwala osadzać je tylko na swojej
// domenie (frame-ancestors 'self'), a aplikacja mobilna musi je mieć bez internetu.
// W oknie to reklama, nie instrukcja: każda pozycja mówi, co studio zyskuje, a nie
// zadaje pytanie. Najpierw to, co przekonuje, podłączenie poczty na końcu listy
// głównej - i tak prowadzi do niego przycisk „Podłącz pocztę”.

export interface TourAnimation {
    slug: string;
    title: string;
}

export const INQUIRIES_TOUR: readonly TourAnimation[] = [
    { slug: 'jak-dziala-tablica-zapytan', title: 'Łatwy i automatyczny podgląd wszystkich zapytań' },
    { slug: 'poczta-odpowiedz-z-ai-i-zdjecia', title: 'Błyskawiczna odpowiedź z wyceną i zdjęciami z CRM-a' },
    { slug: 'jak-stworzyc-stopke-email', title: 'Profesjonalna stopka z logo firmy' },
    { slug: 'jak-skonfigurowac-poczte', title: 'Konfiguracja maila w kilka minut' },
    { slug: 'poczta-oferta-z-cenami', title: 'Oferta z cenami prosto z wyceny' },
    { slug: 'poczta-rozpoznanie-klienta', title: 'Klient rozpoznany, zanim odpiszesz' },
    { slug: 'poczta-klient-ktory-nie-przyjezdza', title: 'Twoje warunki przekazane uprzejmie' },
    { slug: 'jak-dzialaja-leady', title: 'Od zapytania do wizyty w kilku kliknięciach' },
];

/**
 * Wprost do pliku, nie do katalogu: nginx aplikacji (`try_files $uri /index.html`)
 * oddałby na `/animacje/<slug>/` samą aplikację zamiast animacji.
 */
export const tourFrameSrc = (slug: string) => `/animacje/${slug}/index.html`;
