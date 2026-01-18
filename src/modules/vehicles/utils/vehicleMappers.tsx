export const formatLicensePlate = (plate: string): string => {
    return plate.toUpperCase().replace(/\s+/g, ' ').trim();
};

export const getVehicleDisplayName = (vehicle: {
    brand: string;
    model: string;
    yearOfProduction: number;
}): string => {
    return `${vehicle.brand} ${vehicle.model} (${vehicle.yearOfProduction})`;
};

export const getVehicleShortName = (vehicle: {
    brand: string;
    model: string;
}): string => {
    return `${vehicle.brand} ${vehicle.model}`;
};