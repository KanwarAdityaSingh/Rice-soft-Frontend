# Purchase Flow - Complete Documentation

## Overview

The Purchase Flow is a comprehensive system that manages the complete lifecycle of rice purchases from initial agreement to final payment. It follows the real-world industry process used in rice trading operations.

---

## Entity Relationships & Linkage

### Entity Hierarchy

```
Transporter (Optional)
    ↓
Sauda (Purchase Agreement)
    ↓
Inward Slip Pass (with Lots)
    ↓
Purchase (Actual Transaction)
    ↓
Payment Advice (with Charges)
```

### Linkage Diagram

```
┌─────────────┐
│ Transporter │ (Optional, linked via sauda.transporter_id)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Sauda    │ (Central entity - links everything)
│             │ • purchaser_id → Vendor
│             │ • broker_id → Broker (optional)
│             │ • transporter_id → Transporter (optional, for xgodown)
└──────┬──────┘
       │
       ├─────────────────┐
       │                  │
       ▼                  ▼
┌─────────────────┐  ┌─────────────┐
│ Inward Slip Pass│  │  Purchase   │
│ • sauda_id      │  │ • sauda_id  │
│ • lots[]        │  │ • vendor_id │
└─────────────────┘  └──────┬───────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ Payment Advice  │
                    │ • purchase_id  │
                    │ • charges[]     │
                    └─────────────────┘
```

---

## Entities Explained

### 1. **Transporter** (Optional)
**What it is:** Transportation service provider who moves goods from warehouse to destination.

**Key Fields:**
- `business_name`: Company name (e.g., "HPR HODAL PALWAL ROADWAYS")
- `vehicle_numbers[]`: List of vehicle registration numbers
- `gst_number`, `pan_number`: Tax identification
- `bank_details`: For payment processing

**When it's needed:**
- Required for "xgodown" type saudas (goods from warehouse)
- Optional for "for" type saudas (Free on Rail/Road)

**Linkage:**
- Linked to Sauda via `sauda.transporter_id`

---

### 2. **Sauda** (Purchase Agreement)
**What it is:** The purchase agreement/contract that defines the terms of purchase before actual goods are received.

**Key Fields:**
- `sauda_type`: "xgodown" (from warehouse) or "for" (Free on Rail/Road)
- `rice_quality`: Type/quality of rice (e.g., "CHAPI WAND RAW PARMAL")
- `rate`: Agreed price per kg
- `quantity`: Total quantity in kg
- `purchaser_id`: Vendor who will receive the goods
- `broker_id`: Broker involved (optional)
- `transporter_id`: Required for xgodown type
- `transportation_cost`: Cost for xgodown type
- `estimated_delivery_time`: Days until delivery

**Status Flow:**
- `draft` → `active` → `completed` / `cancelled`

**Linkage:**
- **Parent:** None (root entity)
- **Children:** InwardSlipPass, Purchase (both link via `sauda_id`)

**Business Logic:**
- One Sauda can have multiple Inward Slip Passes (multiple deliveries)
- One Sauda can have multiple Purchases (multiple transactions)
- Rate and quantity are agreed upfront
- Transportation cost is included for xgodown type

---

### 3. **Inward Slip Pass** (Entry Slip with Lots)
**What it is:** Document created when goods are received, containing multiple lots (batches) of rice.

**Key Fields:**
- `slip_number`: Unique slip identifier (e.g., "ISP-2024-001")
- `date`: Date of receipt
- `vehicle_number`: Vehicle that delivered
- `party_name`, `party_address`: Supplier details
- `party_gst_number`: Supplier GST
- `lots[]`: Array of lots received

**InwardSlipLot (Nested Entity):**
Each lot represents one batch:
- `lot_number`: Unique lot identifier (e.g., "P3236")
- `item_name`: Rice type
- `no_of_bags`: Number of bags
- `bag_weight`: Weight per bag (kg)
- `bill_weight`: Weight on bill (kg)
- `received_weight`: Actual weight received (kg) - **This is what payment is based on**
- `bardana`: Bag type (e.g., "BOPP")
- `rate`: Rate per kg
- `total_weight`: Auto-calculated = `no_of_bags × bag_weight`
- `amount`: Auto-calculated = `received_weight × rate`

**Status Flow:**
- `pending` → `completed`

**Linkage:**
- **Parent:** Sauda (via `sauda_id`)
- **Children:** None

**Business Logic:**
- Multiple lots can be in one slip pass
- Each lot is calculated independently
- Amount is based on **received_weight**, not bill_weight
- Weight difference (bill_weight - received_weight) shows loss/gain

---

### 4. **Purchase** (Actual Purchase Transaction)
**What it is:** The actual purchase transaction that records the purchase details, invoices, and documents.

