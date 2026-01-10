export interface TranslationKeys {
    common: {
        loading: string;
        error: string;
        retry: string;
        cancel: string;
        save: string;
        delete: string;
        edit: string;
        add: string;
        search: string;
        noResults: string;
        showing: string;
        of: string;
        page: string;
        previous: string;
        next: string;
        yes: string;
        no: string;
        confirm: string;
        close: string;
        backToList: string;
    };
    customers: {
        title: string;
        subtitle: string;
        addCustomer: string;
        searchPlaceholder: string;
        table: {
            customer: string;
            contact: string;
            company: string;
            lastVisit: string;
            visits: string;
            vehicles: string;
            revenue: string;
            revenueNet: string;
            revenueGross: string;
        };
        empty: {
            title: string;
            description: string;
        };
        emptySearch: {
            title: string;
            description: string;
        };
        error: {
            loadFailed: string;
            createFailed: string;
            updateFailed: string;
            deleteFailed: string;
            detailLoadFailed: string;
        };
        card: {
            vehicles: string;
            lastVisit: string;
            totalVisits: string;
            revenue: string;
        };
        detail: {
            overview: string;
            vehicles: string;
            activity: string;
            settings: string;
            totalRevenue: string;
            totalRevenueGross: string;
            numberOfVisits: string;
            lastVisitDate: string;
            vehiclesCount: string;
            inDatabase: string;
            customerSince: string;
            lastContact: string;
            loyaltyTier: {
                bronze: string;
                silver: string;
                gold: string;
                platinum: string;
            };
            personalInfo: {
                title: string;
                fullName: string;
                email: string;
                phone: string;
                homeAddress: string;
            };
            companyInfo: {
                title: string;
                companyName: string;
                nip: string;
                regon: string;
                companyAddress: string;
            };
            notes: {
                title: string;
            };
            consents: {
                title: string;
                subtitle: string;
                email: string;
                sms: string;
                phone: string;
                postal: string;
                granted: string;
                revoked: string;
                never: string;
            };
            vehicleCard: {
                year: string;
                vin: string;
                licensePlate: string;
                color: string;
                engine: string;
                mileage: string;
                inspection: string;
                service: string;
                status: {
                    active: string;
                    sold: string;
                    archived: string;
                };
                engineType: {
                    gasoline: string;
                    diesel: string;
                    hybrid: string;
                    electric: string;
                };
                noVehicles: string;
            };
            timeline: {
                title: string;
                subtitle: string;
                events: string;
                event: string;
                empty: string;
                visitType: {
                    service: string;
                    repair: string;
                    inspection: string;
                    consultation: string;
                };
                visitStatus: {
                    completed: string;
                    inProgress: string;
                    scheduled: string;
                    cancelled: string;
                };
                commType: {
                    email: string;
                    phone: string;
                    sms: string;
                    meeting: string;
                };
                commDirection: {
                    inbound: string;
                    outbound: string;
                };
                technician: string;
                performedBy: string;
            };
            settingsPlaceholder: string;
        };
        form: {
            title: string;
            personalInfo: string;
            firstName: string;
            firstNamePlaceholder: string;
            lastName: string;
            lastNamePlaceholder: string;
            email: string;
            emailPlaceholder: string;
            phone: string;
            phonePlaceholder: string;
            includeHomeAddress: string;
            homeAddress: {
                title: string;
                street: string;
                streetPlaceholder: string;
                city: string;
                cityPlaceholder: string;
                postalCode: string;
                postalCodePlaceholder: string;
                country: string;
                countryPlaceholder: string;
            };
            includeCompany: string;
            company: {
                title: string;
                name: string;
                namePlaceholder: string;
                nip: string;
                nipPlaceholder: string;
                regon: string;
                regonPlaceholder: string;
                street: string;
                streetPlaceholder: string;
                city: string;
                cityPlaceholder: string;
                postalCode: string;
                postalCodePlaceholder: string;
                country: string;
                countryPlaceholder: string;
            };
            notes: {
                title: string;
                label: string;
                placeholder: string;
            };
            submit: string;
            submitting: string;
        };
        pagination: {
            showing: string;
            of: string;
            customers: string;
        };
        validation: {
            firstNameRequired: string;
            firstNameMin: string;
            firstNameMax: string;
            lastNameRequired: string;
            lastNameMin: string;
            lastNameMax: string;
            emailInvalid: string;
            phoneInvalid: string;
            postalCodeInvalid: string;
            nipInvalid: string;
            regonInvalid: string;
            notesMax: string;
            streetRequired: string;
            cityRequired: string;
            countryRequired: string;
            companyNameMin: string;
        };
    };
}

export type TranslationKey = keyof TranslationKeys;