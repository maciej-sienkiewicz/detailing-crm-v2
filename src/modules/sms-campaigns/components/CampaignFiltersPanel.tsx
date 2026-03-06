import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CampaignFilters, VehicleFilter, ServiceFilter, VehicleBrandOption } from '../types';
import { SmsSelect } from './SmsSelect';

// ─── Styled components ─────────────────────────────────────────────────────────

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FilterSection = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${st.shadowXs};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};
`;

const SectionIcon = styled.span`
  font-size: 16px;
  line-height: 1;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: ${st.fontSm};
  font-weight: 700;
  color: ${st.text};
`;

const SectionSubtitle = styled.p`
  margin: 0 0 0 auto;
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

const SectionBody = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const Tag = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  background: ${st.accentBlueDim};
  border: 1px solid ${st.accentBlue}33;
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 600;
  color: ${st.text};
`;

const TagRemove = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: transparent;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  color: ${st.textMuted};
  cursor: pointer;
  padding: 0;
  transition: all ${st.transition};

  &:hover {
    background: ${st.accentRed}22;
    color: ${st.accentRed};
  }
`;

// Wrapper gives SmsSelect a fixed width so it doesn't stretch to full row width
const SelectWrap = styled.div`
  width: 200px;
  flex-shrink: 0;
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  font-size: ${st.fontXs};
  font-weight: 600;
  background: ${st.bgCard};
  color: ${st.accentBlue};
  border: 1px solid ${st.accentBlue}55;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  height: 38px; /* align with SmsSelect trigger height */

  &:hover:not(:disabled) {
    background: ${st.accentBlueDim};
    border-color: ${st.accentBlue};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const NumberInput = styled.input`
  width: 80px;
  padding: 7px 10px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  text-align: center;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const InlineLabel = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
  line-height: 38px;
