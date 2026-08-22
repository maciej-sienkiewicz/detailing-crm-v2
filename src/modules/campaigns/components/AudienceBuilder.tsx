// src/modules/campaigns/components/AudienceBuilder.tsx
// Kryteria odbiorców — pięć sekcji, jeden wzór pola.
//
// Wcześniej każde pole wyglądało inaczej: liczba wizyt to były dwa gołe inputy
// obok siebie, dni — input i luźny wyraz „dni temu" wiszący z boku, pieniądze —
// input bez waluty, typ klienta zwykły <select> innej wysokości niż reszta.
// Każdy wiersz trzeba było odczytać osobno, bo żaden nie wyglądał jak poprzedni.
// Teraz wszystko stoi na jednym zestawie klocków (NumberField, RangeField,
// FilterSelect): ta sama ramka, ta sama wysokość, ta sama reakcja na fokus,
// a jednostka („dni", „zł") siedzi wewnątrz pola, nie obok niego.
//
// Druga zmiana jest o pamięci, nie o urodzie: sekcje zwijały się nawzajem
// (otwarcie jednej zamykało poprzednią), a złożony filtr buduje się z kilku
// naraz — nie dało się zobaczyć dwóch warunków jednocześnie. Teraz otwiera się
// ich dowolnie wiele, a zwinięta sekcja pokazuje w nagłówku, co w niej ustawiono,
// więc stanu filtra nie trzeba trzymać w głowie.
import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { servicesApi } from '@/modules/services/api/servicesApi';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { ServiceMultiSelect } from '@/modules/customers/components/CustomerFilterPanel';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import {
  Chip,
  ChipRow,
  FilterGrid,
  FilterLabel,
  FilterRow,
  FilterSelect,
  IconButton,
  NumberField,
  RangeField,
} from './shared';
import type { AudienceCriteria, CustomerTypeFilter } from '../types';

// Chip kryterium ma jedną definicję na cały moduł — tu tylko przechodzi dalej,
// żeby kreator i okno kampanii nie musiały wiedzieć, skąd go brać.
export { Chip, ChipRow };

// ─── Chipy filtrów w ludzkim języku (jedna reprezentacja w całym module) ──────

export function audienceChips(a: AudienceCriteria, serviceNames: Map<string, string>): string[] {
  const chips: string[] = [];
  if (a.visitCountMin != null) chips.push(`Wizyty: co najmniej ${a.visitCountMin}`);
  if (a.visitCountMax != null) chips.push(`Wizyty: najwyżej ${a.visitCountMax}`);
  if (a.lastVisitOlderThanDays != null) chips.push(`Ostatnia wizyta: ponad ${a.lastVisitOlderThanDays} dni temu`);
  if (a.lastVisitNewerThanDays != null) chips.push(`Ostatnia wizyta: w ciągu ${a.lastVisitNewerThanDays} dni`);
  if (a.revenueTotalGrossMin != null) chips.push(`Wydatki: od ${(a.revenueTotalGrossMin / 100).toLocaleString('pl-PL')} zł`);
  if (a.revenueTotalGrossMax != null) chips.push(`Wydatki: do ${(a.revenueTotalGrossMax / 100).toLocaleString('pl-PL')} zł`);
  if (a.servicesUsedAnyOf.length > 0)
    chips.push(`Korzystał z: ${a.servicesUsedAnyOf.map((id) => serviceNames.get(id) ?? 'usługa').join(' lub ')}`);
  if (a.serviceLastUsedOlderThanDays != null)
    chips.push(`Ostatnie wykonanie: ponad ${a.serviceLastUsedOlderThanDays} dni temu`);
  if (a.servicesUsedNoneOf.length > 0)
    chips.push(`Nie korzystał z: ${a.servicesUsedNoneOf.map((id) => serviceNames.get(id) ?? 'usługa').join(', ')}`);
  if (a.vehicleBrands.length > 0)
    chips.push(`Marka: ${a.vehicleBrands.map((b) => (b.model ? `${b.brand} ${b.model}` : b.brand)).join(' lub ')}`);
  if (a.vehicleYearMin != null) chips.push(`Rocznik: od ${a.vehicleYearMin}`);
  if (a.vehicleYearMax != null) chips.push(`Rocznik: do ${a.vehicleYearMax}`);
  if (a.includeUnnamedCustomers) chips.push('Także klienci bez nazwiska');
  if (a.customerType === 'COMPANY') chips.push('Tylko firmy');
  if (a.customerType === 'INDIVIDUAL') chips.push('Tylko klienci indywidualni');
  if (a.excludeCustomerIds.length > 0) chips.push(`Odznaczono ręcznie: ${a.excludeCustomerIds.length}`);
  if (a.includeCustomerIds.length > 0) chips.push(`Dopisano ręcznie: ${a.includeCustomerIds.length}`);
  return chips;
}

