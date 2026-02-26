export const formatMoney = (grosz: number, currency = 'PLN'): string => {
  const amount = grosz / 100;
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatMoneyCompact = (grosz: number): string => {
  const amount = grosz / 100;
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(dateStr)
  );
};

export const groszToInputValue = (grosz: number): string => {
  return (grosz / 100).toFixed(2);
};

export const inputValueToGrosze = (value: string): number => {
  const parsed = parseFloat(value.replace(',', '.'));
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
};
