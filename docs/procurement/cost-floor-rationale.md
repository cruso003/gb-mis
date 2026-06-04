# Cost-floor rationale — what $200K buys, what bidding below it costs

**Audience.** MOGCSP procurement committee, the LWEP PMU, the World Bank
task team, and any firm preparing or evaluating a bid against the
[Final TOR](../../README.md) for the Gender-based Management Information
System.

**Why this document exists.** The TOR does not name a price band. Bids
will arrive across a wide spread and the evaluation panel needs a way to
look past the headline number to the **outcomes** each price implies —
especially because the data this system holds is GBV survivor data, and
under-pricing here is not a finance question, it is a survivor-safety
question.

This document does two things:

1. Shows that **$200K USD is the floor** at which the TOR's
   deliverables can be honestly met by a Liberia-based firm — and
   acknowledges that even that price assumes part of the firm's
   motivation is the **long-term relationship with the Ministry**, not
   pure commercial return.
2. Translates each price reduction into the **specific corner that
   gets cut** and the **survivor-impact outcome** that follows. A
   $100K bid is not "a cheaper $200K bid" — it is a different system
   with different risks.

The numbers below are stated in USD. Where ranges are given, the lower
end assumes an all-Liberian team with the existing open-source GB MIS
codebase as a starting point; the upper end assumes one international
specialist on the team and a regional pen-test firm.

---

## 1. The $200K bid — full transparency

Below is what a competent Liberia-based firm using the open-source GB
MIS codebase as a foundation must allocate to honestly meet the TOR.

### 1.1 Labour (16 weeks across 2 phases)

| Role | Weeks × utilisation | Local-rate $ / wk | Subtotal |
|---|---|---:|---:|
| Team Lead / Senior MIS Expert (8–10 yrs, WB experience) | 16 × 50% = 8 | $4,000 | $32,000 |
| Lead Developer / Software Architect | 16 × 80% = 13 | $3,500 | $45,500 |
| Database & Data Management Specialist | 16 × 60% = 10 | $2,500 | $25,000 |
| Gender Specialist (GBV-experienced, WB-experienced) | 16 × 30% = 5 | $5,000 | $25,000 |
| Junior developer | 12 | $1,500 | $18,000 |
| Training coordinator + 1 trainer (6 counties) | 12 | $1,500 | $18,000 |
| **Labour subtotal** | | | **~$163,500** |

### 1.2 Direct costs

| Item | Amount |
|---|---:|
| External pen-test (regional firm, before Go-Live) | $15,000 |
| Travel + per diem (6 counties × 2 rounds, clustered) | $20,000 |
| Translation review (English-only; reserved for any second-locale ask) | $0 |
| Hosting infrastructure (Phase 1 staging only; production hosting borne by MOGCSP per the TOR) | $0 |
| **Direct subtotal** | **~$35,000** |

### 1.3 Bid math

```
Labour                                    $163,500
Direct costs                               $35,000
Subtotal                                  $198,500
Firm overhead + margin (≈ 1%)               $1,500
─────────────────────────────────────────────────
Bid total                                 $200,000
```

**Read that overhead line again.** A typical firm overhead in this
region is 15–25%. At $200K the overhead/margin is effectively zero.
This is not a normal commercial bid — see §2.

---

## 2. Why a competent firm might still take $200K — relationship pricing

A firm that prices honestly at $200K is doing so for reasons that are
not in this contract's P&L:

1. **Long-term ministry relationship.** A successful GB MIS delivery
   makes the firm the default partner for the next 5–10 years of
   MOGCSP digital work: hosting maintenance, an iOS app, expansion to
   other ministries, the national-rollout-beyond-LWEP scope that
   `ROADMAP.md` already lists as deferred.

2. **Reference customer.** A live, working, World Bank-acknowledged
   GBV MIS in Liberia is a strong reference for similar tenders in
   Sierra Leone, Côte d'Ivoire, and the broader region. The next bid
   the firm submits — to anyone — is easier if Liberia is on the
   record.

3. **Pipeline of WB work.** Firms with documented WB deliveries get
   shortlisted faster on subsequent procurements. The Bank's own
   working dynamic favours known performers.

