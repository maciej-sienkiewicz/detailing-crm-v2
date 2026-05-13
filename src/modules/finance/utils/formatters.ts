/** Formats grosze (integer cents) to PLN string: 10000 → "100,00 zł" */
export const formatMoney = (grosz: number, currency = 'PLN'): string => {
  const amount = grosz / 100;
  return new Intl.NumberFormat('pl-PL', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/** Formats grosze to plain decimal without currency symbol: 10000 → "100,00" */
export const formatMoneyCompact = (grosz: number): string => {
  const amount = grosz / 100;
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/** Formats a PLN float from KSeF (not in grosze): 2000.0 → "2 000,00 zł" */
export const formatMoneyFloat = (amount: number | null | undefined, currency = 'PLN'): string => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('pl-PL', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/** Formats a PLN float without currency symbol: 2000.0 → "2 000,00" */
export const formatMoneyFloatCompact = (amount: number | null | undefined): string => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pl-PL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  }).format(new Date(dateStr));
};

export const groszToInputValue = (grosz: number): string => (grosz / 100).toFixed(2);

export const inputValueToGrosze = (value: string): number => {
  const parsed = parseFloat(value.replace(',', '.'));
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
};
