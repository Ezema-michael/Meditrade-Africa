# MediTrade Africa 🏥

**MediTrade Africa** is West Africa's premier B2B healthcare marketplace, procurement engine, and biomedical equipment assurance network. It bridges hospitals, diagnostic centers, and verified medical equipment vendors across Nigeria and Sub-Saharan Africa.

---

## 🌟 Key Features

### 🛒 1. Verified Medical Equipment Marketplace
* Browse certified new, foreign-used (*Tokunbo*), and refurbished clinical machinery (Ultrasound, MRI, Patient Monitors, Autoclaves, X-Rays, Theatre Lights).
* Filter by **Category**, **Condition**, **Nigerian State** (Lagos, Abuja FCT, Rivers, Kano, etc.), and **Price Range in NGN (₦)**.
* Interactive **Vendor Storefront Modals** detailing corporate verification badges, CAC registration numbers, rating metrics, and full inventory.

### 🔒 2. Escrow Payment & Milestone Protection
* Milestone escrow engine protecting hospital procurement funds.
* **Escrow Workflow**: Fund Deposit ➔ Biomedical Inspection & Sign-off ➔ Dispatch & Tracking ➔ Final Fund Release to Vendor.
* Automated dispute resolution and admin escalation workflow.

### 🩺 3. Accredited Biomedical Engineering Network
* Nationwide network of certified biomedical engineers across all 36 Nigerian states.
* Pre-purchase engineering calibration audits, safety grounding checks, transducer signal output tests, and electrical surge tolerance certification.
* Downloadable digital **Biomedical Audit Certificates** (`CERT-BIOMED-2026-*`).

### 📑 4. Hospital Procurement & RFQ Portal
* Healthcare facilities post bulk procurement requests (RFQs) with required delivery timeframes and destination states.
* Verified dealers submit competitive quotes, lead times, and warranty terms.

### 🏦 5. Equipment Lease Financing
* Integrated lease financing portal supported by partner financial institutions (Access Bank MedPay, Sterling Bank HealthCare Lease, GTBank Leasing, Sahel Capital).
* Rapid 48-hour credit pre-qualification with 12 to 48-month tenure options.

### 🚚 6. Inter-State Medical Logistics Estimator
* Route-specific transport fee estimator calculating fragile handling, shock-absorbent packaging, transit insurance, and distance matrix across Nigerian states.

### 🤖 7. Gemini AI Diagnostic Engine
* Automated equipment spec sheet extraction from raw WhatsApp trading text using Google Gemini (`@google/genai`).
* AI category auto-classification and description enhancement.
* Side-by-side technical device comparison engine (`gemini-3.6-flash`) for clinical decision-making.

---

## 🚦 System Architecture & Integration Status

### Live Production Integrations
* **Firestore Authoritative Database**: Persistent cloud data storage backed by Firebase Firestore (`firebase-applet-config.json` & `firebase-blueprint.json`) with automated seeding and live state sync.
* **Firebase Authentication & RBAC**: Token verification via Firebase Admin SDK with role and ownership checks (`requireAuth`, `requireRole`, `requireAdmin`).
* **Google Gemini AI Engine**: `@google/genai` SDK using `gemini-3.5-flash` and `gemini-3.6-flash` for automated text extraction, description enhancement, category detection, and side-by-side device comparison.
* **Zod API Validation**: Comprehensive runtime schema validation on all POST/PATCH/DELETE request payloads (`src/lib/validation.ts`).
* **Structured Audit Logging**: Event activity logging tracking regulatory, escrow, and trading actions (`src/lib/auditLogger.ts`).
* **Secure File Uploads**: Disk-based upload pipeline with file type filtering and 50MB size restrictions.
* **CI/CD Pipeline**: GitHub Actions workflow (`/.github/workflows/ci.yml`) performing static type checking (`tsc --noEmit`) and testing (`vitest`).

### Prototype & Simulated Integrations
* **Bank Escrow Disbursal**: Payment gateway collection and bank disbursal triggers are simulated via structured reference keys (`ESC-2026-*`) and milestone state updates.
* **Lease Underwriting Desk**: Bank risk evaluation scorecards use deterministic financial models simulating bank underwriting decisions.
* **GPS Fleet Tracking**: Inter-state waybill logistics calculations use distance matrix tables simulating real-time freight carrier quotes.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Motion animations.
* **Backend**: Node.js, Express (`server.ts`) with modular route handlers in `src/routes/`.
* **Database & Security**: Firebase Firestore & Firebase Auth, with `firestore.rules`.
* **Validation & Logging**: Zod, `express-rate-limit`, structured JSON audit logging.
* **AI Integration**: Google Gemini SDK (`@google/genai`).

---

## 📁 Directory Structure

```
├── server.ts                       # Express application entrypoint & Vite middleware
├── firebase-applet-config.json     # Firebase project configuration
├── firebase-blueprint.json         # Firestore schema blueprint
├── firestore.rules                 # Firestore security rules
├── .github/workflows/ci.yml        # CI pipeline for type checking and testing
├── src/
│   ├── App.tsx                     # Primary layout & application state router
│   ├── data.ts                     # Initial Nigerian states, categories, and seed data
│   ├── types.ts                    # Global TypeScript interfaces & enums
│   ├── lib/
│   │   ├── auditLogger.ts          # Centralized structured audit logging engine
│   │   ├── validation.ts           # Zod schemas & Express validation middleware
│   │   ├── serverDb.ts             # Firestore initialization & live collection sync
│   │   └── firebase.ts             # Client-side Firebase configuration
│   ├── server/
│   │   ├── middleware.ts           # Express auth, rate limiters, multer upload engine
│   │   └── state.ts                # Centralized state re-exports
│   ├── routes/
│   │   ├── auth.ts                 # Auth sync & user profile endpoints
│   │   ├── upload.ts               # File & media upload routes
│   │   ├── listings.ts             # Equipment CRUD, search, reporting
│   │   ├── sellers.ts              # Vendor stores & CAC verification
│   │   ├── procurement.ts          # Hospital RFQs & dealer quotes
│   │   ├── offers.ts               # Direct offer submission & CRM leads/chats
│   │   ├── escrow.ts               # Escrow agreements & milestone releases
│   │   ├── financing.ts            # Lease financing applications
│   │   ├── engineers.ts            # Biomedical directory & pre-purchase audits
│   │   ├── logistics.ts            # Inter-state freight cost estimator
│   │   ├── ai.ts                   # Gemini AI extraction & device comparison
│   │   └── admin.ts                # Admin dashboard, vendor moderation & analytics
│   └── components/                 # Frontend UI components
└── metadata.json                   # App manifest and frame permissions
```

---

## 📄 License

Apache License 2.0