// ─── Sekcja ───────────────────────────────────────────────────────────────────

/**
 * Sekcja jako wiersz listy, nie jako osobna karta.
 *
 * Pięć białych kart w białym panelu to biel na bieli i pięć ramek rysujących
 * granice tam, gdzie nic się nie kończy. Wiersze rozdzielone włoskową kreską
 * czytają się jako jedna lista kryteriów — czyli jako to, czym są.
 */
const Section = styled.div`
  & + & { border-top: 1px solid ${(p) => p.theme.colors.surfaceAlt}; }
`;

const SectionHead = styled.button<{ $open: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  /* Ujemny margines wchodzi w wyściółkę panelu, żeby podświetlenie pod kursorem
     sięgało jego krawędzi — wiersz listy, a nie prostokąt pływający w środku. */
  padding: 11px 16px;
  margin: 0 -16px;
  width: calc(100% + 32px);
  font-family: inherit;
  text-align: left;

  .name {
    font-size: 13.5px;
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
    white-space: nowrap;
  }

  /*
   * Streszczenie zwiniętej sekcji. Wcześniej stała tu sama kropka — mówiła
   * „coś tu jest", ale nie „co", więc sprawdzenie własnego filtra wymagało
   * rozwinięcia pięciu sekcji po kolei.
   */
  .summary {
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    color: ${(p) => p.theme.colors.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    flex: 1;
    font-size: 12.5px;
    color: ${(p) => p.theme.colors.textMuted};
  }

  svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: ${(p) => p.theme.colors.textMuted};
    transition: transform ${(p) => p.theme.transitions.normal};
    transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
  }

  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

/** Kropka „ta sekcja zawęża listę" — jedyny kolor w panelu i jedyny, który coś znaczy. */
const ActiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(p) => p.theme.colors.primary};
`;

const SectionBody = styled.div`
  padding: 2px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

/**
 * Wyjaśnienie logiki wyboru. Zdanie, nie plakietka: „LUB, nie I" jest ostrzeżeniem
 * przed cichym nieporozumieniem, które kosztuje wysyłkę do złej grupy.
 */
const LogicHint = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: ${(p) => p.theme.radii.md};
  background: ${(p) => p.theme.colors.surfaceAlt};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 12px;
  line-height: 1.45;

  strong {
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
  }
