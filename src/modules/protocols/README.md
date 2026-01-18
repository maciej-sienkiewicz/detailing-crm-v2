# Protocol Documentation System

A sophisticated yet intuitive UI for managing document protocols in the Detailing CRM. This system ensures that the correct documents are automatically included during check-in and check-out flows based on global rules and service-specific triggers.

## 🎯 Overview

The Protocol Documentation System consists of three main views:

1. **View A: Global Documentation Rules** (`/protocols`) - Settings page for managing protocol templates and rules
2. **View B: Service-to-Protocol Mapping** - Enhanced service modal with protocol assignment
3. **View C: Dynamic Protocol Checklist** - Technician/tablet view showing required protocols for a visit

## 🏗️ Architecture

### Data Model

```typescript
interface ProtocolTemplate {
  id: string;
  name: string;
  description?: string;
  templateUrl?: string; // URL to the PDF template
  isActive: boolean;
}

interface ProtocolRule {
  id: string;
  protocolTemplateId: string;
  triggerType: 'GLOBAL_ALWAYS' | 'SERVICE_SPECIFIC';
  stage: 'CHECK_IN' | 'CHECK_OUT';
  serviceId?: string; // Only for SERVICE_SPECIFIC
  isMandatory: boolean;
  displayOrder: number;
}

interface VisitProtocol {
  id: string;
  visitId: string;
  protocolTemplateId: string;
  stage: 'CHECK_IN' | 'CHECK_OUT';
  isMandatory: boolean;
  isSigned: boolean;
  signedAt?: string;
  signedBy?: string;
  signatureUrl?: string;
}
```

### File Structure

```
src/modules/protocols/
├── types.ts                          # TypeScript type definitions
├── index.ts                          # Module exports and mock setup
├── README.md                         # This file
├── api/
│   ├── protocolsApi.ts              # API client methods
│   ├── useProtocols.ts              # React Query hooks
│   ├── mockProtocols.ts             # Mock data
│   └── mockProtocolsInterceptor.ts  # Axios mock interceptor
├── views/
│   ├── ProtocolRulesView.tsx        # View A: Global rules management
│   └── ProtocolDemoView.tsx         # Demo page for testing
└── components/
    ├── ProtocolRuleCard.tsx         # Rule display card
    ├── ProtocolTemplateModal.tsx    # Template management modal
    ├── ProtocolRuleModal.tsx        # Rule creation/editing modal
    └── ProtocolChecklist.tsx        # View C: Dynamic checklist
```

## 📱 View A: Global Documentation Rules

**Route:** `/protocols`

The central management interface for defining which protocols are required during vehicle check-in and check-out.

### Features

- **Two-column layout**: Separate sections for Check-in and Check-out stages
- **Protocol Templates**: Create and manage reusable document templates
- **Protocol Rules**: Define when each protocol should be required
- **Global vs Service-Specific**: Choose between always-required or service-triggered protocols
- **Mandatory Toggle**: Mark protocols as required (blocking) or optional
- **Drag & Drop**: Reorder protocols (planned feature)

### Usage

1. Navigate to `/protocols` in the app
2. Click "Zarządzaj szablonami" to create protocol templates
3. Click "Dodaj nowy szablon"
4. Fill in template details:
   - **Nazwa**: Protocol name (e.g., "Regulamin ogólny")
   - **Opis**: Optional description
   - **Szablon PDF**: Upload PDF file (drag & drop or click)
     - Accepts only PDF files
     - Maximum file size: 10 MB
     - Validates file type automatically
5. Click "Dodaj szablon" to save
6. Click "Dodaj regułę" in either Check-in or Check-out section
7. Select a template, trigger type, and configure mandatory status
8. Save to activate the rule

### UI Components

- **Material Design 3 inspired**: Clean, high-contrast design with generous spacing
- **Color coding**:
  - Blue: Global protocols
  - Purple: Service-specific protocols
  - Red: Mandatory protocols
  - Gray: Optional protocols
  - Green: Signed protocols

## 🔧 View B: Service-to-Protocol Mapping

**Location:** Service Modal (`/services`)

Enhanced service creation/editing modal that allows associating protocols with specific services.

### Features

- **Protocol Multi-select**: Choose which protocols are required when this service is added to a visit
- **Preview**: See which protocols will be triggered
- **Context Tooltip**: Clear explanation of how service-protocol mapping works
- **Stage Badges**: Visual indicators showing whether protocols apply to check-in or check-out