**Key Fields:**
- `vendor_id`: Vendor who sold the goods
- `sauda_id`: Related sauda agreement
- `invoice_number`, `invoice_date`: Purchase invoice
- `rate`: Purchase rate per kg
- `total_bags`, `total_weight`, `total_amount`: Purchase totals
- `igst_amount`, `igst_percentage`: Tax details
- `freight_status`: "PAID" | "UNPAID" | "PARTIAL"
- `truck_number`, `transport_name`: Transportation details
- `purchase_date`: Date of purchase
- Document URLs: `transportation_bill_image_url`, `purchase_bill_image_url`, `bilti_image_url`, `eway_bill_image_url`

**Status Flow:**
- `pending` → `in_transit` → `received` → `completed`

**Linkage:**
- **Parent:** Sauda (via `sauda_id`), Vendor (via `vendor_id`)
- **Children:** PaymentAdvice (via `purchase_id`)

**Business Logic:**
- One Purchase links to one Sauda
- One Purchase can have multiple Payment Advices (partial payments)
- Documents are uploaded after purchase creation
- Status tracks the physical movement of goods

---

### 5. **Payment Advice** (Payment Instructions with Charges)
**What it is:** Payment instruction document that specifies how much to pay, to whom, and what charges apply.

**Key Fields:**
- `purchase_id`: Related purchase (optional - can be standalone)
- `payer_id`: User/company making payment
- `recipient_id`: Vendor receiving payment
- `amount`: Total amount before charges
- `net_payable`: Auto-calculated = `amount - SUM(charges)`
- `date_of_payment`: When payment should be made
- `sr_number`: Serial number for tracking
- `invoice_number`, `invoice_date`: Related invoice
- `bill_weight`, `kanta_weight`, `final_weight`: Weight details
- `rate`: Rate used for calculation
- `charges[]`: Array of charges/deductions

**PaymentAdviceCharge (Nested Entity):**
Each charge is a deduction:
- `charge_name`: Name (e.g., "CD 2.0%", "Quality Deduction")
- `charge_value`: Amount to deduct
- `charge_type`: "percentage" or "fixed"

**Status Flow:**
- `pending` → `completed` / `failed`

**Linkage:**
- **Parent:** Purchase (via `purchase_id`, optional)
- **Children:** None

**Business Logic:**
- Net payable = Amount - Total Charges
- Charges can be percentage-based or fixed
- Multiple charges can be applied
- Payment slip can be uploaded after creation

---

## User Flow

### Flow 1: Complete Purchase Flow (Wizard)

**Step 1: Transporter (Optional)**
- User can select existing transporter OR create new one
- Only required if creating "xgodown" type sauda
- Can skip if creating "for" type sauda

**Step 2: Sauda (Purchase Agreement)**
- User creates purchase agreement
- Selects:
  - Sauda type (xgodown or for)
  - Rice quality
  - Rate per kg
  - Quantity
  - Purchaser (vendor)
  - Broker (optional)
  - Transporter (required for xgodown)
- System creates Sauda with status "draft" or "active"

**Step 3: Inward Slip Pass**
- User creates entry slip when goods arrive
- Links to the Sauda created in Step 2
- Adds multiple lots:
  - Each lot: lot number, item, bags, weights, rate
  - System auto-calculates: total_weight, amount
- Records actual received weight (basis for payment)

**Step 4: Purchase**
- User creates actual purchase transaction
- Links to Sauda from Step 2
- Records:
  - Invoice details
  - Purchase totals
  - Transportation details
  - Documents (uploaded later)

**Step 5: Payment Advice**
- User creates payment instruction
- Links to Purchase from Step 4
- Adds charges (deductions):
  - Quality deductions
  - Commission
  - Other charges
- System calculates net payable automatically

---

### Flow 2: Independent Operations

Users can also create entities independently:

**Create Sauda Only:**
- Navigate to `/purchases/saudas`
- Create sauda without going through wizard
- Later create inward slips and purchases separately

**Create Purchase from Existing Sauda:**
- Navigate to `/purchases`
- Create purchase and select existing sauda
- System pre-fills rate from sauda

**Create Payment Advice:**
- Can be created standalone OR linked to purchase
- Navigate to `/purchases/payments`
- Create with or without purchase_id

---

## Current Implementation Status

### ✅ Fully Implemented

1. **Type Definitions** - All entities defined in `entities.ts`
2. **API Services** - All CRUD operations for all entities
3. **Custom Hooks** - Data management hooks for all entities
4. **Form Modals** - Create/Edit forms for all entities
5. **Purchase Wizard** - Complete 5-step flow
6. **List Pages** - Purchases, Saudas, Payment Advices
7. **Detail Pages** - Purchase Detail, Payment Advice Detail
8. **Navigation** - Sidebar menu and routing
9. **Auto-calculations** - Lot amounts, net payable
10. **Document Upload** - For purchases and payment advices
11. **Status Management** - Status badges and timelines

