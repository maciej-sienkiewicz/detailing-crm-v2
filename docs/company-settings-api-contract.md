# Company Settings API Contract

Base path: `/api/v1/settings/company`

All endpoints require an authenticated session (cookie-based). `403 Forbidden` is returned when the caller lacks the `OWNER` or `ADMIN` role.

---

## GET `/api/v1/settings/company`

Returns the company profile for the authenticated tenant.

### Response `200 OK`

```json
{
  "id": "string",
  "name": "Detail Pro Studio Sp. z o.o.",
  "legalForm": "LIMITED_LIABILITY_COMPANY",
  "taxId": "525-123-45-67",
  "regon": "142836501",
  "krs": "0000543210",
  "street": "ul. Puławska 145",
  "postalCode": "02-715",
  "city": "Warszawa",
  "phone": "+48 22 555 12 34",
  "email": "kontakt@detailpro.pl",
  "website": "https://detailpro.pl",
  "bankAccount": "12 1020 1042 0000 0102 0123 4567",
  "logoUrl": "https://cdn.example.com/logos/tenant-1.png",
  "updatedAt": "2026-04-28T10:00:00Z"
}
```

### `legalForm` enum values

| Value | Polish name |
|---|---|
| `SOLE_PROPRIETORSHIP` | Jednoosobowa działalność gospodarcza |
| `CIVIL_PARTNERSHIP` | Spółka cywilna |
| `GENERAL_PARTNERSHIP` | Spółka jawna |
| `LIMITED_PARTNERSHIP` | Spółka komandytowa |
| `LIMITED_LIABILITY_COMPANY` | Spółka z o.o. |
| `JOINT_STOCK_COMPANY` | Spółka akcyjna |

---

## PUT `/api/v1/settings/company`

Updates company data. All fields except optional ones are required.

### Request body

```json
{
  "name": "Detail Pro Studio Sp. z o.o.",
  "legalForm": "LIMITED_LIABILITY_COMPANY",
  "taxId": "525-123-45-67",
  "regon": "142836501",
  "krs": "0000543210",
  "street": "ul. Puławska 145",
  "postalCode": "02-715",
  "city": "Warszawa",
  "phone": "+48 22 555 12 34",
  "email": "kontakt@detailpro.pl",
  "website": "https://detailpro.pl",
  "bankAccount": "12 1020 1042 0000 0102 0123 4567"
}
```

**Optional fields** (may be `null` or omitted): `krs`, `website`, `bankAccount`.

### Validation rules

| Field | Rule |
|---|---|
| `name` | Non-empty string, max 200 chars |
| `taxId` | Exactly 10 digits (after stripping spaces/dashes). NIP checksum validated. |
| `regon` | 9 or 14 digits |
| `krs` | 10 digits or null |
| `postalCode` | Pattern `\d{2}-\d{3}` |
| `email` | Valid RFC 5321 address |
| `phone` | Non-empty, max 30 chars |
| `website` | Valid URL or null |
| `bankAccount` | Max 60 chars or null |

### Response `200 OK`

Returns the updated `CompanySettings` object (same schema as `GET`).

### Response `422 Unprocessable Entity`

```json
{
  "errors": [
    { "field": "taxId", "message": "Invalid NIP checksum." }
  ]
}
```

---

## POST `/api/v1/settings/company/logo`

Uploads a new company logo. Replaces the previous one if present.

### Request

`Content-Type: multipart/form-data`

| Part | Type | Required | Notes |
|---|---|---|---|
| `file` | binary | yes | PNG / SVG / JPEG / WEBP, max **2 MB** |

### Response `200 OK`

```json
{
  "logoUrl": "https://cdn.example.com/logos/tenant-1-abc123.png"
}
```

### Response `413 Payload Too Large`

Returned when the uploaded file exceeds 2 MB.

### Response `415 Unsupported Media Type`

Returned when the MIME type is not one of `image/png`, `image/svg+xml`, `image/jpeg`, `image/webp`.

---

## DELETE `/api/v1/settings/company/logo`

Removes the current logo. If no logo is set, returns `204` without error.

### Response `204 No Content`

---

## Error schema (shared)

```json
{
  "status": 422,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "errors": [
    { "field": "taxId", "message": "Invalid NIP checksum." }
  ]
}
```

| HTTP status | Meaning |
|---|---|
| `400` | Bad request / malformed JSON |
| `401` | Not authenticated |
| `403` | Insufficient role (OWNER or ADMIN required) |
| `404` | Company record not found (should not happen in normal flow) |
| `413` | Logo file too large |
| `415` | Unsupported logo MIME type |
| `422` | Validation error |
| `500` | Internal server error |
