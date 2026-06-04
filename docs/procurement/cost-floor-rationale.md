# Cost-floor rationale — grading the GB MIS against the TOR's standards

**Audience.** MOGCSP procurement committee, the LWEP PMU, the World Bank
task team, and any firm preparing or evaluating a bid against the
[Final TOR](../../README.md) for the Gender-based Management Information
System.

**Why this document exists.** The TOR does not name a price band. Bids
will arrive across a wide spread, and the evaluation panel needs a way
to look past the headline number to the **standards each price actually
meets**. Because the data this system holds is GBV survivor data,
under-pricing here is not a finance question — it is a question of
whether the resulting system meets the standards the TOR sets.

This document grades the system the TOR scopes:

1. Enumerates the **TOR's stated standards** that drive cost.
2. For each standard, names what **honestly meeting it demands** — the
   roles, the time, the artifacts, the verifications.
3. Aggregates those demands to the **$200K USD floor** for a competent,
   Liberia-based delivery.
4. Translates each step below the floor into the **specific TOR
   standards that go unmet** and the **survivor-impact outcomes** that
   follow.

The numbers below are stated in USD. Where ranges are given, the lower
end assumes an all-Liberian team with one international specialist; the
upper end assumes a regional firm with a higher proportion of
international staff.

---

## 1. The TOR's standards that drive cost

The TOR specifies — sometimes in the body, sometimes in the bracketed
clarifications, sometimes in the Key Tasks list — a set of standards
the system must meet. They are not optional. Each one carries a
specific cost, summarised in §2.

| # | Standard (paraphrased from the TOR) | Source |
|---|---|---|
| S1 | Captures sex-disaggregated data, integrates secondary sources (LISGIS, MoH, MoE, REALISE, etc.), and produces real-time dashboards | TOR Description + Key Tasks |
| S2 | Accommodates the indicator universe: BPfA (12 areas), CEDAW, SDG-5 (48-indicator minimum set), Maputo Protocol, AU WPS, ARREST Agenda, National Gender Policy | TOR Description + List of Indicators |
| S3 | Six-county geographic coverage with on-site training in each (Bomi, Gbarpolu, Grand Cape Mount, Grand Gedeh, Rural Montserrado, River Cess) | TOR project area |
| S4 | Offline-capable tablet / mobile data capture with secure sync, validation rules, and supervisor review workflow for counties | TOR Key Tasks (bracketed clarification) |
| S5 | API interoperability with existing ministry systems, **especially REALISE**, to avoid duplicate data collection | TOR Key Tasks |
| S6 | Role-based access control across the seven named roles: SUPER_ADMIN, ADMIN, SUPERVISOR, CASE_WORKER, DATA_ENTRY_CLERK, ANALYST, VIEWER | TOR Key Tasks |
| S7 | MFA for administrators; encryption in transit and at rest; detailed audit logs for all sensitive actions (create/edit/delete/export) | TOR Key Tasks (bracketed clarification) |
| S8 | Automated backup + disaster recovery; bidders to propose hosting (Cloud / On-Prem / Hybrid) with uptime target, backup schedule, RPO/RTO, and a cost comparison | TOR Key Tasks (bracketed clarification) |
| S9 | Full compliance with Liberia Data Protection guidelines and applicable GDPR principles | TOR Key Tasks |
| S10 | Comprehensive training delivery: training materials, video walkthroughs, printed user guides, train-the-trainer, on-site sessions per county | TOR Expected Deliverables |
| S11 | Field testing + debugging + refinement before launch | TOR Key Deliverables (Week 11) |
| S12 | 6-month minimum post-deployment support, including bug fixes, performance tuning, minor enhancements, and refresher training | TOR Expected Deliverables (bracketed clarification suggests 12 months) |
| S13 | WB acceptance gates via the Audit Trail Form (`Anex_1`); 5-working-day Deputy Minister approval window after each deliverable | TOR Supervision and Reporting + Performance Evaluation |
| S14 | Source code, databases, administrator credentials, signing certificates, and cloud accounts handed over as **sole property of MOGCSP**, with no consultant lock-in | TOR Expected Deliverables |
| S15 | Server capacity, UPS, and internet connectivity recommendations for MOGCSP infrastructure planning | TOR Expected Deliverables |
| S16 | Suggested revisions to the existing M&E Manual for compatibility with the new system | TOR Key Tasks |
| S17 | Coordination with web designer for public-facing project website integration | TOR Key Tasks |
| S18 | Dashboards / visualisations using tools such as Power BI or Tableau (examples; any defensible BI tool acceptable) | TOR Expected Deliverables (bracketed clarification: any secure, scalable stack) |
| S19 | Test Driven Development; OpenAPI / RESTful interoperability; responsive UI/UX for tablet screens | TOR Required Qualification (j) |
| S20 | Gender-sensitive design; GBV-data ethical handling; survivor-safety operating norms | TOR Description + Required Qualification (k) + Skills + WB Good Practice Note on GBV |

