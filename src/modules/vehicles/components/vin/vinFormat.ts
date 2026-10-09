// src/modules/vehicles/components/vin/vinFormat.ts

export const VIN_MAX_LENGTH = 17;

/**
 * VIN tak, jak zapisze go serwer (`Vin.normalize`): wielkie litery, bez spacji
 * i myślników. Bez odrzucania niedozwolonych znaków - błąd pokaże zapis.
 */
export const cleanVin = (raw: string): string =>
    raw.replace(/[\s-]/g, '').toUpperCase().slice(0, VIN_MAX_LENGTH);