### Integration

The protocol selection section is automatically included in the `ServiceFormModal` component. When editing a service, the modal will show:

1. All active protocol templates
2. Checkboxes to select required protocols
3. Stage badges indicating when each protocol applies
4. Descriptions explaining each protocol

## 📋 View C: Dynamic Protocol Checklist

**Component:** `<ProtocolChecklist />`
**Demo Route:** `/protocols/demo`

The technician-facing interface displayed during check-in and check-out flows.

### Features

- **Smart Resolution**: Automatically shows the correct protocols based on:
  - Global rules (always required)
  - Service-specific rules (based on visit services)
- **Visual Stepper**: Vertical timeline showing protocol completion status
- **Status Indicators**:
  - Red asterisk + alert icon: Mandatory (not yet signed)
  - Green background + checkmark: Signed
  - Gray: Optional
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Signature Flow**: Individual or bulk signing capability
- **Responsive Design**: Optimized for both desktop and tablet views

### Usage Example

```tsx
import { ProtocolChecklist } from '@/modules/protocols';

function CheckInFlow({ visitId }) {
  return (
    <ProtocolChecklist
      visitId={visitId}
      stage="CHECK_IN"
    />
  );
}
```

### Protocol Logic

The checklist automatically:

1. Fetches all protocols for the visit
2. Filters by the current stage (CHECK_IN or CHECK_OUT)
3. Sorts by mandatory status (mandatory first)
4. Displays signing interface for unsigned protocols
5. Prevents proceeding if mandatory protocols are unsigned

## 🎨 Design System

### Colors (Tailwind-inspired)

```scss
// Backgrounds
$bg-slate-50: rgb(248, 250, 252);
$bg-white: white;

// Status Colors
$blue-50: rgb(239, 246, 255);   // Global badges
$blue-600: rgb(37, 99, 235);
$purple-50: rgb(243, 232, 255); // Service badges
$purple-600: rgb(147, 51, 234);
$red-50: rgb(254, 242, 242);    // Mandatory badges
$red-600: rgb(220, 38, 38);
$green-50: rgb(240, 253, 244);  // Signed state
$green-500: rgb(34, 197, 94);
```

### Spacing

- Page padding: `p-6` to `p-8` (24-32px)
- Card padding: `p-6` (24px)
- Gap between sections: `gap-lg` to `gap-xl` (16-24px)

### Typography

- Page titles: `text-xxl` (32px), weight 700
- Section titles: `text-lg` (20px), weight 600
- Body text: `text-sm` (14px)
- Helper text: `text-xs` (12px)

### Icons

Using SVG icons inspired by Lucide React:

- Document: File with lines
- Check-in: Arrow down
- Check-out: Arrow up
- Service: Wrench/Settings
- Mandatory: Shield/Alert
- Globe: Global rules
- Checkmark: Completed state

## 🔌 API Integration

### Endpoints

```
GET    /api/v1/protocol-templates
POST   /api/v1/protocol-templates
PATCH  /api/v1/protocol-templates/:id
DELETE /api/v1/protocol-templates/:id

GET    /api/v1/protocol-rules
POST   /api/v1/protocol-rules
PATCH  /api/v1/protocol-rules/:id
DELETE /api/v1/protocol-rules/:id
POST   /api/v1/protocol-rules/reorder

GET    /api/v1/visits/:visitId/protocols
POST   /api/v1/visits/:visitId/protocols/generate
POST   /api/v1/visits/:visitId/protocols/:protocolId/sign
```

### React Query Hooks

```typescript
// Templates
useProtocolTemplates()
useCreateProtocolTemplate()
useUpdateProtocolTemplate()
useDeleteProtocolTemplate()

// Rules
useProtocolRules()
useCreateProtocolRule()
useUpdateProtocolRule()
useDeleteProtocolRule()

// Visit Protocols
useVisitProtocols(visitId)
useSignVisitProtocol()
useGenerateVisitProtocols()
```

## 🧪 Mock Data

The module includes a comprehensive mock system for development and testing:

**Enable/Disable Mocks:**
```typescript
// src/modules/protocols/api/mockProtocolsInterceptor.ts
export const USE_PROTOCOL_MOCKS = true; // Set to false when backend is ready
```

**Mock Data Includes:**
- 8 Protocol Templates (regulamin, oświadczenia, zgody, gwarancje)
- 8 Protocol Rules (4 global, 4 service-specific)
- Auto-generated Visit Protocols based on visit services

