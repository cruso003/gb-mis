# Compliance & Data Ethics

The GB MIS operates at the intersection of international data protection law, WHO ethical guidance on researching violence against women, and the Government of Liberia's obligations under CEDAW and related instruments. This document captures the binding compliance commitments that shape implementation decisions.

When a technical decision and a compliance commitment conflict, the compliance commitment wins and the technical design is revised.

---

## Applicable frameworks

| Framework | What we commit to |
|---|---|
| **WHO Ethical and Safety Recommendations for Researching, Documenting and Monitoring Sexual Violence in Emergencies** (2007) and the 2024 updated VAWG data ethics guidance | Survivor safety is the dominant design constraint; we implement the WHO checklist at the process level |
| **WHO / OHCHR / UN Women / UNFPA Guidance on Data Systems for GBV** | Follow the minimum safeguards for case management information systems, including ethical data-sharing boundaries |
| **Liberia Data Protection guidelines** (and any Data Protection Act in force at deployment) | Lawful basis, purpose limitation, data-subject rights, breach notification |
| **General Data Protection Regulation (EU GDPR)** | We align with GDPR principles because LWEP is a World Bank project with international partners and because GDPR-level hygiene is the prevailing global standard for donor-funded systems |
| **ECOWAS Supplementary Act on Personal Data Protection** | Regional data protection obligations |
| **Convention on the Elimination of All Forms of Discrimination Against Women (CEDAW)** — Liberia's Concluding Observations | Systemic commitment to improving gender-data infrastructure |
| **World Bank Environmental and Social Framework, ESS10** (Stakeholder engagement) and ESS1 (risks to vulnerable groups) | Project-level safeguards |
| **UN Principles on Personal Data Protection and Privacy** | UN-system-wide baseline we meet because of interop with UN Women, UNFPA, UNICEF data |

---

## Lawful basis for processing

### For LWEP beneficiaries (livelihood, community sessions, VSLAs)

- **Basis**: explicit informed consent obtained at enrolment; backed by the public-interest task performed by MOGCSP
- **Purpose**: delivery of LWEP services; programme M&E; aggregate reporting to World Bank; national gender policy monitoring
- **Retention**: 7 years from last interaction or programme closure + required national archival period, whichever is longer

### For GBV case records

- **Basis**: explicit informed consent from the survivor (or a parent/guardian for minors under legal age of consent, with the additional child-safeguarding protocols in this document); supplemented by the substantial public interest in protecting persons from violence
- **Purpose**: providing services to the survivor; enabling safe referral; aggregate statistical reporting with identifiers removed
- **Retention**: default 7 years from case closure; survivor-initiated erasure respected subject to legal hold

### For users (staff of MOGCSP, partner ministries, consultants)

- **Basis**: contract with the employing organisation; legitimate interest in operating the system
- **Purpose**: authentication, authorisation, accountability, audit
- **Retention**: user account lifecycle + 7 years audit retention

---

## Consent

### Consent capture

