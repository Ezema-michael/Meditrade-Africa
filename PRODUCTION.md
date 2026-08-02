# Production Operations

## Release status

The marketplace and authenticated document workflows are deployable after the
checks below pass. Escrow deposit and fund-release mutations deliberately return
`501 PAYMENT_PROVIDER_REQUIRED` in production until a regulated payment provider
is integrated. Financing and logistics results are estimates and must not be
presented as binding bank or carrier offers.

Bank transfer is supported as a manual, auditable workflow: the buyer uploads a
receipt and an administrator, the matching seller, or the explicitly requested
assigned engineer confirms it. This confirmation is a participant attestation,
not independent bank settlement verification. Reconcile the escrow collection
account before dispatch and never treat uploaded proof alone as receipt of funds.

## Required infrastructure

- Node.js 22 and the included multi-stage Docker image.
- A dedicated Firebase production project using Application Default Credentials
  or a valid service-account secret.
- A private Google Cloud Storage bucket with uniform bucket-level access,
  retention/lifecycle rules, encryption, and CORS restricted to the application.
- A reachable ClamAV service. Uploads fail closed when scanning is unavailable.
- A load balancer that terminates TLS and supplies the expected proxy headers.

## Malware scanning

The upload route uses the `MALWARE_SCANNER` provider. Production must set:

- `MALWARE_SCANNER=clamav`
- `CLAMAV_HOST` to the scanner host reachable from the app container
- `CLAMAV_PORT=3310`
- `CLAMAV_TIMEOUT_MS=10000` or another reviewed timeout

For local verification, start the included Docker Compose scanner:

```sh
npm run clamav:up
npm run clamav:test
```

For Cloud Run, prefer a sidecar scanner in the same service revision so the app
can connect to `127.0.0.1:3310`. The example template is
`deploy/cloud-run-clamav-sidecar.yaml.example`. Replace the image, project,
bucket, and secret-backed environment values before deploying with
`gcloud run services replace`.

ClamAV should remain one control in the upload pipeline, not the entire document
security posture. Keep uploaded documents in private GCS storage, block access
when scan metadata is missing or failed, and add separate sensitive-data
classification for identity, banking, and medical documents.

Copy `.env.example` into the deployment secret manager and replace every sample
value. Never commit the resulting environment file. Production startup rejects
local file storage, basic malware scanning, wildcard CORS, development bypasses,
an unavailable Firestore database, and an empty/unmigrated database.
The three `BANK_TRANSFER_*` values must identify the reviewed escrow collection
account and must be changed only through an approved, audited secret rotation.

## Database initialization and migration

Production does not auto-seed demonstration data. Apply an independently reviewed
migration using a least-privilege administrative job, verify collection counts
and indexes, and then start the application. Back up Firestore before migrations.
Test point-in-time recovery and document the recovery-time and recovery-point
objectives before accepting customer data.

## Deployment

1. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and
   `npm audit --omit=dev --audit-level=high`.
2. Build the Docker image from the repository root and scan it for vulnerabilities.
3. Deploy by immutable image digest with at least two instances.
4. Configure liveness at `/health/live` and readiness at `/health/ready`.
5. Perform a canary rollout and verify authentication, Firestore, GCS, ClamAV,
   request throttling, structured audit events, and graceful termination.

## Payment-provider integration gate

Before enabling escrow payments, implement a provider adapter and authenticated
webhook that verifies signatures against the raw request body, rejects replayed
event IDs, stores an append-only ledger, reconciles provider settlements, and
advances escrow through valid transitions transactionally. Browser requests must
never be able to assert that money moved. Add refund, dispute, timeout, and
manual-review procedures and obtain appropriate legal/compliance review.

## Monitoring and incident response

Alert on readiness failures, elevated 5xx/401/403/429 rates, Firestore and GCS
latency/errors, malware-scanner failures, webhook signature failures, and
unexpected escrow transitions. Forward structured logs to restricted centralized
storage without access tokens or document contents. Define on-call ownership,
severity levels, notification paths, credential-rotation procedures, breach
response, and customer/regulator notification requirements.

## Data governance

Define retention and deletion schedules for identity, financing, inspection,
chat, audit, and uploaded-document data. Restrict staff access by role, log every
privileged read, conduct periodic access reviews, and complete applicable privacy,
medical-device marketplace, financial-services, and consumer-protection reviews
for every country served.
