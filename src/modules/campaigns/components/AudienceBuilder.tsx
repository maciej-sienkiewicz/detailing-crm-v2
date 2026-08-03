import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { servicesApi } from '@/modules/services/api/servicesApi';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { ServiceMultiSelect } from '@/modules/customers/components/CustomerFilterPanel';
import type { AudienceCriteria, CustomerTypeFilter } from '../types';

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
  if (a.servicesUsedNoneOf.length > 0)
    chips.push(`Nie korzystał z: ${a.servicesUsedNoneOf.map((id) => serviceNames.get(id) ?? 'usługa').join(', ')}`);
  if (a.vehicleBrands.length > 0)
    chips.push(`Marka: ${a.vehicleBrands.map((b) => (b.model ? `${b.brand} ${b.model}` : b.brand)).join(' lub ')}`);
  if (a.vehicleYearMin != null) chips.push(`Rocznik: od ${a.vehicleYearMin}`);
  if (a.vehicleYearMax != null) chips.push(`Rocznik: do ${a.vehicleYearMax}`);
  if (a.customerType === 'COMPANY') chips.push('Tylko firmy');
  if (a.customerType === 'INDIVIDUAL') chips.push('Tylko klienci indywidualni');
  if (a.excludeCustomerIds.length > 0) chips.push(`Wykluczono ręcznie: ${a.excludeCustomerIds.length}`);
  if (a.includeCustomerIds.length > 0) chips.push(`Dopisano ręcznie: ${a.includeCustomerIds.length}`);
  return chips;
}

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 600;
`;

// ─── Sekcje ───────────────────────────────────────────────────────────────────

const Section = styled.div`
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;

  & + & { margin-top: 10px; }
`;

const SectionHead = styled.button<{ $open: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 13px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text};

  svg {
    width: 15px;
    height: 15px;
    stroke-width: 1.75;
    color: ${(p) => p.theme.colors.textMuted};
    transition: transform 180ms ease;
    transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
  }
`;

const ActiveDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0ea5e9;
  margin-left: 8px;
`;

const SectionBody = styled.div`
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FieldRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const FieldLabel = styled.label`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  min-width: 150px;
`;

const NumInput = styled.input`
  width: 110px;
  padding: 8px 12px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const SelectWrap = styled.div`
  width: 180px;
  flex-shrink: 0;
`;

const RemovableChip = styled(Chip)`
  cursor: pointer;
  &::after { content: '×'; margin-left: 6px; font-weight: 700; }
