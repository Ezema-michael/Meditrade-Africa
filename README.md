# MediTrade Africa 🏥

**MediTrade Africa** is West Africa's premier B2B healthcare marketplace, procurement engine, and biomedical equipment assurance network. It bridges hospitals, diagnostic centers, and verified medical equipment vendors across Nigeria and Sub-Saharan Africa.

---

## 🌟 Key Features

### 🛒 1. Verified Medical Equipment Marketplace
* Browse certified new, foreign-used (*Tokunbo*), and refurbished clinical machinery (Ultrasound, MRI, Patient Monitors, Autoclaves, X-Rays, Theatre Lights).
* Filter by **Category**, **Condition**, **Nigerian State** (Lagos, Abuja FCT, Rivers, Kano, etc.), and **Price Range in NGN (₦)**.
* Interactive **Vendor Storefront Modals** detailing corporate verification badges, CAC registration numbers, rating metrics, and full inventory.

### 🔒 2. Escrow Payment & Milestone Protection
* Fully integrated milestone escrow engine protecting hospital procurement funds.
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
* Automated equipment spec sheet extraction from images or unformatted text using Google Gemini (`@google/genai`).
* AI category auto-classification and description enhancement.
* Side-by-side technical device comparison engine for clinical decision-making.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Motion animations.
* **Backend**: Node.js, Express (`server.ts`) with Vite Development Middleware.
* **Database & Persistence**: Firebase Firestore (`firebase-applet-config.json` & `firebase-blueprint.json`) for persistent cloud storage, paired with high-speed server state.
* **AI Integration**: Google Gemini SDK (`@google/genai`).

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18 or higher
* npm or bun

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment Variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. Run Development Server:
   ```bash
   npm run dev
   ```
   The application will boot on `http://localhost:3000`.

---

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

---

## 📁 Directory Structure

```
├── server.ts                       # Main Express application & API proxy routes
├── firebase-applet-config.json     # Firebase project configuration
├── firebase-blueprint.json         # Firestore schema blueprint
├── firestore.rules                 # Firestore security rules
├── src/
│   ├── App.tsx                     # Primary layout & application state router
│   ├── data.ts                     # Initial Nigerian states, categories, and seed data
│   ├── types.ts                    # Global TypeScript interfaces & enums
│   ├── lib/
│   │   ├── serverDb.ts             # Firestore initialization & live collection sync
│   │   └── firebase.ts             # Client-side Firebase configuration
│   └── components/
│       ├── ListingCard.tsx         # Product listing card component
│       ├── VendorDashboard.tsx     # Dealer inventory management & analytics
│       ├── ProcurementHub.tsx      # Hospital RFQ request & quote submission
│       ├── EscrowFinancingPortal.tsx# Escrow deposit, dispatch & lease portal
│       ├── EngineersDashboard.tsx  # Biomedical engineer audit & certificate hub
│       ├── VendorStorefrontModal.tsx# Public vendor store view
│       ├── InterStateLogisticsEstimator.tsx # Transport cost calculator
│       └── AdminPanel.tsx          # System administration & moderation desk
└── metadata.json                   # App manifest and permissions
```

---

## 📄 License

Apache License 2.0