### ⚠️ Partially Implemented

1. **Sauda Detail Page** - Not yet created (route exists but no page)
2. **Inward Slip Detail Page** - Not yet created
3. **Transporter Management** - No dedicated page (only modal)
4. **Bulk Operations** - Not implemented
5. **Reports/Analytics** - Not implemented

---

## How to Make It More Comprehensive

### 1. **Add Missing Detail Pages**

**Sauda Detail Page** (`/purchases/saudas/:id`)
- Show sauda information
- List all related Inward Slip Passes
- List all related Purchases
- Show sauda timeline/status
- Edit sauda functionality

**Inward Slip Detail Page** (`/purchases/inward-slips/:id`)
- Show slip pass details
- Display all lots in detail
- Show related Sauda
- Show related Purchase (if any)
- Edit slip pass functionality

### 2. **Add Relationship Views**

**Sauda → Related Entities View:**
- Show all inward slip passes for a sauda
- Show all purchases for a sauda
- Calculate totals across all related entities

**Purchase → Complete Flow View:**
- Show related Sauda details
- Show all Inward Slip Passes (via sauda_id)
- Show all Payment Advices
- Visual timeline of the complete flow

### 3. **Add Transporter Management Page**

**Transporter Directory** (`/purchases/transporters`)
- List all transporters
- Create/Edit/Delete transporters
- View transporter details
- Show all saudas using this transporter

### 4. **Add Bulk Operations**

**Bulk Create Inward Slips:**
- Create multiple slip passes at once
- Import from CSV/Excel

**Bulk Payment Advices:**
- Create multiple payment advices
- Apply same charges to multiple

### 5. **Add Calculations & Summaries**

**Sauda Summary:**
- Total quantity across all inward slips
- Total amount across all purchases
- Total payments made
- Outstanding amount

**Purchase Summary:**
- Total from inward slips (received weight × rate)
- Total purchase amount
- Total payments made
- Balance due

**Payment Summary:**
- Total charges applied
- Net payable across all payments
- Payment status breakdown

### 6. **Add Status Workflows**

**Sauda Status Management:**
- Auto-update status based on related entities
- Mark as completed when all purchases done
- Cancel sauda with validation

**Purchase Status Management:**
- Auto-update based on inward slips
- Mark as received when inward slip completed
- Status transitions with validations

### 7. **Add Validation & Business Rules**

**Sauda Validations:**
- Cannot create purchase if sauda is cancelled
- Cannot exceed sauda quantity in purchases
- Validate transporter for xgodown type

**Purchase Validations:**
- Validate total weight against inward slips
- Ensure purchase amount matches calculations
- Validate invoice dates

**Payment Advice Validations:**
- Ensure net payable is positive
- Validate charges don't exceed amount
- Check payment dates

### 8. **Add Reporting & Analytics**

**Purchase Analytics Dashboard:**
- Total purchases by status
- Total amount by vendor
- Total by sauda type
- Monthly/yearly trends

**Payment Analytics:**
- Total payments by status
- Outstanding payments
- Charge analysis
- Payment trends

### 9. **Add Document Management**

**Document Gallery:**
- View all documents for a purchase
- Download documents
- Replace documents
- Document versioning

### 10. **Add Notifications & Alerts**

**Status Change Notifications:**
- Notify when purchase status changes
- Alert on payment due dates
- Notify on sauda completion

### 11. **Add Search & Filters**

**Advanced Search:**
- Search across all entities
- Filter by date ranges
- Filter by vendor, broker, transporter
- Filter by status

### 12. **Add Export Functionality**

**Export Reports:**
- Export purchase details to PDF
- Export payment advices to Excel
- Generate invoices
- Print slips

### 13. **Add Approval Workflows**

**Multi-level Approvals:**
- Approve purchases above certain amount
- Approve payment advices
- Approval history

### 14. **Add Integration Points**

**Link to Other Modules:**
- Link purchases to inventory
- Link payments to accounting
- Link to sales/orders

---

## Current Data Flow Example

### Example: Complete Purchase Flow

1. **User creates Transporter:**
   ```
   Transporter: "HPR HODAL PALWAL ROADWAYS"
   Vehicle: "RJ114C6226"
   ```

2. **User creates Sauda:**
   ```
   Type: "xgodown"
   Rice: "CHAPI WAND RAW PARMAL"
   Rate: ₹45.5/kg
   Quantity: 22,350 kg
   Purchaser: "XYZ RICE VENDOR PVT LTD"
   Transporter: "HPR HODAL PALWAL ROADWAYS"
   Status: "active"
   ```