`;

const EmptyHint = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  font-style: italic;
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const RadioChip = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  font-size: ${st.fontXs};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  background: ${(p) => (p.$active ? st.accentBlueDim : 'transparent')};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}55` : st.border)};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-color: ${st.accentBlue}44;
  }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filters: CampaignFilters;
  onChange: (filters: CampaignFilters) => void;
  brands: VehicleBrandOption[];
  availableServices: ServiceFilter[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CampaignFiltersPanel: React.FC<Props> = ({
  filters,
  onChange,
  brands,
  availableServices,
}) => {
  const [pendingBrand, setPendingBrand] = useState('');
  const [pendingModel, setPendingModel] = useState('');
  const [pendingService, setPendingService] = useState('');
  const [lastVisitMode, setLastVisitMode] = useState<'none' | 'older' | 'newer'>(
    filters.lastVisit?.olderThanDays !== undefined
      ? 'older'
      : filters.lastVisit?.newerThanDays !== undefined
      ? 'newer'
      : 'none'
  );

  // ── Brand / model options ──

  const brandOptions = useMemo(
    () => brands.map((b) => ({ value: b.brand, label: b.brand })),
    [brands]
  );

  const modelOptions = useMemo(() => {
    const models = brands.find((b) => b.brand === pendingBrand)?.models ?? [];
    return models.map((m) => ({ value: m, label: m }));
  }, [brands, pendingBrand]);

  // ── Service options (exclude already-added) ──

  const serviceOptions = useMemo(
    () =>
      availableServices
        .filter((s) => !filters.services.some((f) => f.serviceId === s.serviceId))
        .map((s) => ({ value: s.serviceId, label: s.serviceName })),
    [availableServices, filters.services]
  );

  // ── Vehicles ──

  const addVehicle = () => {
    if (!pendingBrand) return;
    const already = filters.vehicles.some(
      (v) => v.brand === pendingBrand && v.model === (pendingModel || undefined)
    );
    if (already) return;
    const vf: VehicleFilter = {
      brand: pendingBrand,
      ...(pendingModel ? { model: pendingModel } : {}),
    };
    onChange({ ...filters, vehicles: [...filters.vehicles, vf] });
    setPendingBrand('');
    setPendingModel('');
  };

  const removeVehicle = (idx: number) => {
    onChange({ ...filters, vehicles: filters.vehicles.filter((_, i) => i !== idx) });
  };

  // ── Services ──

  const addService = () => {
    if (!pendingService) return;
    const svc = availableServices.find((s) => s.serviceId === pendingService);
    if (!svc) return;
    onChange({ ...filters, services: [...filters.services, svc] });
    setPendingService('');
  };

  const removeService = (serviceId: string) => {
    onChange({ ...filters, services: filters.services.filter((s) => s.serviceId !== serviceId) });
  };

  // ── Last visit ──

  const setOlderThan = (days: number) =>
    onChange({ ...filters, lastVisit: { olderThanDays: days } });
  const setNewerThan = (days: number) =>
    onChange({ ...filters, lastVisit: { newerThanDays: days } });

  const handleLastVisitMode = (mode: 'none' | 'older' | 'newer') => {
    setLastVisitMode(mode);
    if (mode === 'none') onChange({ ...filters, lastVisit: null });
    else if (mode === 'older') setOlderThan(365);
    else setNewerThan(30);
  };

  const olderDays = filters.lastVisit?.olderThanDays ?? 365;
  const newerDays = filters.lastVisit?.newerThanDays ?? 30;

  return (
    <Panel>
      {/* ── Vehicle filter ── */}
      <FilterSection>
        <SectionHeader>
          <SectionIcon>🚗</SectionIcon>
          <SectionTitle>Marka i model pojazdu</SectionTitle>
          <SectionSubtitle>Wybierz markę lub konkretny model</SectionSubtitle>
        </SectionHeader>
        <SectionBody>
          {filters.vehicles.length > 0 && (
            <Row>
              {filters.vehicles.map((v, i) => (
                <Tag key={i}>
                  {v.brand}{v.model ? ` ${v.model}` : ' – wszystkie modele'}
                  <TagRemove onClick={() => removeVehicle(i)} title="Usuń">✕</TagRemove>
                </Tag>
              ))}
            </Row>
          )}
          <Row>
            <SelectWrap>
              <SmsSelect
                value={pendingBrand}
                onChange={(val) => { setPendingBrand(val); setPendingModel(''); }}
                options={brandOptions}
                placeholder="Wybierz markę…"
                nullable
              />
            </SelectWrap>

            {pendingBrand && (
              <SelectWrap>
                <SmsSelect
                  value={pendingModel}
                  onChange={setPendingModel}
                  options={modelOptions}
                  placeholder="Wszystkie modele"
                  nullable
                />
              </SelectWrap>
            )}

            <AddBtn onClick={addVehicle} disabled={!pendingBrand}>
              + Dodaj
            </AddBtn>
          </Row>
          {filters.vehicles.length === 0 && (
            <EmptyHint>Brak filtrów — kampania nie będzie filtrować po marce</EmptyHint>
          )}
        </SectionBody>
      </FilterSection>

      {/* ── Service history filter ── */}
      <FilterSection>
        <SectionHeader>
          <SectionIcon>🔧</SectionIcon>
          <SectionTitle>Historia usług</SectionTitle>
          <SectionSubtitle>Klienci, którzy korzystali z wybranych usług</SectionSubtitle>
        </SectionHeader>
        <SectionBody>
          {filters.services.length > 0 && (
            <Row>
              {filters.services.map((s) => (
                <Tag key={s.serviceId}>
                  {s.serviceName}
                  <TagRemove onClick={() => removeService(s.serviceId)} title="Usuń">✕</TagRemove>
                </Tag>
              ))}
            </Row>
          )}
          <Row>
            <SelectWrap style={{ width: 240 }}>
              <SmsSelect
                value={pendingService}
                onChange={setPendingService}
                options={serviceOptions}
                placeholder="Wybierz usługę…"
                nullable
              />
            </SelectWrap>
            <AddBtn onClick={addService} disabled={!pendingService}>
              + Dodaj
            </AddBtn>
          </Row>
          {filters.services.length === 0 && (
            <EmptyHint>Brak filtrów — kampania nie będzie filtrować po historii usług</EmptyHint>
          )}
        </SectionBody>
      </FilterSection>

      {/* ── Last visit filter ── */}
      <FilterSection>
        <SectionHeader>
          <SectionIcon>📅</SectionIcon>
          <SectionTitle>Data ostatniej wizyty</SectionTitle>
          <SectionSubtitle>Filtruj według aktywności klienta</SectionSubtitle>
        </SectionHeader>
        <SectionBody>
          <RadioGroup>
            <RadioChip $active={lastVisitMode === 'none'} onClick={() => handleLastVisitMode('none')}>
              Bez filtra
            </RadioChip>
            <RadioChip $active={lastVisitMode === 'older'} onClick={() => handleLastVisitMode('older')}>
              Ostatnia wizyta dawniej niż…
            </RadioChip>
            <RadioChip $active={lastVisitMode === 'newer'} onClick={() => handleLastVisitMode('newer')}>
              Ostatnia wizyta w ciągu…
            </RadioChip>
          </RadioGroup>

          {lastVisitMode === 'older' && (
            <Row>
              <InlineLabel>Klienci, którzy nie odwiedzili nas od</InlineLabel>
              <NumberInput
                type="number"
                min={1}
                value={olderDays}
                onChange={(e) => setOlderThan(Math.max(1, Number(e.target.value)))}
              />
              <InlineLabel>dni</InlineLabel>
            </Row>
          )}

          {lastVisitMode === 'newer' && (
            <Row>
              <InlineLabel>Klienci, którzy odwiedzili nas w ciągu ostatnich</InlineLabel>
              <NumberInput
                type="number"
                min={1}
                value={newerDays}
                onChange={(e) => setNewerThan(Math.max(1, Number(e.target.value)))}
              />
              <InlineLabel>dni</InlineLabel>
            </Row>
          )}

          {lastVisitMode === 'none' && (
            <EmptyHint>Brak filtra — obejmuje wszystkich klientów</EmptyHint>
          )}
        </SectionBody>
      </FilterSection>
    </Panel>
  );
};