`;

const BrandRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;

  @media (max-width: 599px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const RemovableChip = styled(Chip)`
  cursor: pointer;
  transition: all ${(p) => p.theme.transitions.fast};

  &::after { content: '×'; margin-left: 6px; font-weight: 700; }
  &:hover {
    border-color: ${(p) => p.theme.colors.error};
    color: ${(p) => p.theme.colors.error};
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface AudienceBuilderProps {
  value: AudienceCriteria;
  onChange: (next: AudienceCriteria) => void;
}

type SectionId = 'visits' | 'revenue' | 'services' | 'vehicles' | 'customer';

export function useServiceCatalog() {
  const { data } = useQuery({
    queryKey: ['campaigns', 'service-catalog'],
    queryFn: () => servicesApi.getServices({ search: '', page: 1, limit: 200 }),
  });
  const services = data?.services ?? [];
  const names = new Map(services.map((s) => [s.id, s.name]));
  return { services, serviceNames: names };
}

const zloty = (grosze: number | null | undefined): number | null =>
  grosze == null ? null : Math.round(grosze / 100);

export function AudienceBuilder({ value, onChange }: AudienceBuilderProps) {
  // Zbiór, nie pojedyncza wartość: złożony filtr buduje się z kilku sekcji naraz.
  const [open, setOpen] = useState<Set<SectionId>>(new Set());
  const [brandDraft, setBrandDraft] = useState('');
  const [modelDraft, setModelDraft] = useState('');

  const set = (patch: Partial<AudienceCriteria>) => onChange({ ...value, ...patch });
  const toggle = (id: SectionId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /** To samo zdanie, którym filtr opisany jest w podsumowaniu kampanii. */
  const summaries: Record<SectionId, string[]> = {
    visits: [
      value.visitCountMin != null ? `od ${value.visitCountMin} wizyt` : null,
      value.visitCountMax != null ? `do ${value.visitCountMax} wizyt` : null,
      value.lastVisitOlderThanDays != null ? `ostatnia ponad ${value.lastVisitOlderThanDays} dni temu` : null,
      value.lastVisitNewerThanDays != null ? `ostatnia w ciągu ${value.lastVisitNewerThanDays} dni` : null,
    ].filter((x): x is string => x !== null),
    revenue: [
      value.revenueTotalGrossMin != null ? `od ${zloty(value.revenueTotalGrossMin)!.toLocaleString('pl-PL')} zł` : null,
      value.revenueTotalGrossMax != null ? `do ${zloty(value.revenueTotalGrossMax)!.toLocaleString('pl-PL')} zł` : null,
    ].filter((x): x is string => x !== null),
    services: [
      value.servicesUsedAnyOf.length > 0 ? `korzystał z ${value.servicesUsedAnyOf.length}` : null,
      value.serviceLastUsedOlderThanDays != null ? `ostatnio ponad ${value.serviceLastUsedOlderThanDays} dni temu` : null,
      value.servicesUsedNoneOf.length > 0 ? `nie korzystał z ${value.servicesUsedNoneOf.length}` : null,
    ].filter((x): x is string => x !== null),
    vehicles: [
      value.vehicleBrands.length > 0
        ? value.vehicleBrands.map((b) => (b.model ? `${b.brand} ${b.model}` : b.brand)).join(', ')
        : null,
      value.vehicleYearMin != null ? `od ${value.vehicleYearMin}` : null,
      value.vehicleYearMax != null ? `do ${value.vehicleYearMax}` : null,
    ].filter((x): x is string => x !== null),
    customer: value.customerType === 'COMPANY'
      ? ['tylko firmy']
      : value.customerType === 'INDIVIDUAL'
        ? ['tylko indywidualni']
        : [],
  };

  const section = (id: SectionId, name: string, hint: string, body: React.ReactNode) => {
    const active = summaries[id].length > 0;
    const isOpen = open.has(id);
    return (
      <Section>
        <SectionHead
          type="button"
          $open={isOpen}
          aria-expanded={isOpen}
          onClick={() => toggle(id)}
        >
          {active && <ActiveDot />}
          <span className="name">{name}</span>
          {active ? (
            <span className="summary" title={summaries[id].join(' · ')}>
              {summaries[id].join(' · ')}
            </span>
          ) : (
            <span className="empty">{hint}</span>
          )}
          <ChevronDown />
        </SectionHead>
        {isOpen && <SectionBody>{body}</SectionBody>}
      </Section>
    );
  };

  return (
    <div>
      {section('visits', 'Wizyty', 'bez ograniczeń', (
        <FilterGrid>
          <FilterRow>
            <FilterLabel>Liczba wizyt</FilterLabel>
            <RangeField
              from={value.visitCountMin ?? null}
              to={value.visitCountMax ?? null}
              min={0}
              unit="wizyt"
              onChange={({ from, to }) => set({ visitCountMin: from, visitCountMax: to })}
            />
          </FilterRow>
          <FilterRow>
            <FilterLabel>
              Ostatnia wizyta dawniej niż
              <InfoTooltip text="Klienci, którzy nie byli w studiu dłużej niż podana liczba dni. Typowy filtr kampanii przypominającej." />
            </FilterLabel>
            <NumberField
              value={value.lastVisitOlderThanDays ?? null}
              min={1}
              unit="dni temu"
              placeholder="np. 180"
              ariaLabel="Ostatnia wizyta dawniej niż (dni)"
              onChange={(next) => set({ lastVisitOlderThanDays: next })}
            />
          </FilterRow>
          <FilterRow>
            <FilterLabel>
              Ostatnia wizyta w ciągu
              <InfoTooltip text="Klienci, którzy byli w studiu w podanym okresie. Przydatne, gdy kampania ma trafić tylko do świeżych klientów." />
            </FilterLabel>
            <NumberField
              value={value.lastVisitNewerThanDays ?? null}
              min={1}
              unit="dni"
              placeholder="np. 30"
              ariaLabel="Ostatnia wizyta w ciągu (dni)"
              onChange={(next) => set({ lastVisitNewerThanDays: next })}
            />
          </FilterRow>
        </FilterGrid>
      ))}

      {section('revenue', 'Wydatki klienta', 'bez ograniczeń', (
        <FilterGrid>
          <FilterRow>
            <FilterLabel>
              Łącznie wydał
              <InfoTooltip text="Suma brutto wszystkich zakończonych wizyt tego klienta." />
            </FilterLabel>
            <RangeField
              from={zloty(value.revenueTotalGrossMin)}
              to={zloty(value.revenueTotalGrossMax)}
              min={0}
              unit="zł"
              onChange={({ from, to }) =>
                set({
                  revenueTotalGrossMin: from == null ? null : Math.round(from * 100),
                  revenueTotalGrossMax: to == null ? null : Math.round(to * 100),
                })
              }
            />
          </FilterRow>
        </FilterGrid>
      ))}

      {section('services', 'Usługi', 'wszystkie', (
        <>
          <FilterGrid>
            <FilterRow>
              <FilterLabel>
                Korzystał z usługi
                <InfoTooltip text="Klient musi mieć w historii co najmniej jedną wizytę z tą usługą. Przy kilku usługach wystarczy jedna z nich (logika LUB)." />
              </FilterLabel>
              <ServiceMultiSelect
                selectedIds={value.servicesUsedAnyOf}
                onChange={(ids) => set({ servicesUsedAnyOf: ids })}
              />
            </FilterRow>
            <FilterRow>
              <FilterLabel>
                Ostatnie wykonanie dawniej niż
                <InfoTooltip text="Dotyczy usług wybranych obok. Filtruje klientów, u których dana usługa była ostatnio wykonana dawniej niż podana liczba dni temu." />
              </FilterLabel>
              <NumberField
                value={value.serviceLastUsedOlderThanDays ?? null}
                min={1}
                unit="dni temu"
                placeholder="np. 180"
                ariaLabel="Ostatnie wykonanie dawniej niż (dni)"
                onChange={(next) => set({ serviceLastUsedOlderThanDays: next })}
              />
            </FilterRow>
          </FilterGrid>
          {value.servicesUsedAnyOf.length > 1 && (
            <LogicHint>
              Wystarczy, że klient miał <strong>dowolną</strong> z wybranych usług — nie wszystkie.
            </LogicHint>
          )}

          <FilterGrid>
            <FilterRow>
              <FilterLabel>
                Nigdy nie korzystał z
                <InfoTooltip text="Wyklucza klientów, którzy mieli w historii którąkolwiek z wybranych usług (logika LUB)." />
              </FilterLabel>
              <ServiceMultiSelect
                selectedIds={value.servicesUsedNoneOf}
                onChange={(ids) => set({ servicesUsedNoneOf: ids })}
              />
            </FilterRow>
          </FilterGrid>
          {value.servicesUsedNoneOf.length > 1 && (
            <LogicHint>
              Klient wypadnie z listy, jeśli miał <strong>którąkolwiek</strong> z wybranych usług.
            </LogicHint>
          )}
        </>
      ))}

      {section('vehicles', 'Pojazdy', 'wszystkie', (
        <>
          <FilterRow>
            <FilterLabel>Marka i model</FilterLabel>
            <BrandRow>
              <BrandSelect
                value={brandDraft}
                onChange={(brand) => { setBrandDraft(brand); setModelDraft(''); }}
                placeholder="Wybierz markę"
              />
              <ModelSelect
                brand={brandDraft}
                value={modelDraft}
                onChange={setModelDraft}
                placeholder="Model (opcjonalnie)"
              />
              <IconButton
                type="button"
                disabled={!brandDraft.trim()}
                onClick={() => {
                  if (!brandDraft.trim()) return;
                  set({
                    vehicleBrands: [
                      ...value.vehicleBrands,
                      { brand: brandDraft.trim(), model: modelDraft.trim() || null },
                    ],
                  });
                  setBrandDraft('');
                  setModelDraft('');
                }}
              >
                Dodaj
              </IconButton>
            </BrandRow>
          </FilterRow>

          {value.vehicleBrands.length > 0 && (
            <ChipRow>
              {value.vehicleBrands.map((b, i) => (
                <RemovableChip
                  key={`${b.brand}-${b.model ?? ''}-${i}`}
                  title="Kliknij, żeby usunąć"
                  onClick={() => set({ vehicleBrands: value.vehicleBrands.filter((_, idx) => idx !== i) })}
                >
                  {b.model ? `${b.brand} ${b.model}` : b.brand}
                </RemovableChip>
              ))}
            </ChipRow>
          )}
          {value.vehicleBrands.length > 1 && (
            <LogicHint>
              Kampania trafi do klientów z <strong>dowolnym</strong> z powyższych pojazdów.
            </LogicHint>
          )}

          <FilterGrid>
            <FilterRow>
              <FilterLabel>Rocznik</FilterLabel>
              <RangeField
                from={value.vehicleYearMin ?? null}
                to={value.vehicleYearMax ?? null}
                min={1900}
                onChange={({ from, to }) => set({ vehicleYearMin: from, vehicleYearMax: to })}
              />
            </FilterRow>
          </FilterGrid>
        </>
      ))}

      {section('customer', 'Typ klienta', 'wszyscy', (
        <FilterGrid>
          <FilterRow>
            <FilterLabel>Pokaż</FilterLabel>
            <FilterSelect
              value={value.customerType}
              onChange={(e) => set({ customerType: e.target.value as CustomerTypeFilter })}
            >
              <option value="ALL">Wszystkich klientów</option>
              <option value="INDIVIDUAL">Tylko indywidualnych</option>
              <option value="COMPANY">Tylko firmy</option>
            </FilterSelect>
          </FilterRow>
        </FilterGrid>
      ))}
    </div>
  );
}