## 🚀 Getting Started

1. **View the Settings Page:**
   ```
   Navigate to /protocols
   ```

2. **Create a Protocol Template:**
   - Click "Zarządzaj szablonami"
   - Fill in name, description, and PDF URL
   - Save

3. **Add a Protocol Rule:**
   - Choose Check-in or Check-out section
   - Click "Dodaj regułę"
   - Select template and trigger type
   - Configure mandatory status
   - Save

4. **Test the Checklist:**
   ```
   Navigate to /protocols/demo
   ```
   - Switch between Check-in and Check-out tabs
   - Try signing protocols
   - See the progress update in real-time

5. **Integrate with Services:**
   - Edit a service in `/services`
   - Scroll to "Wymagane dokumenty dla tej usługi"
   - Select protocols that should be required
   - Save service

## 📱 Responsive Design

The system is fully responsive:

- **Desktop**: Two-column layout for Check-in/Check-out
- **Tablet**: Single column with full-width cards
- **Mobile**: Optimized touch targets and simplified layouts

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels for buttons and icons
- Keyboard navigation support
- High contrast colors for readability
- Focus states on interactive elements

## 📤 File Upload System

The protocol template system supports PDF file uploads with the following features:

### Upload Methods

1. **Click to Upload**: Click the upload area to open file picker
2. **Drag & Drop**: Drag PDF files directly onto the upload area

### Validation

- **File Type**: Only PDF files (`.pdf`, `application/pdf`)
- **File Size**: Maximum 10 MB per file
- **Real-time Validation**: Instant feedback on invalid files

### File Preview

When a file is selected:
- PDF icon with red background
- File name (truncated if too long)
- File size (formatted: B, KB, MB, GB)
- Remove button to clear selection

### Existing Templates

For templates with uploaded files:
- "Podgląd PDF" link to view the file
- "Zmień plik" button to replace the file
- File name display

### Backend Integration

The system uses **S3 presigned URLs** for secure file uploads:

```typescript
// 1. Create template and get presigned URL
const response = await POST('/api/v1/protocol-templates', {
  name: 'Regulamin ogólny',
  description: 'Opis...'
});

// Response: { template: {...}, uploadUrl: 'https://s3.amazonaws.com/...' }

// 2. Upload file directly to S3
await axios.put(uploadUrl, file, {
  headers: { 'Content-Type': file.type }
});

// 3. File is now accessible via template.templateUrl
```

**Backend implementation:**
- Files stored in AWS S3
- Presigned URLs for secure uploads
- Automatic file cleanup for orphaned uploads
- Download URLs generated on-demand

## ⚠️ Backend Constraints

The backend has intentional constraints for data integrity:

### Protocol Rules are Immutable

- ✅ **Supported**: Create new rules
- ❌ **Not Supported**: Update existing rules
- ❌ **Not Supported**: Delete existing rules
- ❌ **Not Supported**: Reorder existing rules

**Rationale**: Rules are audit-logged and should not be modified after creation to maintain compliance history.

**Workaround**: Create a new rule with the desired configuration instead of modifying existing ones.

### File Upload

- ✅ **Supported**: Upload file when creating template
- ❌ **Not Supported**: Replace file when updating template
- ❌ **Not Supported**: Multiple files per template

**Rationale**: Templates are versioned and files should remain immutable for audit purposes.

**Workaround**: Create a new template version with the updated file.

## 🔮 Future Enhancements

- [ ] Protocol template versioning UI
- [ ] Rule archiving instead of deletion
- [ ] Digital signature capture integration
- [ ] PDF generation with filled templates
- [ ] Email delivery of signed protocols
- [ ] Multi-language support for protocols
- [ ] Protocol versioning and history
- [ ] Conditional logic (e.g., "Show protocol if vehicle age > 5 years")
- [ ] Custom fields in protocols
- [ ] Analytics dashboard for protocol completion rates
- [ ] Multiple file upload (supporting images, Word docs)
- [ ] PDF preview/viewer in modal
- [ ] File compression before upload
- [ ] Progress bar for large file uploads

## 🤝 Contributing

When extending the protocol system:

1. Follow the existing component structure
2. Use the provided TypeScript types
3. Maintain the Material Design 3 aesthetic
4. Add mock data for new features
5. Update this README with changes

## 📄 License

Part of the Detailing CRM v2 project.
