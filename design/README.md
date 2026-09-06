# Szkic: „Skrzynka zapytań" (przeprojektowanie modułu Leady)

Makiety statyczne do decyzji projektowej opisanej w sesji panelu doradczego.
**To nie jest kod aplikacji** — artboardy nie są kompilowane ani importowane
przez `src/`. Służą do oglądania i poprawiania układu, zanim powstanie
implementacja.

## Co tu jest

| Plik | Ekran |
|---|---|
| `Main.dc.html` | Telefon, segment „Twój ruch" — kolejka zaległości |
| `UKlienta.dc.html` | Telefon, segment „U klienta" — cisza i rezerwacje |
| `Szczegoly.dc.html` | Telefon, arkusz szczegółów leada |
| `Tablet.dc.html` | Tablet w hali — kolejka i szczegóły obok siebie |
| `Porownanie.dc.html` | Dzisiejsza tabela vs kolejka, oba w 390 px |
| `canvas.json` | Rozkład artboardów na kanwie + notatki |

## Tokeny

Wartości nie są wymyślone — pochodzą z `src/common/theme/theme.ts`
(kolory, promienie, cienie), `src/common/theme/ThemeProvider.tsx`
(`--brand-primary: #0ea5e9`, stos Inter), `src/modules/comms/types.ts`
(`LEAD_STATUS_COLORS`) i `src/modules/comms/components/shared.ts`
(`FilterChip`, `SurfaceCard`).

## Decyzje, które te ekrany utrwalają

1. **Kolejność to wiek oczekiwania, nie data wpływu.** Dziś backend zwraca
   `ORDER BY l.createdAt DESC` — stos, nie kolejka.
2. **Status nie występuje na liście.** Awans jest skutkiem pracy; ręczna
   zmiana zostaje wyłącznie w arkuszu szczegółów.
3. **Leady bez wątku (telefon, formularz) stoją w kolejce.** Dziś wypadają
   z całego mechanizmu pilności, bo `awaitingReply` wymaga `thread_id`.
4. **Zero gestów.** Jeden przycisk 48×48 przy prawej krawędzi karty.

## Złożenie kanwy

Pliki `.dc.html` są źródłem; gotowa kanwa (`skrzynka-zapytan.html`,
~2,5 MB) jest wykluczona z repozytorium i składana z nich na nowo.
