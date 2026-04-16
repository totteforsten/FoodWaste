# Ferry Food &amp; Beverage Waste Tracker

A production-ready, integration-first food waste tracking and KPI platform for **ferry operators' food &amp; beverage segment**. Covers customer food/beverage, kitchen (prep &amp; spoilage), buffet / overproduction, guest plate waste, and crew meal waste — across fleet, vessel, voyage, and outlet.

Built on **Next.js 14 (App Router) + Firebase (Auth / Firestore / Storage) + Vercel** with a first-class REST API, webhooks, and CSV exports aligned to the **FLW Protocol**, **WRAP HaFS**, and **MARPOL Annex V**.

Inspired by [Generation Waste](https://generationwaste.com) and styled after [Stena Line](https://stenaline.com).

---

## 1. What's in the box

### Core capabilities
- **Multi-vessel, multi-outlet**: fleet → vessel → outlet → voyage data model.
- **Waste logging**: kitchen prep, spoilage, overproduction/buffet, plate (post-consumer), crew/employee meal, beverage spill — with reason codes, photo, notes, destination.
- **Normalization**: any unit (kg, g, l, ml, portions, covers) → kg, with automatic cost and CO₂e estimation.
- **Voyage scorecards**: atomic reporting unit for ferries — per-sailing kg/cover, cost, CO₂e, % of revenue.
- **KPI dashboard** with trend, donut, and ranked charts. Benchmarks against **IFWC 2021 HaFS = 115 g/cover**.
- **Sustainability view** mapped to **SDG 12.3**, **Champions 12.3**, **Courtauld 2030**, and avoidable-vs-unavoidable split.
- **MARPOL Annex V Garbage Record Book** export (Category B food waste) — date, position, kg, m³, discharge method.
- **FLW Protocol** CSV export — timeframe, material, destination, quantity.
- **Finance rollup** — per-vessel, per-outlet waste cost for menu engineering and P&amp;L.
- **Daily rollups** computed by **Vercel Cron**.

### Integration layer
- **REST API** under `/api/v1/*` (see [§ 6 API](#6-api-reference)).
- **Two auth modes**: Firebase ID token (Bearer) for web/mobile users, `X-API-Key` for system-to-system.
- **Webhooks** with HMAC-SHA256 signatures: `waste.created`, `waste.updated`, `voyage.closed`, `rollup.daily`.
- **Scoped API keys** (`waste:read`, `waste:write`, `voyages:*`, `menu:*`, `rollups:read`).
- **CSV exports** for POS/BI/sustainability tools.
- **Firestore-native** — also queryable directly from any Firebase SDK.

### Demo mode
The app **runs without Firebase** using deterministic mock data for 3 vessels × 60 days, so Vercel preview deployments showcase the UI immediately. Add Firebase credentials in `.env.local` to go live.

---

## 2. Data model (Firestore)

```
orgs/{orgId}
  vessels/{vesselId}            — ferry, IMO, route, pax capacity
  outlets/{outletId}            — buffet / à la carte / bar / café / crew mess / …
  menuItems/{itemId}            — portion weight, COGS, price, emission factor
  voyages/{voyageId}            — sailing reference, ports, depart/arrive, pax, covers, revenue
  wasteEntries/{entryId}        — core fact table (see below)
  dailyRollups/{vesselId_YYYY-MM-DD}
  apiKeys/{keyId}               — hashed, scoped integration keys
  webhooks/{hookId}             — subscriber URLs + events + secret
users/{uid}                     — orgId, roles, assignedVesselIds
```

### WasteEntry (the fact table)

| field          | type                                   | notes |
| -------------- | -------------------------------------- | ----- |
| vesselId       | string                                 | required |
| voyageId       | string?                                | links to sailing |
| outletId       | string                                 | required |
| menuItemId     | string?                                | enables menu-engineering analytics |
| stream         | `food` \| `beverage` \| `packaging` \| `inedible` | FLW material type |
| stage          | `pre_consumer_prep` \| `pre_consumer_spoil` \| `pre_consumer_over` \| `post_consumer_plate` \| `employee_meal` \| `beverage_spill` \| `returned` | lifecycle stage |
| destination    | `landfill` \| `incineration` \| `anaerobic_digestion` \| `composting` \| `animal_feed` \| `donation` \| `discharge_at_sea` \| `port_reception_facility` | aligned to MARPOL + FLW |
| quantity, unit | number, enum                           | raw input |
| weightKg       | number                                 | normalized |
| estimatedCost, estimatedCo2eKg | number?               | computed |
| reason         | string?                                | standardized reason code — see `REASON_CODES` |
| occurredAt, createdAt | number                         | unix ms |
| source         | `web` \| `mobile` \| `scale` \| `api`  | provenance |

---

## 3. Taxonomy

The app deliberately presents a **simple four-bucket** primary taxonomy (matching Generation Waste and staff expectations) layered on top of an **FLW-compliant** detailed stage taxonomy for reporting:

| Simple bucket       | Detailed stages                                                | FLW stage |
| ------------------- | ---------------------------------------------------------------| --------- |
| **Kitchen**         | prep / trim, spoilage, cooking error                           | pre-consumer |
| **Buffet**          | overproduction, end-of-service display                         | pre-consumer |
| **Plate**           | guest plate waste, returned                                    | post-consumer |
| **Crew**            | employee meal waste                                            | employee |
| *Beverage*          | draft-line purge, spill                                        | service |

Destinations directly map to **MARPOL Annex V garbage category B** (food wastes) discharge methods.

---

## 4. KPIs &amp; benchmarks

Headline KPIs surfaced on the dashboard:

- **g / cover** (primary) — IFWC HaFS 2021 benchmark = **115 g/cover**.
- **Cost of waste** — absolute + % of revenue + € / cover.
- **CO₂e (kg)** — default 2.5 kg CO₂e per kg food waste (WRAP / UNEP); configurable per org.
- **Diversion rate** — % away from landfill / incineration.
- **Avoidable vs unavoidable** — `inedible` stream flagged unavoidable.
- **SDG 12.3 progress** — halve g/cover vs baseline.
- **Per-vessel leaderboard** and **top outlets** / **top wasted items**.

Reports are available at daily, weekly, per-voyage, per-vessel, and fleet cadence, plus 90-day FLW CSV and MARPOL GRB CSV exports.

---

## 5. Getting started

### Prerequisites
- Node.js 18.17+
- A Firebase project (optional — demo mode works without it)
- A Vercel account (optional for deploy)

### Local dev

```bash
npm install
cp .env.example .env.local   # edit with your Firebase keys OR leave empty for demo mode
npm run dev                  # http://localhost:3000
```

### Firebase setup
1. Create a Firebase project; enable **Auth** (email or Google), **Firestore**, **Storage**.
2. Deploy the included rules and indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
3. Create a service account → JSON → base64 encode → set `FIREBASE_ADMIN_CREDENTIALS_B64`.
4. Copy the web config into `NEXT_PUBLIC_FIREBASE_*` env vars.
5. Seed your org: create `orgs/{yourOrgId}` and add vessels &amp; outlets, or POST to `/api/v1/voyages` etc.

### Deploy to Vercel

```bash
vercel link
vercel env add FIREBASE_ADMIN_CREDENTIALS_B64   # and all NEXT_PUBLIC_FIREBASE_*
vercel env add INTEGRATION_API_KEYS             # format: key_xxx:orgId:scope,scope
vercel deploy --prod
```

The `vercel.json` configures:
- `arn1` (Stockholm) region for EU-data residency
- Daily cron at 01:15 UTC → `/api/cron/daily-rollup`
- Security headers on all API routes

---

## 6. API reference

Base URL: `https://your-app.vercel.app/api/v1`

### Auth

Either:

```http
Authorization: Bearer <Firebase ID token>
```

or:

```http
X-API-Key: <your-integration-key>
```

In demo mode (no admin credentials, no `INTEGRATION_API_KEYS` set), **unauthenticated read-only access** is allowed so the dashboard renders.

### Endpoints

| Method | Path                              | Scope          | Description |
| ------ | --------------------------------- | -------------- | ----------- |
| GET    | `/health`                         | public         | Service info |
| GET    | `/waste?vesselId=&voyageId=&since=&limit=` | `waste:read`   | List entries |
| POST   | `/waste`                          | `waste:write`  | Create entry (see below) |
| GET    | `/voyages`                        | `voyages:read` | List voyages |
| POST   | `/voyages`                        | `voyages:write`| Create voyage |
| GET    | `/kpis?days=30&vesselId=`         | `rollups:read` | Dashboard KPIs |
| GET    | `/rollups/daily?days=30&vesselId=`| `rollups:read` | Daily aggregates |
| GET    | `/exports/flw?days=90`            | `rollups:read` | FLW CSV |
| GET    | `/exports/marpol?days=90`         | `rollups:read` | MARPOL GRB Category B CSV |
| GET    | `/exports/finance?days=30`        | `rollups:read` | Per-vessel/outlet cost CSV |

### Create waste entry

```http
POST /api/v1/waste
Content-Type: application/json
X-API-Key: key_demo_rotate_me

{
  "vesselId": "v_germanica",
  "outletId": "o_germ_buffet",
  "voyageId": "voy_v_germanica_0",
  "stream": "food",
  "stage": "pre_consumer_over",
  "destination": "port_reception_facility",
  "quantity": 4.2,
  "unit": "kg",
  "reason": "display_end_of_service"
}
```

### Webhook payload

```json
{
  "id": "waste.created_1713268800000",
  "event": "waste.created",
  "orgId": "stena",
  "data": { "id": "abc123", "weightKg": 4.2, "stage": "pre_consumer_over", "..." : "..." },
  "createdAt": 1713268800000
}
```

Verify with:

```js
const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
req.headers["x-foodwaste-signature"] === `sha256=${expected}`;
```

---

## 7. Compliance &amp; standards

| Standard | Coverage in app |
| -------- | --------------- |
| **FLW Protocol / FLW Standard** (WRI/WBCSD) | Material type, destination, quantity, timeframe, boundary — CSV export |
| **WRAP HaFS / Courtauld 2030** | Per-cover reduction, avoidable/unavoidable split |
| **SDG 12.3 / Champions 12.3** | Progress toward 50% reduction vs baseline |
| **IFWC HaFS benchmark** | 115 g/cover comparison on every dashboard |
| **UNEP Food Waste Index 2024** | Fleet-level per-capita reporting |
| **MARPOL Annex V** | Garbage Record Book Category B export: date, position, kg, m³, discharge |
| **GRI 306 / CSRD** | Via FLW + finance exports |
| **Sustainable Hospitality Alliance HWMM** | Aligned methodology |

---

## 8. Spec additions (beyond original ask)

The original brief covered customer F&amp;B waste, kitchen waste, and employee waste. I added the following items that a production ferry F&amp;B waste system typically needs and that were missing from the brief:

1. **Voyage / sailing as atomic unit** — ferries need per-sailing scorecards, not just daily rollups.
2. **MARPOL Annex V compliance** — legally required for ships ≥400 GT on international voyages; Garbage Record Book Category B export + m³ estimation.
3. **Multi-vessel / multi-outlet hierarchy** — fleet-wide comparison is the #1 executive view.
4. **Reason codes taxonomy** — standardized across vessels so data is aggregable (Winnow/Leanpath convention).
5. **Avoidable vs unavoidable** — `inedible` stream (bones, peels) isolated from reduction target.
6. **Emission factor per org** — different fleets, different cuisines, different CO₂e assumptions.
7. **SDG 12.3 progress view** — executive sustainability narrative.
8. **Daily rollups via Vercel Cron** — performance + historical fidelity even if entries are backfilled.
9. **Two-mode auth** (Firebase ID + API key) — supports both staff tablets and server-to-server POS/scale integrations.
10. **Photo attachments via Firebase Storage** — evidence for high-value waste events and auditability.
11. **Beverage-specific stage (`beverage_spill`)** — draft-line purges and breakage are major categories on ferries.
12. **Crew mess as first-class outlet type** — distinct cost codes and separate from guest F&amp;B.
13. **AIS / bridge integration placeholder** — MARPOL GRB needs ship position at time of discharge; documented as a connector target.
14. **Demo mode** — live-looking UI on any preview deploy without needing Firebase provisioned.

---

## 9. Project layout

```
src/
  app/
    page.tsx                    ← Dashboard
    log/                        ← Waste logging form
    voyages/, vessels/          ← Operate
    reports/, sustainability/   ← Analyze
    menu/, integrations/, settings/ ← Configure
    api/v1/                     ← REST API
    api/cron/                   ← Daily rollup cron
  components/                   ← Sidebar, Charts, KpiCard
  lib/
    firebase-admin.ts, firebase-client.ts
    data-source.ts              ← Firestore ↔ mock-data adapter
    kpis.ts                     ← Pure aggregation helpers
    taxonomy.ts                 ← FLW / MARPOL labels &amp; conversions
    schemas.ts                  ← Zod input validation
    api-auth.ts, webhooks.ts    ← Integration plumbing
    mock-data.ts                ← Deterministic demo seed
  types/domain.ts               ← Core TypeScript types
firestore.rules, firestore.indexes.json, storage.rules, firebase.json
vercel.json                     ← regions + cron + security headers
```

---

## 10. Roadmap

- Smart scale BLE/WiFi ingestion (Mettler, Bizerba) via `/api/v1/ingest/scale`
- Winnow-style AI image classification (camera over the bin)
- Predictive forecasting (overproduction reduction via ML)
- Offline-first PWA for galley tablets
- Firebase Auth UI + org onboarding flow
- Role-based dashboards for chef vs F&amp;B manager vs sustainability lead
- Integration templates for Adyen / Shiji Infrasys / Oracle Simphony POS
- Per-voyage AIS position capture for MARPOL GRB automation
- Multi-language (Swedish, Danish, German, English) for ferry crews

---

## 11. Credits &amp; references

- [Food Loss &amp; Waste Protocol](https://flwprotocol.org/)
- [UNEP Food Waste Index 2024](https://www.unep.org/resources/publication/food-waste-index-report-2024)
- [WRAP Hospitality &amp; Food Service](https://www.wrap.ngo/taking-action/food-drink/sectors/hospitality-food-service)
- [IMO MARPOL Annex V](https://www.imo.org/en/ourwork/environment/pages/garbage-default.aspx)
- [Generation Waste](https://generationwaste.com) — primary inspiration
- [Winnow](https://winnowsolutions.com), [Leanpath](https://leanpath.com) — industry references
- Visual identity inspired by [Stena Line](https://stenaline.com) — colors are best-effort approximations from publicly visible assets; verify with official brand team before production use.
