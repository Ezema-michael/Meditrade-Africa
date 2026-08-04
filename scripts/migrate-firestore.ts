import { execFileSync } from "node:child_process";
import {
  CATEGORIES,
  INITIAL_ENGINEER_REVIEWS,
  INITIAL_ENGINEERS,
  INITIAL_LISTINGS,
  INITIAL_OFFERS,
  INITIAL_PROCUREMENT_REQUESTS,
  INITIAL_SELLERS,
  SUBSCRIPTION_PLANS
} from "../src/data";

type SeedDocument = Record<string, unknown> & { id: string };

const args = new Set(process.argv.slice(2));
const projectArg = process.argv.find(arg => arg.startsWith("--project="));
const databaseArg = process.argv.find(arg => arg.startsWith("--database="));
const projectId = projectArg?.split("=")[1] || process.env.FIREBASE_PROJECT_ID || "meditradeafrica";
const databaseId = databaseArg?.split("=")[1] || "(default)";
const dryRun = args.has("--dry-run");

const users: SeedDocument[] = [
  { id: "usr-1", firebase_uid: "f-uid-1", email: "chidi.obi@medlink.com.ng", phone: "+2348031234567", role: "seller", status: "active", created_at: "2025-01-15T09:00:00Z", updated_at: "2025-01-15T09:00:00Z" },
  { id: "usr-2", firebase_uid: "f-uid-2", email: "fatima@westafricamed.com", phone: "+2348123456789", role: "seller", status: "active", created_at: "2025-02-10T14:30:00Z", updated_at: "2025-02-10T14:30:00Z" },
  { id: "usr-3", firebase_uid: "f-uid-3", email: "ezemamichael@gmail.com", phone: "+2348033334444", role: "admin", status: "active", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
  { id: "usr-4", firebase_uid: "f-uid-4", email: "sales@lagomsconsumables.com.ng", phone: "+2347055555123", role: "seller", status: "active", created_at: "2025-04-18T11:00:00Z", updated_at: "2025-04-18T11:00:00Z" },
  { id: "usr-5", firebase_uid: "f-uid-5", email: "buyer@riversidememorial.org", phone: "+2348055554444", role: "buyer", status: "active", created_at: "2025-05-01T09:00:00Z", updated_at: "2025-05-01T09:00:00Z" }
];

const procurementQuotes: SeedDocument[] = [
  {
    id: "resp-1",
    request_id: "req-1",
    seller_id: "sel-1",
    listing_id: "list-1",
    price: 1350000,
    message: "We have 3 units of extremely clean, US-used Mindray patient monitors ready for delivery inside Abuja tomorrow.",
    availability: "Immediate delivery",
    whatsapp_contact: "+2348031234567",
    seller_name: "MedLink Diagnostics Ltd",
    offered_product: "Mindray uMec 12 Patient Monitor",
    created_at: "2026-05-27T10:00:00Z"
  }
];

const escrowDeals: SeedDocument[] = [
  {
    id: "esc-101",
    listing_id: "list-1",
    listing_title: "3x Mindray uMec 12 Patient Monitors (Escrow Secured)",
    buyer_id: "usr-5",
    buyer_name: "Dr. Chidi Obi (Riverside Memorial)",
    buyer_email: "buyer@riversidememorial.org",
    seller_id: "sel-1",
    seller_name: "MedLink Diagnostics Ltd",
    amount: 4050000,
    currency: "NGN",
    escrow_fee: 60750,
    status: "funds_deposited",
    assigned_engineer_id: "eng-1",
    assigned_engineer_name: "Engr. Emeka Nwosu (Biomedical Lead)",
    delivery_tracking_no: "MDT-ESC-2026-9912",
    created_at: "2026-07-30T12:00:00Z",
    updated_at: "2026-08-01T12:00:00Z"
  }
];

const inspections: SeedDocument[] = [
  {
    id: "insp-101",
    listing_id: "list-2",
    listing_title: "GE Voluson P8 3D/4D Ultrasound Machine",
    listing_condition: "foreign_used",
    listing_price: 14500000,
    listing_currency: "NGN",
    seller_id: "sel-2",
    seller_name: "West Africa Medical Systems",
    buyer_id: "usr-5",
    buyer_name: "Dr. Fatima Bello",
    buyer_phone: "+2348055554444",
    buyer_email: "buyer@riversidememorial.org",
    hospital_name: "Riverside Memorial Hospital",
    assigned_engineer_id: "eng-2",
    assigned_engineer_name: "Engr. Fatima Bello (Imaging Specialist)",
    assigned_engineer_phone: "+2348039998877",
    inspection_location: "Plot 14, Victoria Island Industrial Way, Lagos",
    scheduled_date: "2026-07-24",
    status: "passed",
    notes: "Buyer requested pre-purchase engineering audit on Tokunbo ultrasound before releasing payment.",
    fee_amount: 85000,
    escrow_linked: true,
    escrow_deal_id: "esc-102",
    checklist: [
      { id: "chk-1", label: "Transducer Crystal Element & Probe Signal Output Test", category: "sensor_calibration", status: "pass", measured_value: "3D/4D Array 99.4% Signal Homogeneity", notes: "Zero crystal dropouts detected." },
      { id: "chk-2", label: "HV Generator & Power Supply Voltage Stability Check", category: "tube_head_voltage", status: "pass", measured_value: "220V +/- 1.5% Surge Tolerant", notes: "Internal surge suppressors operational." },
      { id: "chk-3", label: "West Africa Power Grid Surge & UPS Handover Test", category: "power_surge", status: "pass", measured_value: "15 min battery hold", notes: "UPS cutover seamless." },
      { id: "chk-4", label: "Cables, Connectors & Accessories Audit", category: "accessories", status: "pass", measured_value: "3 Probes + Gel Heater Present", notes: "Convex, Linear, and Endovaginal probes included." },
      { id: "chk-5", label: "Electrical Safety Grounding & Thermal Diagnostic", category: "safety", status: "pass", measured_value: "<0.1 Ohm Ground Impedance", notes: "Safe for continuous clinical operation." }
    ],
    certificate_no: "CERT-BIOMED-2026-8819",
    engineer_verdict_notes: "Passed complete pre-purchase calibration audit. Equipment is in pristine mechanical and electronic working order.",
    completed_at: "2026-08-01T12:00:00Z",
    created_at: "2026-07-31T12:00:00Z",
    updated_at: "2026-08-01T12:00:00Z"
  }
];

const activityLogs: SeedDocument[] = [
  {
    id: "act-1",
    actor: "System",
    action: "INIT",
    category: "Database",
    description: "Firestore production seed migration applied.",
    timestamp: new Date().toISOString()
  }
];

function asSeedDocuments<T extends { id: string }>(documents: T[]): SeedDocument[] {
  return documents.map(document => ({ ...document }));
}

const collections: Record<string, SeedDocument[]> = {
  users,
  sellers: asSeedDocuments(INITIAL_SELLERS),
  categories: asSeedDocuments(CATEGORIES),
  subscription_plans: asSeedDocuments(SUBSCRIPTION_PLANS),
  listings: asSeedDocuments(INITIAL_LISTINGS.map(item => ({ ...item, is_active: item.is_active ?? true }))),
  procurement_requests: asSeedDocuments(INITIAL_PROCUREMENT_REQUESTS),
  procurement_quotes: procurementQuotes,
  engineers: asSeedDocuments(INITIAL_ENGINEERS),
  engineer_reviews: asSeedDocuments(INITIAL_ENGINEER_REVIEWS),
  offers: asSeedDocuments(INITIAL_OFFERS),
  escrow_deals: escrowDeals,
  inspections,
  activity_logs: activityLogs
};

function getAccessToken(): string {
  if (process.env.GCLOUD_ACCESS_TOKEN) {
    return process.env.GCLOUD_ACCESS_TOKEN;
  }
  const candidates = process.platform === "win32" ? ["gcloud.cmd", "gcloud"] : ["gcloud"];
  for (const command of candidates) {
    try {
      return execFileSync(command, ["auth", "print-access-token"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      }).trim();
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  throw new Error("Unable to find gcloud on PATH. Set GCLOUD_ACCESS_TOKEN or install the Google Cloud CLI.");
}

function toFirestoreValue(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue).filter(Boolean)
      }
    };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  }
  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