3. **User creates Inward Slip Pass:**
   ```
   Slip Number: "ISP-2024-001"
   Date: 2024-11-12
   Vehicle: "RJ114C6226"
   Lots:
     - Lot P3236: 200 bags, 9900 kg received, ₹450,450
     - Lot P3237: 150 bags, 7450 kg received, ₹338,975
     - Lot P3238: 100 bags, 4980 kg received, ₹226,590
   Total: ₹1,016,015
   ```

4. **User creates Purchase:**
   ```
   Vendor: "XYZ RICE VENDOR PVT LTD"
   Sauda: (links to sauda above)
   Invoice: "INV-001"
   Total Weight: 22,330 kg
   Total Amount: ₹1,016,015
   Status: "received"
   ```

5. **User creates Payment Advice:**
   ```
   Purchase: (links to purchase above)
   Amount: ₹1,016,015
   Charges:
     - CD 2.0%: ₹20,320.30
     - Quality Deduction: ₹5,000
   Net Payable: ₹990,694.70
   Status: "pending"
   ```

---

## Key Business Rules

1. **One Sauda → Multiple Inward Slips**
   - A sauda can have multiple deliveries (inward slips)
   - Each inward slip records actual received goods

2. **One Sauda → Multiple Purchases**
   - A sauda can result in multiple purchase transactions
   - Each purchase records invoice and documents

3. **One Purchase → Multiple Payment Advices**
   - A purchase can have multiple payments (partial payments)
   - Each payment advice has its own charges

4. **Weight Calculations:**
   - Payment is based on **received_weight**, not bill_weight
   - Weight difference = bill_weight - received_weight (shows loss/gain)

5. **Charge Calculations:**
   - Charges can be percentage or fixed
   - Net payable = Amount - SUM(charges)
   - Charges are applied per payment advice

---

## Recommendations for Enhancement

### Priority 1: Critical Missing Features
1. ✅ Sauda Detail Page - Show all related entities
2. ✅ Inward Slip Detail Page - Standalone view
3. ✅ Better relationship visualization - Show complete flow

### Priority 2: User Experience
4. ✅ Quick actions - Create purchase from sauda directly
5. ✅ Bulk operations - Create multiple entities at once
6. ✅ Better search - Search across all entities

### Priority 3: Business Intelligence
7. ✅ Analytics dashboard - Purchase/payment trends
8. ✅ Reports - PDF/Excel exports
9. ✅ Notifications - Status change alerts

### Priority 4: Advanced Features
10. ✅ Approval workflows - Multi-level approvals
11. ✅ Integration - Link to inventory/accounting
12. ✅ Advanced validations - Business rule enforcement

---

## Technical Architecture

### File Structure
```
src/
├── types/
│   └── entities.ts (All type definitions)
├── services/
│   ├── transporters.api.ts
│   ├── saudas.api.ts
│   ├── inwardSlipPasses.api.ts
│   ├── purchases.api.ts
│   └── paymentAdvices.api.ts
├── hooks/
│   ├── useTransporters.ts
│   ├── useSaudas.ts
│   ├── useInwardSlipPasses.ts
│   ├── usePurchases.ts
│   └── usePaymentAdvices.ts
├── components/
│   └── purchases/
│       ├── PurchaseWizard.tsx (Main flow)
│       ├── TransporterFormModal.tsx
│       ├── SaudaFormModal.tsx
│       ├── InwardSlipFormModal.tsx
│       ├── PurchaseFormModal.tsx
│       ├── PaymentAdviceFormModal.tsx
│       ├── LotTable.tsx (Lots management)
│       ├── ChargesTable.tsx (Charges management)
│       ├── DocumentUpload.tsx
│       └── PurchaseTimeline.tsx
└── pages/
    └── purchases/
        ├── Purchases.tsx (List)
        ├── PurchaseDetail.tsx
        ├── Saudas.tsx (List)
        └── PaymentAdvices.tsx (List)
```

---

## Summary

The purchase flow is a **5-entity system** that tracks rice purchases from agreement to payment:

1. **Transporter** (Optional) - Transportation provider
2. **Sauda** (Root) - Purchase agreement linking everything
3. **Inward Slip Pass** - Goods receipt with lots
4. **Purchase** - Actual transaction with documents
5. **Payment Advice** - Payment instructions with charges

**Key Linkage:** All entities link through `sauda_id` (except PaymentAdvice which also links via `purchase_id`).

**Current Status:** Core flow is complete. Missing detail pages and advanced features can be added incrementally.