Every beneficiary and every named GBV case carries a `ConsentRecord` (see [DATA_MODEL.md § 3](./DATA_MODEL.md#3-beneficiaries-context)). A beneficiary without a consent record cannot be saved — this is a database check constraint.

Consent is captured:
- **On paper** in the field, signed or fingerprinted, then photographed and attached to the digital record (the paper original is archived at the county office)
- **Translated into the survivor's first language** when that differs from English — the catalogue of approved translations is managed by the MOGCSP Legal Unit
- **Read aloud** when literacy is a barrier — the worker checks an attestation that the form was read aloud and understood
- **Scoped**: the survivor can consent to service provision but not to DHIS2 aggregate sharing, or vice versa. `ConsentRecord.scope` is an array of granular categories

### Consent scopes

| Scope | What it permits |
|---|---|
| `DATA_COLLECTION` | Basic record of the interaction; required for service delivery |
| `CASE_SHARING_WITHIN_MOGCSP` | Case referral to other MOGCSP offices |
| `CASE_SHARING_ACROSS_MINISTRIES` | Referral to MoH / MoJ / etc. |
| `DHIS2_AGGREGATE_SHARING` | Inclusion in de-identified aggregate values pushed to DHIS2 |
| `PHOTO_USE` | Use of intake photographs within the case record |
| `RESEARCH_USE` | Inclusion in anonymised research datasets (future, gated process) |
| `LONG_TERM_FOLLOWUP` | Contact for follow-up beyond the immediate service window |

Unselected scopes are denied. Every downstream feature that reads data checks the scope — the API will silently exclude records whose consent scope does not cover the current use.

### Right to withdraw consent

A survivor may revoke consent at any time. Revocation:
- Sets `ConsentRecord.revokedAt`
- Triggers a review workflow that removes the record from future aggregate computations going forward
- Does not retroactively alter historical aggregate values already published (those values are statistical products, not personal data, and are not re-keyed to individuals)
- Preserves the audit trail of the prior processing — we can show what happened and when, but the personal record is pseudonymised

### Consent for minors

GBV survivors under 18 require additional safeguards:
- A trusted adult (parent, guardian, or — where the parent is the perpetrator — a designated child protection officer) co-consents
- The case worker follows the child protection case-management protocol
- Referral to MOGCSP Child Protection Services is automatic for cases involving survivors under 13
- Data-sharing scopes available to minors are restricted — no research use, no photo use

---

## Data-subject rights

The following rights are supported, with workflows in the admin web app:

| Right | Workflow | SLA |
|---|---|---|
| Access (a subject requests their data) | `GET /v1/data-subject/access-request` endpoint initiates a verified-identity flow; data is compiled and delivered via a secure, time-bounded link | 30 days |
| Rectification (the data is wrong) | `POST /v1/data-subject/rectification-request`; a case worker reviews and corrects, audit-logged | 14 days |
| Erasure (right to be forgotten, subject to legal hold) | `POST /v1/data-subject/erasure-request`; the legal team approves or refuses with reason; approved requests pseudonymise all identifying columns and mark the record `erased = true` | 30 days |
| Restriction (pause processing pending dispute) | `POST /v1/data-subject/restriction-request`; the record is flagged and excluded from aggregate computations | Immediate |
| Portability | Subject receives a structured export in JSON or CSV via an authenticated channel | 30 days |
| Objection to processing | Manual review by the DPO; decision audited | 30 days |

Every request and every decision is logged in the audit store.

---

## Data minimisation

We collect only what is necessary. The schema review process explicitly checks:

- Is this field necessary for service delivery, M&E, or legal reporting?
- Can we collect a category instead of a precise value? (e.g. age bracket instead of date of birth, where the bracket is sufficient)
- Is this field derivable from another we already collect?
- Is this field being collected because someone asked "what if we need it later"? (If yes, reject.)

Specific applications of this principle:

- We do not collect **perpetrator names** — only relationship category and demographic bracket
- We do not collect **household income** in the livelihood module unless the specific programme requires it for eligibility — we use proxy indicators (housing type, asset ownership) by default
- We do not collect **GPS tracks of beneficiaries** — only the community where they live
- We do not collect **biometric data** — fingerprint / face data never leaves the user's Android Keystore
- We do not retain **verbatim survivor narratives** in search-indexable form — notes are encrypted

---

## Anonymisation and aggregation

Aggregate outputs intended for DHIS2, the public dashboard, or research are subject to statistical disclosure control.

### K-anonymity threshold

Any aggregate cell (e.g. "number of GBV cases in community X, age group 10–14, during Q2 2026") is suppressed if the count is **less than 5**. This prevents small-cell disclosure — the difference between a count of 1 and a count of 0 can identify an individual in a small community.

### Suppression policy

- Suppressed cells appear as `"<5"` in public outputs and as `null` with a suppression reason in internal analytical exports
- Suppression cascades: if suppressing one cell makes an adjacent cell's value inferable by subtraction, the adjacent cell is also suppressed
- The threshold is configurable per aggregate but never drops below 5 without Legal Unit approval

### Geographic generalisation

For the public dashboard, indicator values are reported at county level. Sub-county aggregations are available only to internal analysts, and only for non-GBV indicators by default.

---

## Ethical research use

Where the data held by the MIS is used for research (academic studies, programme evaluations, impact assessments), the process is:

1. The researcher submits a proposal to MOGCSP with ethics clearance from an approved IRB
2. MOGCSP's Research Ethics Committee reviews the proposal against the WHO VAWG data ethics guidance
3. On approval, the researcher receives an anonymised, k-anonymity-protected dataset — never row-level GBV data, never direct identifiers
4. Data use is time-bounded and the dataset must be destroyed at the end of the project
5. Publications using the data cite the Ministry and include the ethics clearance reference

Research use requires the `RESEARCH_USE` consent scope to be selected by the subject. Aggregates that include non-consenting subjects are computed without them.

---

## Breach notification

A personal-data breach triggers the following obligations.

### Internal
- **Within 1 hour of detection**: the incident commander opens the incident, preserves evidence, begins containment
- **Within 2 hours**: the Data Protection Officer, the Deputy Minister for Gender, and the LWEP PMU are notified
- **Within 8 hours**: a preliminary written report (what, when, scope, initial impact estimate)

### External
- **Within 72 hours of becoming aware** of a breach likely to result in risk to rights and freedoms: notify the competent data protection authority (GDPR Article 33 baseline)
- **Without undue delay** if the breach is likely to result in high risk: notify affected individuals directly — with advice on protective measures, in language they understand
- **World Bank PMU**: notified per the Project Agreement's reporting requirements

No breach notification is ever sent on behalf of MOGCSP without the Deputy Minister's approval.

### Notification content

The breach notification includes: nature of the breach, categories and approximate number of data subjects affected, likely consequences, measures taken or proposed, DPO contact. It does not include details that would re-identify victims or aid the attacker.

---

## Cross-border data transfers

The system must consider data residency carefully because:
- Liberia's data protection law contemplates cross-border transfer restrictions
- Survivor data is among the most sensitive categories
- Some hosting options place data outside Liberia

Default policy:
- **Restricted (survivor-linked) data does not leave Liberia** without a specific legal basis
- **Sensitive personal data** transfers outside Liberia require a data-transfer agreement with the receiving jurisdiction
- **Operational and Public data** may cross borders freely

If cloud hosting is selected with a region outside Liberia:
- A Standard Contractual Clauses-equivalent agreement is executed with the cloud provider
- Encryption keys for Restricted and Sensitive columns remain in MOGCSP custody (cloud KMS with customer-managed keys, or an on-prem key vault that the cloud instance calls)
- Backups are encrypted and stored both in-region (cloud) and on-prem (MOGCSP HQ)

---

## WHO VAWG ethical safeguards — operational checklist

Implemented as system behaviour, not just process documentation:

- [x] Interviewers are trained in survivor-centered communication before they can complete their onboarding and receive system credentials — training completion is tracked in the user record
- [x] The mobile app's intake flow defaults to the safest, least-detailed option; progressive disclosure reveals more detailed questions only as the worker ticks through a safety checklist
- [x] A "quick exit" button is visible on every survivor-facing screen in the mobile app — tapping it closes the survivor-facing view immediately and returns to a neutral home screen (in case the survivor is being observed)
- [x] No data is collected from minors without the child protection workflow
- [x] Survivors are informed of their rights (including data-subject rights) before any data is collected, in their first language
- [x] Referrals are tracked with acknowledged / completed states so a survivor is not repeatedly asked to retell their story at each handoff — the case travels with its context
- [x] Aggregate outputs use k-anonymity thresholds that prevent small-cell disclosure
- [x] Any field-level question is marked optional unless the WHO protocol or Liberian law mandates it as required
- [x] The MIS does not contact survivors directly — contact goes via a designated case worker whose relationship with the survivor is established

---

## Compliance roles

| Role | Responsibility |
|---|---|
| **Data Protection Officer (DPO)** | MOGCSP-appointed; final authority on DPA interpretation; oversees data-subject requests; leads breach notifications |
| **Research Ethics Committee (REC)** | MOGCSP-convened; reviews research proposals; can veto aggregate exports for research purposes |
| **Child Protection Lead** | Part of MOGCSP's existing structure; signs off on all workflows involving minors |
| **Consultant's Compliance Liaison** | During Phase 1, works with DPO on implementation; transfers knowledge at handover |

---

## Compliance in the SDLC

- Every PR has a "privacy impact" checkbox; non-trivial changes require a written paragraph describing the impact
- New schema fields must be classified (Restricted / Sensitive / Operational / Public) — CI enforces
- New endpoints must declare the data classifications they expose — the API gateway uses this to validate the caller's permission
- New integrations with external systems require a data-transfer agreement before they can be enabled in production
- Security and privacy reviews are quarterly; findings become tickets with SLAs

---

## Transparent documentation

The following is published (not confidential):
- This compliance document
- The data-subject rights request processes and forms
- An annual transparency report (once per year) covering: number of subjects whose data is held, number of data-subject requests received and resolution rates, number of breaches, number of research exports, and a narrative on any material changes

The following is confidential:
- The specific technical controls and their current configurations
- Audit log contents
- Incident details pending resolution
- Specific survivor data under any circumstance