function toFirestoreFields(document: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document)
      .map(([key, value]) => [key, toFirestoreValue(value)] as const)
      .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry[1]))
  );
}

function documentName(collectionName: string, documentId: string): string {
  return `projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${documentId}`;
}

async function batchWrite(collectionName: string, documents: SeedDocument[], token: string): Promise<number> {
  if (documents.length === 0) return 0;
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents:batchWrite`;
  const writes = documents.map(document => ({
    update: {
      name: documentName(collectionName, document.id),
      fields: toFirestoreFields(document)
    }
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ writes })
  });

  if (!response.ok) {
    throw new Error(`Firestore batchWrite failed for ${collectionName}: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as { status?: Array<{ code?: number; message?: string }> };
  const failed = payload.status?.filter(status => status.code && status.code !== 0) || [];
  if (failed.length > 0) {
    throw new Error(`Firestore batchWrite reported ${failed.length} failed ${collectionName} writes: ${JSON.stringify(failed)}`);
  }
  return documents.length;
}

async function countDocuments(collectionName: string, token: string): Promise<number> {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents/${collectionName}?pageSize=300`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Firestore list failed for ${collectionName}: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as { documents?: unknown[] };
  return payload.documents?.length || 0;
}

async function main(): Promise<void> {
  const token = dryRun ? "" : getAccessToken();
  console.log(`Firestore migration target: project=${projectId}, database=${databaseId}`);

  for (const [collectionName, documents] of Object.entries(collections)) {
    if (dryRun) {
      console.log(`[dry-run] ${collectionName}: ${documents.length} documents`);
      continue;
    }
    const written = await batchWrite(collectionName, documents, token);
    const count = await countDocuments(collectionName, token);
    console.log(`${collectionName}: wrote ${written}, verified ${count}`);
  }

  console.log("Firestore migration complete.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
