// src/modules/pin-switcher/roleLabel.ts
//
// Etykieta osoby w panelu przełączania użytkownika: rola, którą studio jej nadało
// („Recepcja", „Detailer"), a nie sam rodzaj konta. „Pracownik" zostaje tylko dla
// konta bez przypisanej roli.

export const profileRoleLabel = (profile: { isOwner: boolean; roleName?: string | null }): string =>
    profile.isOwner ? 'Właściciel' : profile.roleName?.trim() || 'Pracownik';