4. **Phase-2 expansion.** The TOR scopes 4 weeks of post-deployment
   support; a competent firm expects MOGCSP to want more (refresher
   training, integrations with new partners, indicator additions).
   The Phase-2 work is contracted separately, typically at normal
   commercial rates.

5. **Mission alignment.** Some firms — particularly Liberian or
   regional firms with social-sector roots — will absorb margin to
   work on survivor-safety systems because that work matters to them.
   This is a legitimate motivation, not a euphemism for incompetence.

**This is not bid-padding being explained away.** It is honest
disclosure that the $200K floor depends on motivations the firm
cannot guarantee for the next decade. A successor firm picking up
maintenance at year three will charge market rate, and MOGCSP should
budget for that.

> ⚠️ **The relationship-pricing assumption is fragile.** It depends on
> MOGCSP treating the relationship as a partnership — paying invoices
> promptly, sharing scope changes in writing rather than verbally,
> respecting the 5-working-day approval window, and engaging the firm
> on Phase 2 follow-on work. If those don't happen, the next firm
> MOGCSP needs will price at market.

---

## 3. The strain of operating at $200K

Even with the codebase advantage and the relationship discount, a firm
running at $200K is operating with no slack. The specific pressure
points:

| Pressure point | Why it strains |
|---|---|
| **Travel logistics in 6 counties** | Vehicles, fuel, per diem, accommodation — Liberia rural logistics has hidden costs. A single failed trip (impassable road in rainy season) costs $2–5K |
| **Pen-test findings remediation** | If the external pen-test finds 2+ high-severity issues, remediation eats 1–2 weeks of dev time the budget didn't allocate |
| **Scope creep** | A late-arriving requirement (a 49th indicator, a partner ministry asking for a custom view) cannot be absorbed; it must be a change order |
| **Stakeholder workshop overruns** | If a ministry workshop needs a second session, the Gender Specialist's 5 weeks is over budget by 20% before the project finishes |
| **Translation needed mid-project** | If a second locale is requested mid-rollout, the only acceptable response is a change order |
| **Pen-test re-test** | If findings warrant a re-test, the firm pays for it |
| **First-month support volume** | The TOR says 6 months of support; weeks 1–4 typically eat 50% of that bucket |

**A firm taking $200K is committing to handle the above without
margin.** They will be conservative on scope (rightly) and may need to
say "no" to verbally-requested additions. MOGCSP should expect this.

---

## 4. What happens below $200K — scenarios with named outcomes

The TOR has four payment tranches summing to 100% of the contract
value. Cutting the total forces cuts inside those tranches. Below is
what each price reduction concretely means.

### 4.1 At $150K — "tight but defensible"

Approximately a 25% cut from $200K. The firm absorbs this by:

- Cutting the Gender Specialist to **2 weeks** (from 5)
- Cutting the training coordinator role; the lead developer doubles as trainer
- Single round of training trips instead of two
- Pen-test budget compressed to ~$10K (probably a smaller regional firm)
- Junior developer cut to 6 weeks

**Specific outcomes likely:**

- DPIA written under deadline by a developer; reviewed by the DPO with no
  GBV-clinician input. **Risk: intake-form labels not screened for
  re-traumatisation language.**
- Training: one round means case workers see the system once, on the day,
  and never again. **Outcome: ~30–50% return-for-revision rate in the
  first month** as supervisors find missing fields, wrong codes, or
  misuse of the intake-channel enum.
- Pen-test scope reduced to web only (mobile pen-test deferred). **Risk:
  Android-specific issues (SQLCipher binding, intent-redirection,
  WebView hardening) ship unverified.**
- Post-deployment support: the 6-month bucket is fully consumed by
  week 12 just from training-fallout questions.

A $150K delivery **works** but produces a system MOGCSP must invest in
heavily after handover. The firm's risk: if anything goes wrong in the
field test (Week 11), there is no budget to fix it.

### 4.2 At $100K — "the wheels come off"

Approximately a 50% cut. To make this number, the firm must:

