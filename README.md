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
* **Bank Transfer Workflow**: Buyer transfers to the configured escrow collection account, uploads PDF/image proof, and waits for confirmation before dispatch.
* **Payment Confirmation**: Proof can be confirmed only by a platform administrator, the deal's seller, or the specifically requested and assigned biomedical engineer.
* **Escrow Workflow**: Agreement ➔ Payment Proof ➔ Authorized Confirmation ➔ Dispatch & Tracking ➔ Biomedical Inspection ➔ Final Fund Release.
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
* Side-by-side technical device comparison engine (`gemini-3.5-flash`) for clinical decision-making.

---

## 🔒 Security & Authorization Hardening

The application has been hardened with enterprise-grade security controls:

1. **Restricted Firestore Security Rules**: Strictly prohibits wildcards or unauthenticated writes. Enforces authentication and document ownership checks.
2. **Centralized Firebase Admin Initialization**: Lazily initialized server-side with strict credential validation to prevent startup crashes when environment variables are unconfigured.
3. **Registration Account Flow**: Newly authenticated users begin in `pending_registration` status and cannot access sensitive seller/buyer actions until full profile completion.
4. **Server-Derived Identity**: All sensitive actions derive user identity (`id`, `email`, `role`, `seller_id`) directly from `req.user` verified token claims. Client-submitted identity fields are ignored.
5. **Strict Ownership Authorization**: Route handlers enforce resource ownership for listings, seller profiles, offers, escrow deals, and financing applications.
6. **Hardened File Upload Pipeline**: Includes magic byte MIME type detection, XSS filename sanitization, anti-malware scanning abstractions, and file size limits.
7. **Production-Safe Development Admin**: Frontend development admin mode is explicitly restricted to development mode and requires `VITE_ENABLE_DEV_ADMIN="true"` in local environment.
8. **Fail-Closed Production Startup**: Production requires Firestore, private GCS storage, ClamAV, explicit CORS origins, and configured bank-transfer details.
9. **Audited Payment Proofs**: Uploading a receipt never marks funds as deposited; an authorized participant must confirm it through a state-restricted, logged action.
10. **Operational Health Controls**: Liveness/readiness endpoints, configurable proxy/port settings, and graceful process shutdown support container deployments.

---

## 🚦 System Architecture & Integration Status

### Live Production Integrations
* **Firestore Authoritative Database**: Persistent cloud data storage backed by Firebase Firestore (`firebase-applet-config.json` & `firebase-blueprint.json`) with live state sync.
* **Firebase Authentication & RBAC**: Token verification via Firebase Admin SDK with role and ownership checks (`requireAuth`, `requireRole`, `requireAdmin`).
* **Google Gemini AI Engine**: `@google/genai` SDK using `gemini-3.5-flash` for automated text extraction, description enhancement, category detection, and side-by-side device comparison.
* **Zod API Validation**: Comprehensive runtime schema validation on all POST/PATCH/DELETE request payloads (`src/lib/validation.ts`).
* **Structured Audit Logging**: Centralized event activity logging tracking regulatory, escrow, and trading actions (`src/lib/auditLogger.ts`).
* **Secure File Uploads**: Storage service pipeline with magic byte validation, anti-malware checks, and local/GCS storage adapters.
* **Security Headers & Rate Limiting**: Helmet security headers and tiered rate limiting (global, API, critical actions).
* **Automated Test Suite**: Vitest and Supertest integration suite verifying security, authentication, authorization, and validation rules (`npm test`).
* **Manual Bank Transfer Proofs**: Participant-restricted receipt uploads and auditable confirmation by an administrator, matching seller, or explicitly assigned engineer.

### Prototype & Simulated Integrations
* **Automated Bank Settlement & Disbursal**: Manual transfer confirmation is available, but independent bank reconciliation, automated settlement, refunds, and vendor payout require a regulated provider integration.
* **Lease Underwriting Desk**: Bank risk evaluation scorecards use deterministic financial models simulating bank underwriting decisions.
* **GPS Fleet Tracking**: Inter-state waybill logistics calculations use distance matrix tables simulating real-time freight carrier quotes.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Motion animations.
* **Backend**: Node.js, Express (`server.ts`) with modular route handlers in `src/routes/`.
* **Database & Security**: Firebase Firestore & Firebase Auth, with `firestore.rules`.
* **Validation & Security**: Zod, `helmet`, `express-rate-limit`, structured JSON audit logging.
* **AI Integration**: Google Gemini SDK (`@google/genai`).
* **Testing**: Vitest, Supertest (`npm test`).
* **Runtime & Deployment**: Node.js 22, multi-stage Docker image, health checks, graceful shutdown, and GitHub Actions CI.

---

## 📁 Directory Structure

```
├── server.ts                       # Express application entrypoint & Vite middleware
├── firebase-applet-config.json     # Firebase project configuration
├── firebase-blueprint.json         # Firestore schema blueprint
├── firestore.rules                 # Firestore security rules
├── .github/workflows/ci.yml        # CI pipeline for type checking and testing
├── tests/                          # Automated Vitest/Supertest security test suite
│   ├── security.test.ts
│   └── authorization.test.ts
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
│   │   ├── middleware.ts           # Express auth, rate limiters, security middleware
│   │   ├── state.ts                # Centralized state re-exports & Firestore synchronization
│   │   └── services/
│   │       └── storageService.ts   # Secure file storage & anti-malware pipeline
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

## Production deployment

Production prerequisites, release gates, operational controls, and the explicit
payment-provider limitation are documented in [PRODUCTION.md](./PRODUCTION.md).

Before deployment:

1. Configure every required value in `.env.example` through a secret manager.
2. Provision the private GCS bucket, Firestore production database, and ClamAV.
3. Replace the sample `BANK_TRANSFER_*` values with the reviewed collection account.
4. Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
5. Deploy the included `Dockerfile` and configure `/health/live` and `/health/ready`.

Current verified baseline: **78 automated tests passing**, clean TypeScript
validation, and successful production client/server builds.

Do not describe manual receipt confirmation as independent bank verification, or
the financing and logistics estimates as binding financial or carrier offers.

## 📄 License

Apache License 2.0
