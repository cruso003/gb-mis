# Roadmap

This roadmap maps the 16 weeks of consultant effort (spread across 12 months of calendar time, per the TOR) to concrete deliverables, acceptance gates, and payment tranches. Phase 1 delivers and stabilises the platform; Phase 2 is on-call technical support and refresher training.

---

## Structure

- **Phase 1 — Delivery**: 12 weeks of effort across the first ~6 months
- **Phase 2 — Post-deployment support**: 4 weeks of effort across the following ~6 months

Each phase is organised into stages with an **acceptance gate** at the end. A gate is passed when the MOGCSP Technical Team reviews the deliverable using the Audit Trail Form (`Anex_1-_Audit_Trail_Form.docx`) and the Deputy Minister for Gender signs off within five working days of submission.

---

## Phase 1

### Stage 1 — Inception (Weeks 1–2)

**Goal**: confirm the scope, finalise open decisions, and lock in the integration partners.

**Activities**:
- Kick-off meeting with the MOGCSP PMU and World Bank task team
- Working sessions with MoH, MoE, MoA, MoL, MoJ, MFDP, LISGIS to confirm data-sharing arrangements
- Negotiate DHIS2 access (ideally through MoH's existing instance) — decide between a dedicated DHIS2 instance and a shared one
- Confirm REALISE integration surface with the REALISE PMU
- Finalise the hosting option from the three presented (cloud, on-prem, hybrid)
- Confirm the indicator catalog seed list and identify any Liberia-specific additions
- Confirm language requirements (English at launch; any second-language requirement identified)
- Identify the seven role incumbents and their data-access expectations
- Walk stakeholders through the data-model and security approach; capture objections

**Deliverables**:
1. **Inception Report** — confirms scope, stack, hosting, integration partners, timeline, risks
2. **Data-Sharing MOUs** drafted with each contributing ministry (signed during Stage 2)
3. **Updated WBS** in the project-tracking tool
4. **ADR log initialised** — any Inception-confirmed decisions recorded as ADRs

**Gate**: Inception Report approved by the Deputy Minister.

**Payment tranche**: 15%.

---

### Stage 2 — System Design & Prototype (Weeks 3–5)

**Goal**: stand up the skeleton of the system with core entities, auth, and a working dashboard.

**Activities**:
- Repository bootstrap: Turborepo monorepo, `apps/web`, `apps/mobile`, `apps/api`, `packages/db`, `packages/indicators`
- CI/CD pipeline (GitHub Actions or GitLab CI) with the test / lint / SAST gates from [SECURITY.md](./SECURITY.md)
- Keycloak deployed to the staging environment; initial realm configured
- Database schema for the Identity and Organisation contexts migrated; org-unit hierarchy seeded from LISGIS codes
- API scaffolding with auth, RBAC, and RLS wired end-to-end
- Web app shell with login, navigation, and a placeholder dashboard
- Mobile app shell with login and an empty local WatermelonDB
- Indicator catalog seeded from [INDICATORS_CATALOG.md](./INDICATORS_CATALOG.md)
- Prototype dashboard with three indicators wired to mock data

**Deliverables**:
1. **Prototype build** deployed to staging, accessible to the PMU
2. **Architecture Design Document** — locks in the choices from [ARCHITECTURE.md](./ARCHITECTURE.md), [TECH_STACK.md](./TECH_STACK.md), [DATA_MODEL.md](./DATA_MODEL.md)
3. **OpenAPI spec v0.1** committed and published
4. **Security Plan** derived from [SECURITY.md](./SECURITY.md) — signed by the MOGCSP ICT Director
5. **Data Protection Impact Assessment** draft — reviewed by the DPO

**Gate**: Prototype demonstration + Design Document approval by the MOGCSP Technical Team.

**Payment tranche**: 20%.

---

### Stage 3 — Core Development (Weeks 6–9)

**Goal**: build the productive modules — cases, beneficiaries, indicators, sync — with full test coverage.

**Activities**:
- [x] **Beneficiaries module**: creation flow with consent capture, household linking, REALISE dedup hook, livelihood grant recording, VSLA and community-session tracking
- [x] **Cases module**: intake, supervisor review workflow, incidents, services, referrals, attachments (with client-side encryption), case-specific cross-org grants
- [x] **Indicators module**: computation engine, manual-entry workflow, target-setting, DHIS2 mapping
- [x] **Secondary data ingestion**: ETL jobs for LISGIS CSV and DHS aggregate data; `SecondaryDataset` / `SecondaryDataPoint` Prisma models; BullMQ queue wired to `DatasetsModule` in the API; dataset list/detail/data-points endpoints; web datasets page
- [x] **Reports module**: templates for the monthly county report, quarterly LWEP report, and annual CEDAW follow-up (`ReportsService`); report-template cards on the web reports page
- [x] **Audit module**: event emission across all mutations and sensitive reads; hash-chain verification job
- [x] **DHIS2 sync worker**: push aggregate values on a schedule; pull org-unit metadata (stub wired to BullMQ)
- [x] **Mobile app**: WatermelonDB offline persistence with SQLite adapter; `GbvCaseModel`, `BeneficiaryModel`, `SyncRecordModel`; `SyncEngine` with pull (delta cursor) and push (batch upload, PENDING → SYNCED/FAILED); `CaseIntakeScreen` writing offline records; `useSyncStatus` hook for reactive pending count; biometric unlock; quick-exit control
- [x] **Web admin**: user and role management; integration configuration; audit review; indicator catalog management; secondary datasets page
- [x] **Public dashboard**: `GET /public/indicators` and `GET /public/counties` unauthenticated endpoints; Next.js ISR page at `/public/dashboard` with MOGCSP branding, framework-grouped indicator table, county breakdowns; k=5 data note in footer
- [x] **Localisation scaffolding**: web on `next-intl` with `apps/web/messages/en.json`; mobile on a lightweight `t()` helper with `apps/mobile/src/i18n/en.json`. Translation workflow + DPO sign-off requirement documented in `docs/i18n.md`
- [x] **Comprehensive test coverage**: first slice landed (Vitest in apps/api + packages/auth + packages/indicators; Playwright + axe-core for the public dashboard; Schemathesis schema-level in CI). Coverage grows incrementally
- [x] **Penetration test preparation**: hardening checklist + scope/ROE in `docs/pen-test/`

**Deliverables**:
1. [ ] **Feature-complete build** against the scope defined in [ARCHITECTURE.md](./ARCHITECTURE.md) ← in progress (see above)
2. [ ] **Test report** — coverage metrics, failing-test disposition, accessibility audit
3. [x] **Updated data-model documentation** reflecting any changes
4. [x] **Runbooks** for: deploy, rollback, backup/restore, disaster recovery, incident response (`docs/runbooks/`)
5. [x] **Operational dashboards** in Grafana — `infra/grafana/dashboards/api-operational.json` plots HTTP rate/latency/errors and audit emit health; OTel + Prometheus scrape wired in `infra/prometheus/`

**Gate**: internal UAT by the PMU and a sample of end-users; critical/high bugs triaged to zero before moving to Stage 4.

**Payment tranche**: 25%.

---

### Stage 4 — UAT, Training, and Rollout Preparation (Weeks 10–11)

**Goal**: get real users onto the system in a controlled environment and train the trainers.

**Activities**:
- **Formal User Acceptance Testing** with representatives from each role across the six counties
- **External penetration test** — critical and high findings remediated; medium findings ticketed with SLAs
- **Load testing** with k6 against staging at 5x expected launch load
- **Disaster-recovery rehearsal** — full restore from backup into an isolated environment, verified
- **Training materials**: role-based user guides (PDF), video walkthroughs per workflow, quick-reference cards for field workers, mobile app offline field guide
- **Train-the-trainer sessions**: a cadre of MOGCSP staff is certified to train their colleagues
- **Initial training workshops**: at minimum one per county, on-site
- **Data migration plan** finalised — which historical data is imported at launch, which is deferred
- **Go-Live runbook**: step-by-step cutover procedure, rollback criteria, stakeholder communication plan
- **Legal sign-offs**: DPIA finalised and approved by the DPO; data-sharing MOUs executed

**Deliverables**:
1. **UAT Report** — test cases, pass/fail, defects, resolution status
2. **Penetration Test Report** and remediation evidence
3. **Training materials package** — PDF, video, printable field guides
4. **Trained trainer roster** — named individuals per county
5. **Go-Live runbook** — dry-run completed
6. **Final DPIA** — signed by the DPO

**Gate**: UAT sign-off + Deputy Minister's go-live approval.

**Payment tranche**: 20%.

---

### Stage 5 — Go-Live and Field Test (Week 12)

**Goal**: production cutover, supervised field operation across all six LWEP counties, and stabilisation.

**Activities**:
- **Production deployment** per the Go-Live runbook
- **Data migration** for historical records identified in Stage 4
- **DNS cutover** and stakeholder announcement
- **On-site supervised operation** at each county office for at least one full working day
- **Real-time support channel** (Signal / WhatsApp / phone) staffed during working hours for the first two weeks
- **Daily stabilisation reviews** in Week 12 with the PMU
- **First DHIS2 sync cycle** observed and verified against MoH's instance
- **First REALISE dedup cycle** observed and verified
- **First scheduled indicator recomputation** verified
- **First external dashboard refresh** verified

**Deliverables**:
1. **Running production system** accessible from all six LWEP counties and MOGCSP HQ
2. **Go-Live Report** — cutover record, issues and resolutions, performance observations
3. **User adoption metrics** baseline captured (logins, cases created, records entered per county)

**Gate**: Go-Live Report approved; system operating at target availability for 7 consecutive days; no unresolved critical bugs.

**Payment tranche**: 10%.

---

### Stage 6 — Final Presentation and Handover (end of Week 12)

**Goal**: transfer ownership of the running system to MOGCSP completely, with no residual consultant dependencies.

**Activities**:
- **Final presentation** to the Deputy Minister, the PMU, and the World Bank task team
- **Source code handover** to the MOGCSP-controlled Git hosting (a MOGCSP GitHub / GitLab organisation, with the consultant as a time-bounded collaborator)
- **Infrastructure handover**: cloud account ownership or datacentre handover, depending on hosting choice; all credentials rotated at handover so the consultant has no residual access
- **Key custody handover**: cryptographic keys transferred to the MOGCSP key custody chain with the two-person authorisation roles reassigned to named MOGCSP staff
- **Documentation handover**: all documents in this `/docs` folder, the runbooks, the DPIA, the penetration test report, the SBOM, and the training materials delivered to the MOGCSP document management system
- **Warranty period** begins — 90 days from handover, during which critical and high bugs introduced during Phase 1 are fixed at no additional cost

**Deliverables**:
1. **Handover Certificate** — signed by the Deputy Minister and the consultant's lead
2. **Complete documentation bundle** in MOGCSP's document system
3. **Source code, infrastructure, and key ownership** transferred
4. **Final presentation deck** filed with the PMU

**Gate**: Handover Certificate signed.

**Payment tranche**: 10%.

---

## Phase 2 — Post-deployment support (4 weeks of effort over the next ~6 months)

### Month 2 after Go-Live (1 week of effort)

- Health-check review of the production system — performance, error rates, sync success rates, DHIS2 sync success
- Refresher training for any counties reporting adoption issues
- Triage and resolution of bugs surfaced in real operation
- First quarterly indicator catalog review with the M&E officer

### Month 3–4 after Go-Live (1 week of effort)

- Refresher training focused on advanced workflows (supervisor review, cross-org referrals, analyst exports)
- Documentation updates reflecting lessons learned
- Review of audit logs for any anomalies

### Month 5–6 after Go-Live (1 week of effort)

- Annual penetration test (repeat of the Week-11 test, external provider)
- Minor-version dependency updates
- Review of any new indicator requirements

### Closing week (1 week of effort)

- Final knowledge-transfer session with the MOGCSP ICT team
- Walkthrough of the most commonly-hit issues and their resolution recipes
- Close-out report

**Phase 2 payment tranche**: held against the 4 weeks of Phase 2 effort; released upon completion.

---

## Acceptance gates summary

| Stage | Gate | Deliverable |
|---|---|---|
| 1 | Inception | Inception Report |
| 2 | Design + Prototype | Prototype demo + Design Document |
| 3 | Core development | Internal UAT pass + operational dashboards live |
| 4 | UAT + training | UAT Report, Pen-test Report, Training package |
| 5 | Go-Live | Running production system, Go-Live Report |
| 6 | Handover | Signed Handover Certificate |
| Phase 2 | Close-out | Close-out Report |

Each gate is reviewed using `Anex_1-_Audit_Trail_Form.docx`. The Deputy Minister has five working days to approve, request changes, or reject.

---

## Risk register (extract)

The full risk register lives in the project management tool. Highlights:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DHIS2 access not granted by MoH in time | Medium | High | Start negotiation Week 1; have a fallback of a dedicated MOGCSP DHIS2 instance |
| REALISE API unavailable | Medium | Medium | Fall back to weekly secure file drop; upgrade to API later |
| Connectivity in Gbarpolu / River Cess insufficient for sync | Medium | Medium | Offline-first design absorbs this; pilot test in Stage 4 |
| Key MOGCSP staff turn over during delivery | Medium | High | Role-based documentation; two-person knowledge depth per role |
| Penetration test finds critical issues in Week 11 | Low | High | Security-first development throughout; remediation contingency in Stage 4 |
| Beneficiary consent capture proves slower than anticipated in field | Medium | Medium | Pilot test in Stage 4 across two counties; adjust form length if needed |
| Hosting decision delayed past Inception | Low | High | Force a decision by end of Week 2; stack is hosting-agnostic in meantime |
| Political transition disrupts ministry engagement | Low | High | Multiple stakeholder touchpoints; documentation enables continuity |

---

## What the roadmap does not cover

Explicitly deferred from Phase 1 to a future phase or change order:

- Native iOS mobile app
- Full national rollout beyond the six LWEP counties
- Integration with national digital identity systems (if and when they become available)
- Public survivor self-reporting portal
- Predictive analytics / machine learning
- Integration with court / police case management systems beyond standard referrals
- SMS-based beneficiary notifications to survivors (ethical and safety review required)

Any of these can be scoped as a follow-on engagement after Phase 2.
