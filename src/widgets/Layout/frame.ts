// src/widgets/Layout/frame.ts
//
// „Rama” (decyzja z 21.10.2026): na komputerze ciemny kolor menu bocznego obiega całe
// okno, a treść leży w jasnym panelu z zaokrąglonymi rogami. Krawędź menu przestała
// być ostrym cięciem między ciemnym a jasnym - treść jest wydzielonym obszarem pracy.
//
// Osobny plik bez importów: z tych wartości korzystają też elementy przyklejone do
// krawędzi ekranu (StickyFormFooter), a import z Layoutu zamykałby cykl.

/** Kolor ramy - ten sam co tło menu bocznego. */
export const FRAME_COLOR = '#0f172a';
/** Odstęp panelu treści od krawędzi okna (góra, prawo, dół). */
export const FRAME_GAP = 8;
/** Zaokrąglenie panelu treści. */
export const FRAME_RADIUS = 16;