- Drop the Gender Specialist entirely (or reduce to ad-hoc review)
- Skip the external pen-test (use in-house security review only)
- Skip training in 3 of the 6 counties (cover those via "cascade" from
  a trained county — which routinely fails)
- Reduce post-deployment support to 1 month or rely on email-only
- Run the team with one senior + one junior developer total
- Skip the M&E Manual revision deliverable
- No DR rehearsal

**Specific outcomes likely:**

- **DPIA fails an external compliance review.** Liberia's Data
  Protection guidelines plus the WB GBV Good Practice Note are not met
  on the first audit cycle. The Bank's task team flags this; remediation
  becomes MOGCSP's problem to fund separately.
- **First survivor-data finding from a self-test.** Because the
  pen-test was in-house, an external test commissioned a year later
  (because the WB requires one annually) finds at least one
  high-severity issue that was present at Go-Live. Public exposure
  risk grows for every month it was live undetected.
- **County coverage gap.** Workers in 3 of 6 counties were trained by
  a colleague who themselves attended one session. By month 3 those
  counties are entering data inconsistently — duplicates, wrong
  intake-channel codes, missing consent records. **Reporting is no
  longer comparable across counties; the SDG-5 / BPfA outputs for
  Liberia become defensible only at national aggregate, not by
  county.**
- **No M&E Manual revision.** The ministry's existing M&E Manual
  contradicts the new system in places; case workers default to the
  manual when in doubt, undoing the system's data-quality
  improvements.
- **First survivor re-traumatisation incident.** Without the Gender
  Specialist's review of intake-form copy, a survivor reports — through
  a case worker — that a question was framed in a way that re-triggered
  trauma. The DPO investigates; the system has to be patched and a
  ministry-wide retraining issued. **Cost to fix this exceeds the
  savings from omitting the Gender Specialist in the first place.**
- **System unavailable at handover.** The firm completes their hours
  and leaves; MOGCSP has no contractual handle for the bugs found in
  months 7–12. A follow-on contract becomes inevitable, priced at
  market.

A $100K delivery **damages MOGCSP** in measurable ways. The savings
relative to a $200K delivery (~$100K) are eaten — usually with
interest — by remediation costs in the first 18 months of operation.

### 4.3 At $50K — "marketing budget, not a delivery"

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

This is not theoretical; it is the most common failure mode of
under-priced ICT-for-development contracts in the region. The
evaluation panel should treat any bid at this level as a **technical
disqualification regardless of price**.

---

## 5. Cost cuts mapped to survivor-impact outcomes

The TOR repeatedly invokes survivor safety; this table makes the
cost-to-outcome translation explicit.

| What gets cut | Direct survivor-safety outcome |
|---|---|
| External pen-test | First vulnerability is found *by an attacker* or by a year-later audit — exposure window measured in months |
| Gender Specialist DPIA review | Intake-form language not vetted; risk of re-traumatising survivors during questioning |
| Gender Specialist UAT review | Workflow steps misordered for the survivor experience (e.g. consent collected after sensitive questions) |
| Training in some counties | Inconsistent data entry → duplicate records, mis-categorised cases → cross-county comparisons stop being reliable |
| Supervisor review workflow training | Two-eyes principle silently violated in practice (same person enters and reviews) → defeats the purpose of the workflow |
| Post-deployment support | Field bugs found in weeks 4–12 go unfixed; case workers route around them with paper notes that re-introduce the risks the system was built to eliminate |
| DR rehearsal | First real outage exceeds the 4-hour RTO; survivor records inaccessible during the window |
| M&E Manual revision | Case workers default to the old manual; new system's improvements ignored; data quality regresses |
| Translation review on a second locale | Survivors who don't read English well give consent they didn't understand → consent records become legally challengeable |

---

## 6. Red flags an evaluation panel should look for

Independent of price, the following are signals that a bid is unlikely
to deliver what the TOR scopes:

| Signal | What it tells you |
|---|---|
| Pen-test line < $10K | External pen-test is not actually planned |
| Gender Specialist absent or < 2 weeks | DPIA + survivor UX review will not happen at the depth the WB Good Practice Note on GBV expects |
| All-international team at low bid | Day-rates don't add up; either the headcount is wrong on the bid or someone is doing two jobs |
| All-Liberian team but no named senior with WB experience | Project will spend weeks on Audit Trail Form rejections |
| Single training trip to each county | Workers will see the system once; the queue will clog with returns |
| No DR rehearsal in the workplan | The 4-hour RTO in `ARCHITECTURE.md` is unverified |
| No external pen-test in Stage 4 | TOR requirement; bid is non-compliant |
| Power BI / Tableau line items but no licensing | Either dashboards use an open-source tool (fine, must say so) or hidden licensing cost shifts to MOGCSP |
| 6-month support but no on-call mechanism | Support is email-only, which fails for urgent survivor-data incidents |
| Vague "infrastructure recommendations" deliverable | The server-capacity / UPS / connectivity assessment the TOR requires is missing |

A bid scoring 3 or more of these signals should trigger a follow-up
conversation before scoring, regardless of price.

---

## 7. The defensible $200K position

A firm bidding $200K can stand behind this number when challenged:

- **The codebase exists.** A substantial open-source foundation
  (Postgres + RLS + audit + mobile SQLCipher + observability +
  runbooks + i18n) is in place. A bidder starting from scratch cannot
  meet $200K. The bid is honest about reusing this asset and naming
  it as such.
- **The team is Liberia-based** with one international specialist for
  the GBV ethics review.
- **Pen-test is external** (regional firm, ~$15K) — the line item is
  not cut.
- **Gender Specialist is funded** (~$25K, 5 weeks at 30% utilisation).
- **Training reaches all 6 counties** with clustered trips, two rounds
  total.
- **Relationship pricing is disclosed.** The firm signs the
  acknowledgement (§2) that part of the rationale for taking this
  price is the long-term partnership with MOGCSP.

A bid below $200K should explain in writing **which of the above it is
cutting and why the outcome in §5 will not occur.** A bid that cannot
make that explanation should not be selected, even if the price is
lower.

---

## 8. What the panel should ask each bidder

These questions, asked of every bid regardless of price, surface the
real shape of the offer:

1. List every line in your bid that totals more than $5,000. State the
   role, the rate, and the deliverable it produces.
2. Name the **external pen-test firm** you will engage and provide
   one of their published reports (redacted) on a comparable
   engagement.
3. Name the **Gender Specialist by role** and provide a CV
   demonstrating 5+ years of GBV-data work.
4. Describe how you will train **each of the six LWEP counties**
   (Bomi, Gbarpolu, Grand Cape Mount, Grand Gedeh, Rural Montserrado,
   River Cess), with travel-day estimates and per-county session count.
5. Show your **disaster-recovery rehearsal** plan and the budget
   line that funds it.
6. State the **post-deployment support hours per month** you commit
   to, the response-time SLA, and the channel (phone / Slack /
   email / on-site).
7. State which existing code or libraries you will reuse. If you are
   reusing the open-source GB MIS codebase, declare it and provide a
   plan for the knowledge-transfer that the TOR requires at handover.
8. Identify **one risk** in your bid that, if it materialises, you
   cannot absorb at the quoted price — and explain how you would
   handle it.

A bidder who cannot answer #8 candidly is hiding either margin or
risk; either is informative.

---

## 9. Bottom line for the panel

- **$200K is the honest floor** for a Liberia-based firm reusing the
  existing GB MIS codebase, with disclosed relationship pricing. This
  is defensible.
- **$150K is achievable** but cuts the Gender Specialist and most of
  the post-deployment support — the firm is gambling on a quiet
  field test.
- **$100K is dangerous.** The list of foreseeable outcomes in §4.2 is
  not speculation; it is the documented failure pattern of
  under-priced GBV-data MIS contracts in the region.
- **$50K is not a delivery price.** It is either a marketing line
  intended to be expanded via change orders, or a misunderstanding of
  the scope. Either should disqualify the bid.

The panel's job is not to find the cheapest number. It is to find the
cheapest number **at which the system will, in actual operation,
protect survivors and produce indicator data the Ministry can
defend before the Bank, before the AU, and before the Liberian
public.** $200K is, on the evidence in this document, that number.
