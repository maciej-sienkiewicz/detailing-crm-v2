// src/modules/comms/views/InboxView.tsx
// Trasa /zapytania - skrzynka „Zapytania" (dawne Leady i Poczta). Widok mieszka
// w ../inbox; ten plik zostaje punktem wejścia leniwego importu w routerze.
//
// Stare adresy (/leads, /communication) przekierowują tutaj z zachowaniem
// parametrów (InboxRedirects.tsx) - linki w powiadomieniach i zakładkach
// przeglądarki dalej działają.
export { default } from '../inbox/InboxPage';
