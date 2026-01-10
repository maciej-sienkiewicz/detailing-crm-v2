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
        };
        card: {
            vehicles: string;
            lastVisit: string;
            totalVisits: string;
            revenue: string;
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