`;

const AddBtn = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 9999px;
  background: #0ea5e9;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 180ms ease;

  &:hover { background: #0284c7; transform: translateY(-1px); }
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

const num = (v: string): number | null => (v === '' ? null : Number(v));

export function AudienceBuilder({ value, onChange }: AudienceBuilderProps) {
  const [open, setOpen] = useState<SectionId | null>(null);
  const [brandDraft, setBrandDraft] = useState('');
  const [modelDraft, setModelDraft] = useState('');

  const handleBrandChange = (brand: string) => {
    setBrandDraft(brand);
    setModelDraft('');
  };

  const set = (patch: Partial<AudienceCriteria>) => onChange({ ...value, ...patch });
  const toggle = (id: SectionId) => setOpen(open === id ? null : id);

  const sectionActive: Record<SectionId, boolean> = {
    visits:
      value.visitCountMin != null || value.visitCountMax != null ||
      value.lastVisitOlderThanDays != null || value.lastVisitNewerThanDays != null,
    revenue: value.revenueTotalGrossMin != null || value.revenueTotalGrossMax != null,
    services: value.servicesUsedAnyOf.length > 0 || value.servicesUsedNoneOf.length > 0,
    vehicles: value.vehicleBrands.length > 0 || value.vehicleYearMin != null || value.vehicleYearMax != null,
    customer: value.customerType !== 'ALL',
  };

  return (
    <div>
      {/* ── Wizyty ── */}
      <Section>
        <SectionHead $open={open === 'visits'} onClick={() => toggle('visits')}>
          <span>Wizyty {sectionActive.visits && <ActiveDot />}</span>
          <ChevronDown />
        </SectionHead>
        {open === 'visits' && (
          <SectionBody>
            <FieldRow>
              <FieldLabel>Liczba wizyt (od–do)</FieldLabel>
              <NumInput type="number" min={0} placeholder="od" value={value.visitCountMin ?? ''}
                onChange={(e) => set({ visitCountMin: num(e.target.value) })} />
              <NumInput type="number" min={0} placeholder="do" value={value.visitCountMax ?? ''}
                onChange={(e) => set({ visitCountMax: num(e.target.value) })} />
            </FieldRow>
            <FieldRow>
              <FieldLabel>Ostatnia wizyta ponad</FieldLabel>
              <NumInput type="number" min={1} placeholder="np. 180" value={value.lastVisitOlderThanDays ?? ''}
                onChange={(e) => set({ lastVisitOlderThanDays: num(e.target.value) })} />
              <FieldLabel as="span">dni temu</FieldLabel>
            </FieldRow>
            <FieldRow>
              <FieldLabel>Ostatnia wizyta w ciągu</FieldLabel>
              <NumInput type="number" min={1} placeholder="np. 30" value={value.lastVisitNewerThanDays ?? ''}
                onChange={(e) => set({ lastVisitNewerThanDays: num(e.target.value) })} />
              <FieldLabel as="span">dni</FieldLabel>
            </FieldRow>
          </SectionBody>
        )}
      </Section>

      {/* ── Przychody ── */}
      <Section>
        <SectionHead $open={open === 'revenue'} onClick={() => toggle('revenue')}>
          <span>Wydatki klienta {sectionActive.revenue && <ActiveDot />}</span>
          <ChevronDown />
        </SectionHead>
        {open === 'revenue' && (
          <SectionBody>
            <FieldRow>
              <FieldLabel>Łączne wydatki brutto (zł)</FieldLabel>
              <NumInput type="number" min={0} placeholder="od"
                value={value.revenueTotalGrossMin != null ? value.revenueTotalGrossMin / 100 : ''}
                onChange={(e) => set({ revenueTotalGrossMin: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} />
              <NumInput type="number" min={0} placeholder="do"
                value={value.revenueTotalGrossMax != null ? value.revenueTotalGrossMax / 100 : ''}
                onChange={(e) => set({ revenueTotalGrossMax: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} />
            </FieldRow>
          </SectionBody>
        )}
      </Section>

      {/* ── Usługi ── */}
      <Section>
        <SectionHead $open={open === 'services'} onClick={() => toggle('services')}>
          <span>Usługi {sectionActive.services && <ActiveDot />}</span>
          <ChevronDown />
        </SectionHead>
        {open === 'services' && (
          <SectionBody>
            <FieldRow>
              <FieldLabel>Korzystał z usługi</FieldLabel>
              <SelectWrap style={{ width: 260 }}>
                <ServiceMultiSelect
                  selectedIds={value.servicesUsedAnyOf}
                  onChange={(ids) => set({ servicesUsedAnyOf: ids })}
                />
              </SelectWrap>
            </FieldRow>
            <FieldRow>
              <FieldLabel>Ostatnie wykonanie ponad</FieldLabel>
              <NumInput type="number" min={1} placeholder="np. 180" value={value.serviceLastUsedOlderThanDays ?? ''}
                onChange={(e) => set({ serviceLastUsedOlderThanDays: num(e.target.value) })} />
              <FieldLabel as="span">dni temu</FieldLabel>
            </FieldRow>
            <FieldRow>
              <FieldLabel>Nigdy nie korzystał z</FieldLabel>
              <SelectWrap style={{ width: 260 }}>
                <ServiceMultiSelect
                  selectedIds={value.servicesUsedNoneOf}
                  onChange={(ids) => set({ servicesUsedNoneOf: ids })}
                />
              </SelectWrap>
            </FieldRow>
          </SectionBody>
        )}
      </Section>

      {/* ── Pojazdy ── */}
      <Section>
        <SectionHead $open={open === 'vehicles'} onClick={() => toggle('vehicles')}>
          <span>Pojazdy {sectionActive.vehicles && <ActiveDot />}</span>
          <ChevronDown />
        </SectionHead>
        {open === 'vehicles' && (
          <SectionBody>
            <FieldRow>
              <FieldLabel>Marka / model</FieldLabel>
              <SelectWrap>
                <BrandSelect value={brandDraft} onChange={handleBrandChange} placeholder="Wybierz markę" />
              </SelectWrap>
              <SelectWrap>
                <ModelSelect brand={brandDraft} value={modelDraft} onChange={setModelDraft} placeholder="Model (opcjonalnie)" />
              </SelectWrap>
              <AddBtn type="button" onClick={() => {
                if (!brandDraft.trim()) return;
                set({
                  vehicleBrands: [...value.vehicleBrands, { brand: brandDraft.trim(), model: modelDraft.trim() || null }],
                });
                setBrandDraft('');
                setModelDraft('');
              }}>
                Dodaj
              </AddBtn>
            </FieldRow>
            {value.vehicleBrands.length > 0 && (
              <ChipRow>
                {value.vehicleBrands.map((b, i) => (
                  <RemovableChip key={`${b.brand}-${i}`}
                    onClick={() => set({ vehicleBrands: value.vehicleBrands.filter((_, idx) => idx !== i) })}>
                    {b.model ? `${b.brand} ${b.model}` : b.brand}
                  </RemovableChip>
                ))}
              </ChipRow>
            )}
            <FieldRow>
              <FieldLabel>Rocznik (od–do)</FieldLabel>
              <NumInput type="number" placeholder="od" value={value.vehicleYearMin ?? ''}
                onChange={(e) => set({ vehicleYearMin: num(e.target.value) })} />
              <NumInput type="number" placeholder="do" value={value.vehicleYearMax ?? ''}
                onChange={(e) => set({ vehicleYearMax: num(e.target.value) })} />
            </FieldRow>
          </SectionBody>
        )}
      </Section>

      {/* ── Klient ── */}
      <Section>
        <SectionHead $open={open === 'customer'} onClick={() => toggle('customer')}>
          <span>Typ klienta {sectionActive.customer && <ActiveDot />}</span>
          <ChevronDown />
        </SectionHead>
        {open === 'customer' && (
          <SectionBody>
            <FieldRow>
              <FieldLabel>Pokaż</FieldLabel>
              <Select value={value.customerType}
                onChange={(e) => set({ customerType: e.target.value as CustomerTypeFilter })}>
                <option value="ALL">Wszystkich klientów</option>
                <option value="INDIVIDUAL">Tylko indywidualnych</option>
                <option value="COMPANY">Tylko firmy</option>
              </Select>
            </FieldRow>
          </SectionBody>
        )}
      </Section>
    </div>
  );
}
