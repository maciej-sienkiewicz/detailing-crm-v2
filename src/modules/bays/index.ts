// src/modules/bays - stanowiska, włączane przez studio (Ustawienia → Stanowiska).
//
// Poza tym folderem stanowiska istnieją tylko tu, każde wpięcie pyta `useBaysEnabled`
// (decyzja studia zapisana na serwerze, domyślnie wyłączona):
//   - pozycja menu: widgets/Sidebar/menuSections.ts (+ ikona w menuIcons.tsx, flaga w Sidebar.tsx),
//   - trasa /bays: core/router.tsx (widok sam sprawdza ustawienie),
//   - pasek „Na hali": visits/views/VisitDetailView.tsx,
//   - sekcja Ustawienia → Stanowiska: settings/views/SettingsView.tsx.
// Do tego jedna zmiana, wstecznie zgodna: opcjonalne `exact` w EventCreationData
// (calendar/types.ts), żeby formularz rezerwacji nie nadpisywał godzin okienek
// stanowiska. Wycofanie: usunąć folder i te wpięcia (`grep -rn bays src`).

export { useBaysEnabled } from './featureFlag';
export { VisitBayStrip } from './components/VisitBayStrip';