The standards interact: meeting S4 (offline capture) without S7 (encryption at rest) is meaningless; meeting S2 (indicators) without S5 (REALISE API) duplicates data collection the TOR explicitly forbids; meeting S10 (training) without S20 (GBV-sensitive design) trains case workers on a system that may itself harm survivors.

This interaction is why the floor is not a sum of cheapest line items — each standard depends on others being met to a comparable level.

---

## 2. What meeting each standard costs

Below is the labour and direct cost demanded by each TOR standard,
allocated against the 16-week TOR effort window. Numbers are for a
Liberia-based firm with one international specialist; an all-international
delivery would be ~2× across the board.

### 2.1 Architecture, design, and core build (S1, S2, S5, S6, S19)

| Demand | Cost driver |
|---|---|
| Software architect to design the schema, RBAC, RLS, integration surface | Lead Developer / Software Architect, 13 weeks at 80% utilisation |
| Database specialist for the indicator catalog, secondary-data ingestion, audit table, encryption-column model | DB & Data Management Specialist, 10 weeks at 60% |
| Junior developer to handle CRUD, forms, reports | 12 weeks |
| API design + OpenAPI generation + REST conventions + integration stubs (DHIS2 / REALISE / LISGIS) | included in architect time |

**Subtotal: ~$110K labour**, plus the bidder's share of overhead.

### 2.2 Survivor-safety and compliance (S7, S9, S20)

| Demand | Cost driver |
|---|---|
| Gender Specialist with documented GBV-data experience (5+ years) to lead the DPIA, review intake-form language for re-traumatisation, validate consent workflows, sign off on UAT survivor-impact assessment | 5 weeks at 30% utilisation |
| External penetration test by a regional cybersecurity firm before Go-Live (Stage 4) | $15–25K direct cost |
| Encryption-at-rest implementation: column-level encryption with key management, mobile SQLCipher binding with hardware-backed device key, backup-encryption process | included in architect / lead developer time |
| DPIA produced and signed off by the DPO; Liberia Data Protection compliance review | 1–2 weeks of Gender Specialist + Team Lead time |

**Subtotal: ~$25K labour + $15–25K direct**. The Gender Specialist is
the single most consequential line item in the bid. It is also where
under-priced bids cut first because it is the easiest line to omit
without the rest of the proposal looking wrong — see §4 and §5.

### 2.3 Mobile + offline + supervisor review (S4)

| Demand | Cost driver |
|---|---|
| Mobile build (Android, per TOR; iOS is deferred): offline-first data store with encryption at rest, sync protocol, server-authoritative conflict resolution | included in architect + lead developer time |
| Supervisor review workflow: case worker submits → supervisor approves or returns with notes → two-eyes principle enforced server-side | included in lead developer + architect time; verified in QA |
| Validation rules at intake (TOR-explicit) | included in lead developer time |

This standard is met inside the architect / lead-developer budget already
captured in §2.1 — but only if the bid is for a competent team. A
team without mobile-offline experience will spend the project's slack
budget figuring it out, with knock-on effects on every other line.

### 2.4 Authentication + access control + audit (S6, S7)

| Demand | Cost driver |
|---|---|
| Keycloak or equivalent IdP integration with MFA enforcement for ADMIN+ roles | included in architect time |
| RBAC for the seven roles with effective-permission union semantics | included in lead developer time |
| Audit log architecture: append-only, tamper-evident (hash chain), retention tiering, queryable by action class | 1–2 weeks of architect + DB specialist focus |

