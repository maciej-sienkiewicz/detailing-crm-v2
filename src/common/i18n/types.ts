// src/common/i18n/types.ts
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
        createdBy: string;
        updatedBy: string;
    };
    auth: {
        login: {
            title: string;
            subtitle: string;
            emailLabel: string;
            emailPlaceholder: string;
            passwordLabel: string;
            passwordPlaceholder: string;
            rememberMe: string;
            forgotPassword: string;
            submitButton: string;
            submitting: string;
            noAccount: string;
            signupLink: string;
        };
        signup: {
            title: string;
            subtitle: string;
            firstNameLabel: string;
            firstNamePlaceholder: string;
            lastNameLabel: string;
            lastNamePlaceholder: string;
            emailLabel: string;
            emailPlaceholder: string;
            passwordLabel: string;
            passwordPlaceholder: string;
            confirmPasswordLabel: string;
            confirmPasswordPlaceholder: string;
            acceptTerms: string;
            termsLink: string;
            and: string;
            privacyLink: string;
            submitButton: string;
            submitting: string;
            hasAccount: string;
            loginLink: string;
            passwordStrength: {
                weak: string;
                medium: string;
                strong: string;
            };
        };
        validation: {
            emailRequired: string;
            emailInvalid: string;
            passwordRequired: string;
            passwordMin: string;
            passwordMismatch: string;
            firstNameRequired: string;
            firstNameMin: string;
            lastNameRequired: string;
            lastNameMin: string;
            termsRequired: string;
        };
        errors: {
            invalidCredentials: string;
            accountExists: string;
            serverError: string;
            networkError: string;
        };
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
    appointments: {
        createView: {
            title: string;
            subtitle: string;
            reservationDetails: string;
            appointmentNameLabel: string;
            appointmentNamePlaceholder: string;
            colorLabel: string;
            customerSection: string;
            addOrSearchCustomer: string;
            changeCustomer: string;
            vehicleSection: string;
            selectOrAddVehicle: string;
            changeVehicle: string;
            scheduleSection: string;
            allDayToggle: string;
            date: string;
            startDateTime: string;
            endDate: string;
            submitButton: string;
            submitting: string;
            createError: string;
        };
        customerModal: {
            titleSelect: string;
            titleNew: string;
            searchPlaceholder: string;
            searching: string;
            noResults: string;
            enterSearch: string;
            addNewButton: string;
            backToSearch: string;
            confirmButton: string;
            firstName: string;
            firstNamePlaceholder: string;
            lastName: string;
            lastNamePlaceholder: string;
            phone: string;
            phonePlaceholder: string;
            email: string;
            emailPlaceholder: string;
        };
        vehicleModal: {
            titleSelect: string;
            titleNew: string;
            year: string;
            skip: string;
            addNewButton: string;
            cancelButton: string;
            confirmButton: string;
            brand: string;
            brandPlaceholder: string;
            model: string;
            modelPlaceholder: string;
        };
        invoiceSummary: {
            title: string;
            addService: string;
            searchPlaceholder: string;
            emptyState: string;
            hideDiscount: string;
            applyDiscount: string;
            hideNote: string;
            addNote: string;
            remove: string;
            discountType: string;
            discountValue: string;
            confirm: string;
            noteLabel: string;
            notePlaceholder: string;
            beforeNet: string;
            net: string;
            vat: string;
            beforeGross: string;
            gross: string;
            totalBeforeDiscount: string;
            totalNet: string;
            totalVat: string;
            totalToPay: string;
            discountTypes: {
                percent: string;
                fixedNet: string;
                fixedGross: string;
                setNet: string;
                setGross: string;
            };
            requireManualPriceInfo: string;
            discountLabels: {
                percent: string;
                discountNet: string;
                discountGross: string;
                setPriceNet: string;
                setPriceGross: string;
            };
        };
        selectedCustomer: {
            newBadge: string;
            existingBadge: string;
            emailLabel: string;
            phoneLabel: string;
        };
        selectedVehicle: {
            newBadge: string;
            existingBadge: string;
        };
        validation: {
            customerRequired: string;
            vehicleRequired: string;
            brandMinLength: string;
            modelRequired: string;
            firstNameMinLength: string;
            lastNameMinLength: string;
            phoneInvalid: string;
            emailInvalid: string;
            serviceRequired: string;
            basePricePositive: string;
            vatRange: string;
            noteMaxLength: string;
            startDateRequired: string;
            endDateRequired: string;
            endAfterStart: string;
            colorRequired: string;
        };
    };
    vehicles: {
        title: string;
        subtitle: string;
        addVehicle: string;
        searchPlaceholder: string;
        table: {
            licensePlate: string;
            vehicle: string;
            owners: string;
            lastVisit: string;
            visits: string;
            totalRevenue: string;
            actions: string;
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
            owners: string;
            lastVisit: string;
            totalVisits: string;
            totalSpent: string;
        };
        detail: {
            overview: string;
            visits: string;
            changes: string;
            documents: string;
            photos: string;
            settings: string;
            technicalInfo: {
                title: string;
                licensePlate: string;
                brand: string;
                model: string;
                year: string;
                color: string;
                paintType: string;
                engineType: string;
                mileage: string;
            };
            owners: {
                title: string;
                subtitle: string;
                addOwner: string;
                removeOwner: string;
                confirmRemove: string;
                role: {
                    PRIMARY: string;
                    CO_OWNER: string;
                    COMPANY: string;
                };
            };
            notes: {
                title: string;
                subtitle: string;
                placeholder: string;
                save: string;
            };
            stats: {
                totalVisits: string;
                totalSpent: string;
                averageCost: string;
                lastVisit: string;
            };
            engineType: {
                gasoline: string;
                diesel: string;
                hybrid: string;
                electric: string;
            };
            status: {
                active: string;
                sold: string;
                archived: string;
            };
            activity: {
                title: string;
                subtitle: string;
                types: {
                    registration_changed: string;
                    owner_added: string;
                    owner_removed: string;
                    photo_added: string;
                    visit_completed: string;
                    notes_updated: string;
                    mileage_updated: string;
                };
            };
            photoGallery: {
                title: string;
                subtitle: string;
                uploadPhoto: string;
                noPhotos: string;
            };
            documentList: {
                title: string;
                subtitle: string;
                uploadDocument: string;
                noDocuments: string;
                category: {
                    protocols: string;
                    invoices: string;
                    photos: string;
                    technical: string;
                    other: string;
                };
            };
        };
        form: {
            title: string;
            basicInfo: string;
            licensePlate: string;
            licensePlatePlaceholder: string;
            brand: string;
            brandPlaceholder: string;
            model: string;
            modelPlaceholder: string;
            year: string;
            yearPlaceholder: string;
            color: string;
            colorPlaceholder: string;
            paintType: string;
            paintTypePlaceholder: string;
            engineType: string;
            engineTypePlaceholder: string;
            mileage: string;
            mileagePlaceholder: string;
            owners: {
                title: string;
                subtitle: string;
                addOwner: string;
                searchPlaceholder: string;
            };
            notes: {
                title: string;
                placeholder: string;
            };
            submit: string;
            submitting: string;
        };
        validation: {
            licensePlateRequired: string;
            licensePlateFormat: string;
            brandRequired: string;
            brandMin: string;
            modelRequired: string;
            modelMin: string;
            yearRequired: string;
            yearRange: string;
            colorRequired: string;
            engineTypeRequired: string;
            mileagePositive: string;
            notesMax: string;
            ownerRequired: string;
        };
        pagination: {
            showing: string;
            of: string;
            vehicles: string;
        };
        deleteConfirm: {
            title: string;
            message: string;
            confirm: string;
            cancel: string;
        };
    };
    checkin: {
        title: string;
        steps: {
            verification: string;
            technical: string;
            photos: string;
            summary: string;
        };
        verification: {
            title: string;
            subtitle: string;
            customerSection: string;
            vehicleSection: string;
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
            brand: string;
            model: string;
            licensePlate: string;
        };
        technical: {
            title: string;
            subtitle: string;
            mileage: string;
            mileagePlaceholder: string;
            mileageRequired: string;
            mileagePositive: string;
            deposit: string;
            depositItems: {
                keys: string;
                registrationDocument: string;
                other: string;
            };
            inspectionNotes: string;
            inspectionNotesPlaceholder: string;
        };
        photos: {
            title: string;
            subtitle: string;
            required: string;
            optional: string;
            qrCodeTitle: string;
            qrCodeDescription: string;
            refreshPhotos: string;
            requiredSlots: {
                front: string;
                rear: string;
                left_side: string;
                right_side: string;
            };
            damageSlots: {
                damage_front: string;
                damage_rear: string;
                damage_left: string;
                damage_right: string;
                damage_other: string;
            };
            photoUploaded: string;
            photoMissing: string;
            allRequiredUploaded: string;
            missingRequired: string;
        };
        mobile: {
            title: string;
            subtitle: string;
            takePhoto: string;
            retakePhoto: string;
            uploadPhoto: string;
            uploading: string;
            uploadSuccess: string;
            uploadError: string;
            retryUpload: string;
            addDescription: string;
            descriptionPlaceholder: string;
            sessionExpired: string;
            invalidSession: string;
            compressionInfo: string;
        };
        summary: {
            title: string;
            subtitle: string;
            customerInfo: string;
            vehicleInfo: string;
            technicalInfo: string;
            photosInfo: string;
            servicesInfo: string;
            depositInfo: string;
            mileageLabel: string;
            inspectionNotesLabel: string;
            photosCount: string;
            servicesCount: string;
            estimatedCost: string;
            estimatedCompletion: string;
            createVisit: string;
            creating: string;
        };
        actions: {
            nextStep: string;
            previousStep: string;
            saveAsDraft: string;
            savingDraft: string;
            draftSaved: string;
            draftError: string;
            cancel: string;
        };
        validation: {
            requiredPhotos: string;
            customerDataRequired: string;
            vehicleDataRequired: string;
            mileageRequired: string;
        };
        errors: {
            createFailed: string;
            loadReservationFailed: string;
            sessionExpired: string;
            uploadFailed: string;
            refreshPhotosFailed: string;
        };
    };
    // src/common/i18n/types.ts - Dodaj do interface TranslationKeys

    services: {
        title: string;
        subtitle: string;
        addService: string;
        editService: string;
        searchPlaceholder: string;
        showInactive: string;
        table: {
            name: string;
            priceNet: string;
            vat: string;
            priceGross: string;
            status: string;
            createdBy: string;
            actions: string;
        };
        status: {
            active: string;
            archived: string;
        };
        empty: {
            title: string;
            description: string;
        };
        emptySearch: {
            title: string;
            description: string;
        };
        form: {
            title: string;
            nameLabel: string;
            namePlaceholder: string;
            vatLabel: string;
            priceNetLabel: string;
            priceGrossLabel: string;
            vatAmount: string;
            requireManualPriceLabel: string;
            requireManualPriceDescription: string;
            submit: string;
            submitting: string;
            cancel: string;
        };
        vatRates: {
            23: string;
            8: string;
            5: string;
            0: string;
            '-1': string;
        };
        validation: {
            nameRequired: string;
            nameMin: string;
            nameMax: string;
            priceRequired: string;
            pricePositive: string;
            vatRequired: string;
        };
        error: {
            loadFailed: string;
            createFailed: string;
            updateFailed: string;
        };
        success: {
            created: string;
            updated: string;
        };
        pagination: {
            showing: string;
            of: string;
            services: string;
        };
    };
    consents: {
        title: string;
        subtitle: string;
        addDefinition: string;
        uploadNewVersion: string;
        viewPdf: string;
        setAsActive: string;
        empty: {
            title: string;
            description: string;
        };
        definition: {
            title: string;
            name: string;
            slug: string;
            description: string;
            activeVersion: string;
            noActiveVersion: string;
            allVersions: string;
        };
        template: {
            version: string;
            requiresResign: string;
            active: string;
            inactive: string;
            createdAt: string;
            createdBy: string;
        };
        createDefinitionModal: {
            title: string;
            nameLabel: string;
            namePlaceholder: string;
            slugLabel: string;
            slugPlaceholder: string;
            descriptionLabel: string;
            descriptionPlaceholder: string;
            submit: string;
            submitting: string;
            cancel: string;
        };
        uploadTemplateModal: {
            title: string;
            fileLabel: string;
            fileHint: string;
            requiresResignLabel: string;
            requiresResignHint: string;
            setAsActiveLabel: string;
            setAsActiveHint: string;
            selectFile: string;
            fileSelected: string;
            upload: string;
            uploading: string;
            uploadingToS3: string;
            cancel: string;
        };
        status: {
            valid: string;
            required: string;
            outdated: string;
        };
        validation: {
            nameRequired: string;
            nameMin: string;
            nameMax: string;
            slugRequired: string;
            slugPattern: string;
            slugMin: string;
            slugMax: string;
            descriptionMax: string;
            fileRequired: string;
            filePdfOnly: string;
        };
        error: {
            loadDefinitionsFailed: string;
            createDefinitionFailed: string;
            uploadTemplateFailed: string;
            s3UploadFailed: string;
            setActiveFailed: string;
            forbidden: string;
        };
        success: {
            definitionCreated: string;
            templateUploaded: string;
            templateActivated: string;
        };
        customer: {
            title: string;
            viewDocument: string;
            sign: string;
            signed: string;
            signedAt: string;
            currentVersion: string;
            yourVersion: string;
        };
    };
    dashboard: {
        stats: {
            inProgress: string;
            readyForPickup: string;
            arrivals: string;
            overdue: string;
            estimatedCompletion: string;
        };
        metrics: {
            revenueTitle: string;
            callsTitle: string;
            plannedThisWeek: string;
            realizedLastWeek: string;
            wowTrend: string;
        };
        calls: {
            title: string;
            empty: string;
            actions: {
                accept: string;
                edit: string;
                reject: string;
            };
        };
        social: {
            title: string;
            placeholder: string;
        };
        googleReviews: {
            title: string;
            averageRating: string;
            totalReviews: string;
            newReviews: string;
            recentReviews: string;
            competitorRanking: string;
        };
    };
    leads: {
        title: string;
        subtitle: string;
        fields: {
            contact: string;
            estimatedValue: string;
            name: string;
            source: string;
        };
        sources: {
            phone: string;
            email: string;
            manual: string;
        };
        status: {
            pending: string;
            inProgress: string;
            converted: string;
            abandoned: string;
        };
        actions: {
            add: string;
            editValue: string;
            markAsHandled: string;
        };
        empty: {
            title: string;
            description: string;
        };
        error: {
            loadFailed: string;
            createFailed: string;
            updateFailed: string;
        };
        pipeline: {
            title: string;
            totalValue: string;
        };
        toast: {
            newCall: string;
            created: string;
            updated: string;
        };
    };
}

export type TranslationKey = keyof TranslationKeys;
