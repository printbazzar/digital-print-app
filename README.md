# PRINT BAZZAR — DIGITAL PRINTING PRODUCTION MANAGEMENT SYSTEM

Internal production control, machine meter tracking, and inventory management web application for Print Bazzar's Digital Printing Production Department, specifically tailored for the **Konica Minolta C3070** production press.

---

## 1. Quick Start & Credentials

### Default User Accounts
| Role | Email | Password | Permissions & Boundaries |
| :--- | :--- | :--- | :--- |
| **OWNER** | `owner@printbazzar.com` | `owner123` | Full access: View all dashboards, master rates, machine settings, stock adjustments, audit logs, reports & PDF/Excel exports. |
| **OPERATOR** | `operator@printbazzar.com` | `operator123` | Shift access: Fast job production entry, live calculations, media restock, physical machine closing counter reconciliation. |

### Development Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Seed master data (Konica Minolta C3070 starting counter: 1,067,426)
npm run prisma:seed

# 4. Run automated test suite
npm test

# 5. Start development server
npm run dev

# 6. Production build
npm run build
npm start
```

---

## 2. Core Business Rules & Authoritative Formulas

### A. Machine Clicks Calculation (Requirement #11)
* **Single-Side (Simplex):**
  $$\text{Machine Clicks} = \text{Physical Sheets Consumed} \times 1$$
* **Double-Side (Duplex):**
  $$\text{Machine Clicks} = \text{Physical Sheets Consumed} \times 2$$
  *(100 double-sided sheets consume 100 physical sheets and produce 200 machine clicks)*.

### B. Physical Sheet Consumption (Requirement #12)
$$\text{Sheet Consumption} = \text{Good Prints} + \text{Wastage Sheets} + \text{Reprint Sheets}$$

### C. Machine Counter & Day Closure Reconciliation (Requirements #6, #7, #33, #56)
* **Initial Machine Counter Baseline:** `1,067,426`
* **Machine Print Count:**
  $$\text{Machine Print Count} = \text{Closing Physical Counter} - \text{Opening Counter}$$
* **Click Reconciliation:**
  $$\text{Discrepancy} = \text{Machine Print Count} - \text{Total Recorded Job Clicks Today}$$
* **Mismatch Enforcement:** If $\text{Discrepancy} \neq 0$, the system blocks Day Closure until the operator provides a mandatory explanatory reason (e.g. test prints, jam clearances), which is permanently stamped into the immutable audit trail.
* **Chaining:** Today's verified closing counter automatically becomes tomorrow's opening counter.

### D. Cost Calculation Engine (Requirements #10, #35)
* **A4 Colour:** ₹2.90 / click + 18% GST (Total: ₹3.42)
* **A4 B&W:** ₹1.10 / click + 18% GST (Total: ₹1.30)
* **A3 Colour:** ₹4.25 / click + 18% GST (Total: ₹5.02)
* **A3 B&W:** ₹1.10 / click + 18% GST (Total: ₹1.30)

---

## 3. Technology Stack & Repository Architecture

```
DIGITAL PRINT APP/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Login & session verification
│   │   │   ├── counters/      # Today's meter, history & day closure
│   │   │   ├── dashboard/     # Live KPI metrics & 14-day trends
│   │   │   ├── inventory/     # Restock, stock adjustments & movement ledger
│   │   │   ├── jobs/          # Production job creation & deduction
│   │   │   ├── machines/      # Machine master & meter status
│   │   │   ├── media/         # Media master & paper stocks
│   │   │   ├── notifications/ # Real-time alerts
│   │   │   ├── rates/         # Print Click Rate Master
│   │   │   ├── reports/       # Breakdown analytics & summaries
│   │   │   ├── upload/        # Wastage photo evidence upload
│   │   │   ├── wastage-reasons/
│   │   │   └── audit/         # Audit log retrieval
│   │   ├── audit/             # Owner Audit Trail screen
│   │   ├── daily-closing/     # Machine Counter Reconciliation screen
│   │   ├── inventory/         # Media Stock & Movements screen
│   │   ├── login/             # Role-aware authentication screen
│   │   ├── masters/           # Owner Master Data Management screen
│   │   ├── production/        # Operator Job Production Entry screen
│   │   ├── reports/           # Production Reports & PDF/Excel Exporters
│   │   ├── layout.tsx         # Root Layout with Nav & Auth Provider
│   │   └── page.tsx           # Real-time Production Dashboard
│   ├── components/
│   │   ├── Navbar.tsx         # Responsive header with role indicator
│   │   └── NotificationBell.tsx # Unread alert notification popover
│   └── lib/
│       ├── AuthContext.tsx    # Session & RBAC state provider
│       ├── auth.ts            # JWT & bcrypt utilities
│       ├── calculations.ts    # Authoritative calculation engine (TypeScript)
│       ├── calculations.js    # Authoritative calculation engine (CommonJS)
│       ├── db.ts              # Resilient persistence & transactional storage
│       ├── export-utils.ts    # Filter-aware PDF & Excel report exporters
│       └── seed-data.ts       # Initial master data constants
├── prisma/
│   └── schema.prisma          # Relational PostgreSQL domain schema
├── scripts/
│   └── seed.js                # Standalone master data seeding script
└── tests/
    ├── calculations.test.js   # Unit test suite for click/rate math
    └── e2e-flow.test.js       # End-to-end shift production & reconciliation tests
```

---

## 4. Verification & Testing Evidence

All automated unit and end-to-end integration tests execute cleanly via `npm test`:

* ✔ **Single-Side Click Verification:** 100 sheets = 100 machine clicks.
* ✔ **Double-Side Click Verification:** 100 sheets = 200 machine clicks.
* ✔ **Sheet Consumption:** `100 Good + 10 Wastage + 5 Reprint = 115 sheets`.
* ✔ **Cost Calculation:** 200 clicks @ ₹2.90 + 18% GST = ₹684.40.
* ✔ **Starting Baseline Test:** Opening `1,067,426` to Closing `1,067,626` = 200 clicks (Matched).
* ✔ **Discrepancy Gate Test:** Opening `1,067,426` to Closing `1,067,626` with 190 logged clicks yields Difference = 10 and enforces mandatory explanation reason.
* ✔ **Production Build:** Next.js 14 production build succeeds with 0 errors across all 29 routes.
