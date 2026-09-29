// src/modules/finance/components/ExpensePaymentCard.test.tsx
// @vitest-environment jsdom
//
// Karta „Zapłać przelewem" przy fakturze kosztowej:
//  - kod QR to <img> z Data URI z PNG od naszego serwera - żadnego adresu zewnętrznego,
//  - dane do przelewu są widoczne i kopiowalne także wtedy, gdy kodu nie ma,
//  - numer rachunku kopiuje się bez spacji, a niepoprawny jest oznaczony.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { KsefExpenseTransfer } from '../types';

const state = vi.hoisted(() => ({
  transfer: null as KsefExpenseTransfer | null,
  isLoading: false,
  isError: false,
}));

vi.mock('../hooks/useKsef', () => ({
  useKsefExpenseTransfer: () => state,
}));

import { ExpensePaymentCard } from './ExpensePaymentCard';

// 1×1 px PNG - treść obrazka nie ma tu znaczenia, liczy się, skąd pochodzi.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const transfer = (patch: Partial<KsefExpenseTransfer> = {}): KsefExpenseTransfer => ({
  recipientName: 'Hurtownia Chemii Łódź Sp. z o.o.',
  recipientNip: '5260250274',
  accountNumber: '61109010140000071219812874',
  accountNumberValid: true,
  amount: 1900,
  currency: 'PLN',
  title: 'Faktura FV/12/2026',
  qrPngBase64: PNG_BASE64,
  qrUnavailableReason: null,
  ...patch,
});

describe('ExpensePaymentCard', () => {
  const writeText = vi.fn(async () => undefined);

  beforeEach(() => {
    state.transfer = transfer();
    state.isLoading = false;
    state.isError = false;
    writeText.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
  });
  afterEach(cleanup);

  it('kod QR to obrazek z Data URI, a nie adres do zewnętrznego generatora', () => {
    render(<ExpensePaymentCard expenseId="e-1" />);

    const img = screen.getByRole('img', { name: /Kod QR do przelewu/ });
    expect(img.getAttribute('src')).toBe(`data:image/png;base64,${PNG_BASE64}`);
    expect(screen.getByText('Skanuj w aplikacji bankowej')).toBeInTheDocument();
  });

  it('pokazuje dane do przelewu: kwotę z faktury, rachunek w grupach, pełną nazwę i tytuł', () => {
    render(<ExpensePaymentCard expenseId="e-1" />);

    expect(screen.getByText(/^1\s?900,00\s*zł$/)).toBeInTheDocument();
    expect(screen.getByText('61 1090 1014 0000 0712 1981 2874')).toBeInTheDocument();
    expect(screen.getByText('Hurtownia Chemii Łódź Sp. z o.o.')).toBeInTheDocument();
    expect(screen.getByText('NIP 5260250274')).toBeInTheDocument();
    expect(screen.getByText('Faktura FV/12/2026')).toBeInTheDocument();
  });

  it('numer rachunku kopiuje się bez spacji', async () => {
    state.transfer = transfer({ accountNumber: '61 1090 1014 0000 0712 1981 2874' });
    render(<ExpensePaymentCard expenseId="e-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Kopiuj: Numer rachunku' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('61109010140000071219812874'));
    expect(await screen.findByText('Skopiowano')).toBeInTheDocument();
  });

  it('bez kodu (kwota ponad limit ZBP) - powód zamiast obrazka, dane nadal do skopiowania', async () => {
    state.transfer = transfer({
      amount: 12300,
      qrPngBase64: null,
      qrUnavailableReason: 'Kod QR w standardzie banków mieści kwoty do 9 999,99 zł. Ten przelew zleć ręcznie, kopiując dane obok.',
    });
    render(<ExpensePaymentCard expenseId="e-1" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/mieści kwoty do 9 999,99 zł/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kopiuj: Kwota do zapłaty' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('12300,00'));
  });

  it('rachunek z błędną sumą kontrolną jest oznaczony, zanim ktoś zleci na niego przelew', () => {
    state.transfer = transfer({
      accountNumber: '61 1090 1014 0000 0712 1981 2875',
      accountNumberValid: false,
      qrPngBase64: null,
      qrUnavailableReason: 'Numer rachunku z faktury nie jest poprawnym polskim numerem rachunku.',
    });
    render(<ExpensePaymentCard expenseId="e-1" />);

    expect(screen.getByText(/nie przechodzi kontroli sumy/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('schowek niedostępny - przycisk mówi to wprost', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<ExpensePaymentCard expenseId="e-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Kopiuj: Tytuł przelewu' }));
    expect(await screen.findByText('Skopiuj ręcznie')).toBeInTheDocument();
  });
});
