# Backend Migration: Lead Appointment Endpoint DTO Alignment

## Summary

The frontend now sends the **same payload structure** to both:
- `POST /v1/appointments` (standard calendar flow)
- `POST /v1/leads/{id}/appointment` (lead conversion flow)

The `POST /v1/leads/{id}/appointment` backend endpoint must be updated to accept this shared DTO.

---

## Required Backend Changes

### 1. `LeadAppointmentServiceRequest` — replace flat fields with nested `Adjustment` object

**Current (flat — REMOVE):**
```kotlin
data class LeadAppointmentServiceRequest(
    val serviceId: String?,
    val serviceName: String,
    val basePriceNet: Int,
    val vatRate: Int,
    val adjustmentType: String,   // ← remove
    val adjustmentValue: Int,     // ← remove
    val note: String,
)
```

**Required (nested — matches `ServiceLineItemRequest`):**
```kotlin
data class LeadAppointmentServiceRequest(
    val id: String,
    val serviceId: String?,
    val serviceName: String,
    val basePriceNet: Int,
    val vatRate: Int,
    val adjustment: AdjustmentRequest,   // ← nested object
    val note: String,
)

data class AdjustmentRequest(
    val type: String,   // "FIXED_GROSS" | "SET_GROSS"
    val value: Int,
)
```

> If you already have a shared `AdjustmentRequest` class used by `ServiceLineItemRequest`, reuse it here.

---

### 2. `LeadAppointmentRequest` — verify top-level structure matches

The frontend sends the following JSON. Confirm each field is present in `LeadAppointmentRequest`:

```json
{
  "customer": {
    "mode": "NEW | UPDATE | EXISTING",
    "newData": { "firstName": "", "lastName": "", "phone": "", "email": "" },
    "id": "...",
    "patch": { "firstName": "", "lastName": "", "phone": "", "email": "" }
  },
  "vehicle": {
    "mode": "NEW | EXISTING | NONE",
    "newData": { "brand": "", "model": "", "year": 2020 },
    "id": "..."
  },
  "services": [
    {
      "id": "1234567890-0",
      "serviceId": "uuid-or-null",
      "serviceName": "Nazwa usługi",
      "basePriceNet": 10000,
      "vatRate": 23,
      "adjustment": { "type": "FIXED_GROSS", "value": 0 },
      "note": ""
    }
  ],
  "schedule": {
    "isAllDay": false,
    "startDateTime": "2024-01-15T10:00:00Z",
    "endDateTime": "2024-01-15T12:00:00Z"
  },
  "appointmentTitle": "Tytuł wizyty",
  "note": "Notatka",
  "appointmentColorId": "color-id",
  "sendConfirmationSms": false,
  "sendReminderSms": false
}
```

---

### 3. Business logic (no change required)

The existing behaviour must be preserved:
- On success, the lead's status transitions to `CONFIRMED`
- The created appointment's ID is stored in `lead.appointmentId`
- The endpoint returns the updated `Lead` object

---

### 4. New `LeadStatus` values

The frontend now uses these statuses — ensure the `LeadStatus` enum/column accepts all of them:

| Value | Description |
|-------|-------------|
| `NEW` | Lead created, no action taken |
| `IN_PROGRESS` | Lead being processed |
| `CONFIRMED` | Appointment booked — set automatically when appointment created |
| `COMPLETED` | Visit completed |
| `LOST` | Lead lost (replaced old `ABANDONED`) |
| `NO_SHOW` | Customer did not show up |

> If migrating from the old schema: rename `CONVERTED` → `CONFIRMED`, rename `ABANDONED` → `LOST`, add `NEW`, `COMPLETED`, `NO_SHOW`.

---

### 5. `Lead` response shape

The `Lead` / `LeadDetail` response must include:

```json
{
  "appointmentId": "uuid-or-null"
}
```

Add this field to the response DTO if not already present.
