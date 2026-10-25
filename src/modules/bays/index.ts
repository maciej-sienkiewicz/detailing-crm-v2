// src/modules/bays - stanowiska (za przełącznikiem wersji i ustawieniem studia).
//
// Poza tym folderem stanowiska istnieją tylko tu, każde wpięcie za przełącznikiem
// (`isBaysAvailable` - wersja aplikacji, `useBaysEnabled` - decyzja studia):
//   - pozycja menu: widgets/Sidebar/menuSections.ts (+ ikona w menuIcons.tsx, flaga w Sidebar.tsx),
//   - trasa /bays: core/router.tsx,
//   - pasek „Na hali": visits/views/VisitDetailView.tsx,
//   - sekcja Ustawienia → Stanowiska: settings/views/SettingsView.tsx.
// Do tego jedna zmiana poza przełącznikiem, wstecznie zgodna: opcjonalne `exact` w
// EventCreationData (calendar/types.ts), żeby formularz rezerwacji nie nadpisywał
// godzin okienek stanowiska. Wycofanie: usunąć folder i te wpięcia (`grep -rn bays src`).

export { isBaysAvailable, useBaysEnabled } from './featureFlag';
export { VisitBayStrip } from './components/VisitBayStrip';