**Subtotal: included in §2.1, but worth calling out** because under-priced bids
typically skip the hash chain (loses tamper-evidence), the MFA enforcement
(treats Keycloak's enrolment as sufficient), or both.

### 2.5 Backup, DR, hosting comparison (S8, S15)

| Demand | Cost driver |
|---|---|
| Hosting cost comparison: Cloud (Azure / AWS) primary vs. On-Prem vs. Hybrid, with priced 5-year TCO and DR posture | 1–2 weeks of Team Lead + Architect |
| pg_basebackup + WAL archiving design sized to 15-minute RPO | included in architect time |
| Disaster-recovery rehearsal during Stage 4 (TOR's 4-hour RTO target) | 1 week of architect + ops time |
| Server capacity / UPS / connectivity recommendation document for MOGCSP | 0.5 week of architect time |

**Subtotal: ~$8–12K labour.** The DR rehearsal is the line most often
quietly omitted; it is also the one most likely to fail in practice
because the team has never actually restored the system from backup.

### 2.6 Training delivery in 6 counties (S3, S10)

This is the **largest single bucket** in any honest bid.

| Demand | Cost driver |
|---|---|
| Training materials production: PDF user guides per role, video walkthroughs per workflow, printable field quick-reference cards, mobile app field guide | 4 weeks of training coordinator + 1 week of Gender Specialist review |
| Train-the-trainer sessions for a cadre of MOGCSP staff | 1 week of training coordinator + Team Lead |
| **6 on-site training workshops** (one per county; minimum, ideally 2 rounds) | Trainer days × 6 counties × 2 rounds × per-county session length |
| Travel + per diem + accommodation for trainers across 6 counties in Liberia's rural areas | $20–35K direct cost depending on clustering and season |
| Training evaluation + capacity-building report | 1 week of training coordinator |

**Subtotal: ~$25K labour + $25K direct ≈ $50K**, before any
follow-up sessions in Phase 2.

The TOR is explicit that this is one of four payment deliverables
worth 40% of the contract value. Bids that allocate less than this
proportion to training have not internalised what 6-county delivery
in Liberia actually costs.

### 2.7 Field testing + refinement (S11)

| Demand | Cost driver |
|---|---|
| Week-11 field test across counties; trained users exercise the live system; defects logged, triaged, fixed before Final Presentation | 1 week of lead developer + Team Lead on standby; partial Gender Specialist availability |
| Defect-fix sprint immediately after field test | 1 week dev capacity reserved |

**Subtotal: ~$10K labour.** The bid that does not reserve this capacity
discovers field defects in production rather than staging.

### 2.8 Post-deployment support (S12)

| Demand | Cost driver |
|---|---|
| 6 months of on-call support for bug fixes, performance tuning, minor enhancements | 4 weeks of effort distributed across 6 months (per TOR) |
| Refresher training during the first 6 months of operationalisation | 1–2 weeks of training coordinator |
| Health-check review of production system | 0.5 week of architect time |

**Subtotal: ~$25K labour**, structured as on-call retainer rather than
continuous full-time work.

### 2.9 WB acceptance and handover discipline (S13, S14, S16)

| Demand | Cost driver |
|---|---|
| Production of formally-structured deliverables (Inception Report, Architecture Design Document, Security Plan, DPIA, runbooks, training package, UAT report, pen-test report, Go-Live report, Close-out report) | 2 weeks of Team Lead time across the project |
| Audit Trail Form discipline: every deliverable submitted in the format the Deputy Minister reviews; 5-working-day window respected | included in Team Lead time |
| M&E Manual revision suggestions (TOR-explicit, often missed) | 1 week of Team Lead + Gender Specialist |
| Source code, infrastructure, key custody handover to MOGCSP with credentials rotated; no consultant lock-in | 1 week of architect + Team Lead |
| Coordination with the public website team (TOR-explicit) | 0.5 week |

**Subtotal: ~$15K labour.** Under-priced bids that skip this discipline
fail their first Audit Trail Form review and lose 2–3 weeks of project
time re-formatting deliverables.

### 2.10 Aggregate floor

```
Labour (Liberia-based, one international Gender Specialist):

  Architecture + core build      (§2.1)         ~$110,000
  Survivor-safety + DPIA + GBV    (§2.2)          $25,000
  Mobile/offline                  (§2.3)          included
  Auth + audit                    (§2.4)          included
  Backup + DR + hosting paper     (§2.5)          $10,000
  Training delivery               (§2.6)          $25,000
  Field testing                   (§2.7)          $10,000
  Post-deployment support         (§2.8)          $25,000
  WB discipline + handover        (§2.9)          $15,000
                                                ──────────
                                                ~$220,000

Direct costs:

  External pen-test                              $15–25,000
  Travel + per diem (6 counties × 2 rounds)      $20–35,000
                                                ──────────
                                                ~$35–60,000

  Subtotal (labour + direct)                    ~$255–280,000
  Less: efficiency by an experienced firm         -$55–80,000
                                                ──────────
  Floor for a competent delivery                ~$200,000
```

The $55–80K efficiency line is what an experienced firm can plausibly
realise via reused organisational know-how (workflow templates, prior
Liberia operations, established trainer rosters, established
pen-test vendor relationships). It is **not** a free margin — it is
work that must already have been done by the firm on other projects
to be available here.

A firm without that prior body of work cannot meet $200K. They can
meet $260–280K honestly, or they can promise $200K and miss the
standards in §1.

---

## 3. Why a competent firm might take the floor — relationship pricing

A firm pricing honestly at the floor is doing so for reasons that are
not in this contract's P&L. These reasons are legitimate and should be
disclosed:

1. **Long-term ministry relationship.** A successful GB MIS delivery
   makes the firm the default partner for subsequent MOGCSP digital
   work: hosting maintenance, expansion to additional ministries,
   national rollout beyond LWEP, future indicator additions.
2. **Reference customer.** A WB-acknowledged GBV MIS in Liberia is a
   strong reference for similar tenders in the region.
3. **Pipeline of WB work.** Firms with documented WB deliveries get
   shortlisted faster on subsequent procurements.
4. **Phase-2 follow-on.** The 4-week post-deployment effort is the
   start of a longer relationship; renewal or expansion is contracted
   separately.
5. **Mission alignment.** Some firms — particularly Liberian or
   regional firms with social-sector roots — will absorb margin to
   work on survivor-safety systems. This is a legitimate motivation,
   not a euphemism for incompetence.

**This is honest disclosure.** The $200K floor depends on motivations
the firm cannot guarantee for the next decade. A successor firm
picking up maintenance at year three will charge market rate, and
MOGCSP should budget for that.

> ⚠️ **The relationship-pricing assumption is fragile.** It depends
> on MOGCSP treating the relationship as a partnership — paying
> invoices promptly, sharing scope changes in writing, respecting the
> 5-working-day approval window, and engaging the firm on Phase 2
> follow-on work. If those don't happen, the next firm MOGCSP needs
> will price at market.

---

## 4. The strain of operating at $200K

Even at the floor with relationship pricing disclosed, a firm has no
slack for surprises. The specific pressure points:

| Pressure point | Why it strains |
|---|---|
| Rural travel logistics in 6 counties | Vehicles, fuel, per diem, accommodation — Liberia rural logistics has hidden costs. A single failed trip (impassable road in rainy season) costs $2–5K |
| Pen-test remediation | If the external pen-test finds 2+ high-severity issues, remediation eats 1–2 weeks of dev time the budget didn't allocate |
| Scope creep | A late-arriving requirement (a 49th indicator, a partner ministry asking for a custom view) cannot be absorbed; it must be a change order |
| Stakeholder workshop overruns | A second ministry workshop puts the Gender Specialist's 5 weeks 20% over budget |
| Translation needed mid-project | If a second locale is requested mid-rollout, the only acceptable response is a change order |
| Pen-test re-test | If findings warrant a re-test, the firm pays for it |
| First-month support volume | Weeks 1–4 typically eat 50% of the 6-month support bucket |

A firm taking $200K is committing to handle the above without margin.
They will be conservative on scope (rightly) and will say "no" to
verbally-requested additions. MOGCSP should expect this.

---

## 5. What happens below $200K — which TOR standards go unmet

The TOR has four payment tranches summing to 100%. Cutting the total
forces cuts inside those tranches, and those cuts map directly to
specific TOR standards in §1 not being met.

### 5.1 At $150K — "tight but defensible"

Approximately 25% below the floor. To make this number, the firm
absorbs the cut by:

- Reducing the Gender Specialist to **2 weeks** (from 5)
- Cutting the training coordinator role; the lead developer doubles as trainer
- Single round of training instead of two
- Pen-test compressed to ~$10K
- Junior developer reduced to 6 weeks
- DR rehearsal deferred (paper plan only)

**TOR standards that go partially unmet:**

| Standard | What slips |
|---|---|
| **S20** (Gender-sensitive design) | DPIA written under deadline; intake-form language not vetted by a GBV-clinician |
| **S10** (Comprehensive training) | One round = case workers see the system once on the day, never again |
| **S8** (DR posture) | RTO of 4 hours unverified — paper plan only |
| **S11** (Field testing + refinement) | Defects discovered in production rather than during field test |
| **S12** (Post-deployment support) | 6-month bucket consumed by week 12 on training fallout |

A $150K delivery **works** but produces a system MOGCSP must invest in
heavily after handover. The firm's risk: if anything goes wrong in
the field test (Week 11), there is no budget to fix it.

### 5.2 At $100K — "the wheels come off"

Approximately 50% below the floor. To make this number, the firm
must:

- Drop the Gender Specialist entirely or reduce to ad-hoc review
- Skip the external pen-test (use in-house security review only)
- Skip training in 3 of the 6 counties (cover via "cascade" from a trained county — which routinely fails)
- Reduce post-deployment support to 1 month or rely on email-only
- Run the team with one senior + one junior developer total
- Skip the M&E Manual revision deliverable
- No DR rehearsal

**TOR standards that go unmet:**

| Standard | Failure mode |
|---|---|
| **S20** (Gender-sensitive design) | DPIA written by a developer; no clinician review; intake-form language may re-traumatise survivors on first use |
| **S9** (Liberia DPA + GDPR) | DPIA fails an external compliance review; WB task team flags this; remediation becomes MOGCSP's problem to fund separately |
| **S7** (Encryption + MFA + audit) | No external attestation of security posture; first external audit (typically annual) finds at least one high-severity issue that was present at Go-Live |
| **S3 + S10** (Six-county training) | 3 of 6 counties trained by cascade from a colleague; by month 3, data entered inconsistently — duplicates, wrong intake-channel codes, missing consent records. **Reporting is no longer comparable across counties; SDG-5 / BPfA outputs become defensible only at national aggregate** |
| **S16** (M&E Manual revision) | Ministry's existing M&E Manual contradicts the new system; case workers default to the manual; data-quality improvements undone |
| **S8** (DR posture) | No rehearsal; first real outage exceeds the 4-hour RTO; survivor records inaccessible during the window |
| **S11** (Field testing) | Field test cursory; defects discovered in production weeks 4–12; case workers route around them with paper notes that reintroduce the very risks the system was built to eliminate |
| **S12** (Post-deployment support) | Effectively none after month 2; firm completes their hours and leaves |

A $100K delivery **damages MOGCSP** in measurable ways. The savings
relative to a $200K delivery (~$100K) are eaten — usually with
interest — by remediation costs in the first 18 months of operation.

### 5.3 At $50K — "marketing budget, not a delivery"

A bid at this level is one of three things:

1. A firm staffing the work entirely with juniors who will learn on
   MOGCSP time (the system will be functionally incomplete at
   handover).
2. A firm intending to recoup via change orders, hosting fees, and
   maintenance contracts later — turning the $50K into a $300–500K
   total cost of ownership over 24 months.
3. A firm that does not understand the scope (most common; an honest
   misjudgement).

In every case the outcome is **the system is rebuilt by someone else
within 18 months**, at MOGCSP's expense, with the original $50K paid
out for nothing usable.

This is the documented failure mode of under-priced ICT-for-development
contracts in the region. The evaluation panel should treat any bid at
this level as a **technical disqualification regardless of price**.

---

## 6. Cost cuts mapped to survivor-impact outcomes

The TOR repeatedly invokes survivor safety. This table makes the
cost-to-outcome translation explicit, keyed to the TOR standards in §1.

| What gets cut | TOR standard | Direct survivor-safety outcome |
|---|---|---|
| External pen-test | S7 | First vulnerability is found by an attacker or by a year-later audit — exposure window measured in months |
| Gender Specialist DPIA review | S20, S9 | Intake-form language not vetted; risk of re-traumatising survivors during questioning |
| Gender Specialist UAT review | S20 | Workflow steps misordered (e.g. consent collected after sensitive questions); survivor experience harmed |
| Training in some counties | S3, S10 | Inconsistent data entry → duplicates, mis-categorised cases → cross-county comparisons stop being reliable |
| Supervisor review workflow training | S4 | Two-eyes principle silently violated in practice (same person enters and reviews) → defeats the workflow's purpose |
| Post-deployment support | S12 | Field bugs found in weeks 4–12 go unfixed; case workers route around them with paper notes that reintroduce the risks |
| DR rehearsal | S8 | First real outage exceeds the 4-hour RTO; survivor records inaccessible |
| M&E Manual revision | S16 | Case workers default to the old manual; data quality regresses |
| Translation review on a second locale | S20 | Survivors who don't read English well give consent they didn't understand → consent records become legally challengeable |
| Audit-log hash-chain | S7 | Audit trail tampering becomes undetectable; breach forensics is unreliable |

---

## 7. Red flags an evaluation panel should look for

Independent of price, the following signal that a bid is unlikely to
deliver what the TOR scopes:

| Signal | Standard at risk | What it tells you |
|---|---|---|
| Pen-test line < $10K | S7 | External pen-test is not actually planned |
| Gender Specialist absent or < 2 weeks | S20, S9 | DPIA + survivor UX review will not happen to WB Good Practice Note depth |
| All-international team at low bid | n/a | Day-rates don't add up; either headcount is wrong or someone is doing two jobs |
| All-Liberian team but no named senior with WB delivery experience | S13 | Project will spend weeks on Audit Trail Form rejections |
| Single training trip to each county | S3, S10 | Workers see the system once; queue clogs with supervisor returns |
| No DR rehearsal in the workplan | S8 | The 4-hour RTO target is unverified |
| No external pen-test in Stage 4 | S7 | Non-compliant with TOR |
| Power BI / Tableau line items but no licensing | S18 | Either dashboards use an open-source tool (fine, must say so) or licensing cost shifts to MOGCSP |
| Support is email-only | S12 | Urgent survivor-data incidents have no response channel |
| Vague "infrastructure recommendations" deliverable | S15 | Server-capacity / UPS / connectivity assessment is missing |
| No M&E Manual revision deliverable | S16 | TOR-explicit miss |
| No "Coordination with web designer" item | S17 | TOR-explicit miss |

A bid scoring 3 or more of these signals should trigger a follow-up
conversation before scoring, regardless of price.

---

## 8. What the panel should ask each bidder

These questions, asked of every bid regardless of price, surface the
real shape of the offer:

1. List every line in your bid that totals more than $5,000. State
   the role, the rate, and the deliverable it produces.
2. Name the **external pen-test firm** you will engage and provide
   one of their published reports (redacted) on a comparable
   engagement.
3. Name the **Gender Specialist by role** and provide a CV
   demonstrating 5+ years of GBV-data work.
4. Describe how you will train **each of the six LWEP counties**
   (Bomi, Gbarpolu, Grand Cape Mount, Grand Gedeh, Rural
   Montserrado, River Cess), with travel-day estimates and
   per-county session count.
5. Show your **disaster-recovery rehearsal** plan and the budget
   line that funds it.
6. State the **post-deployment support hours per month** you commit
   to, the response-time SLA, and the channel (phone / Slack /
   email / on-site).
7. Identify **one risk** in your bid that, if it materialises, you
   cannot absorb at the quoted price — and explain how you would
   handle it.
8. Map your bid to the 20 standards in §1 of this document and
   indicate where each is met and by whom.

A bidder who cannot answer #7 candidly is hiding either margin or
risk; either is informative. A bidder who cannot answer #8 has not
read the TOR closely enough.

---

## 9. Bottom line for the panel

- **$200K is the honest floor** for a Liberia-based firm with one
  international specialist, the Gender Specialist and external
  pen-test funded, and relationship pricing disclosed. At this price
  the firm meets every TOR standard but has zero margin for
  surprises.
- **$150K is achievable** but cuts the Gender Specialist and most of
  the post-deployment support — standards S20, S10, S8, S11, S12
  go partially unmet. The system works; MOGCSP carries hidden cost
  after handover.
- **$100K is dangerous.** The list of TOR standards that go unmet in
  §5.2 is not speculation; it is the documented failure pattern of
  under-priced GBV-data MIS contracts in the region.
- **$50K is not a delivery price.** It is a marketing line intended
  to be expanded via change orders, or a misunderstanding of the
  scope. Either should disqualify the bid.

The panel's job is not to find the cheapest number. It is to find
the cheapest number **at which the system will, in actual operation,
meet the TOR's standards and protect the survivors whose data it
holds.** On the evidence in this document, $200K is that number.
