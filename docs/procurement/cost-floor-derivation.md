# Cost-floor derivation — Liberia GB MIS

**Purpose.** Derive the benchmark-anchored floor cost for delivering
this TOR, separately for a **Liberian firm** and an **international
firm**, using established UN and World Bank reference rate scales.
Then enumerate the reasons a firm of either type might price below
its own derived floor.

**Audience.** Bidders deciding whether the contract is viable for
their cost structure, and MOGCSP / LWEP PMU stakeholders needing to
understand where each bidder type's floor honestly sits.

**Not for.** The evaluation panel — they have their own current
benchmark tables and historical bid data. This document does not
replace their work; it derives the same floor a competent panel
would derive when asked.

**Date sensitivity.** The rate scales referenced below are
representative of recent published values. UN ICSC, Liberia NO scales,
and Liberia DSA tables are revised periodically; WB STC ceilings are
revised by country office. Bidders should pull the live tables for
the current effective period before finalising any bid.

---

## 1. The framework

A bid's floor is the minimum cost of meeting the TOR's standards at
benchmark rates. It has two components:

1. **Direct costs** that every firm faces — penetration test, travel
   plus per diem in 6 counties, training-material production, DPIA
   expert review, hosting if MOGCSP-procured.
2. **Labour costs** that depend on staff category — international
   short-term consultants under UN ICSC scales, national consultants
   under UN Liberia NO scales, or a mix.

The benchmark-anchored floor for a given firm is:

```
Floor = Direct costs (irreducible, see §3)
      + Labour cost at benchmark rates × TOR-implied time
      + Firm overhead + minimum margin
```

A firm whose own loaded cost is at or above its benchmark-floor
labour line bids at floor plus minimum margin. A firm whose loaded
cost is below benchmark (junior staff billed as senior, low-overhead
shop) has room to bid lower. A firm above benchmark (international
firm with high overhead) bids higher. None of those positions is
intrinsically wrong; each implies different terms and risks
discussed in §6.

---

## 2. Benchmark sources

| Source | Provides | Where to find current values |
|---|---|---|
| **UN ICSC salary scales** | International staff cost ceilings by Professional grade (P-1 … P-6 / D-1) | [icsc.un.org](https://icsc.un.org) → Salary Surveys → Professional and Higher Categories |
| **UN Liberia National Officer (NO) scales** | National-staff cost basis for Liberia, grades NO-A … NO-D | UN Liberia country team HR; published quarterly |
| **Liberia DSA (Daily Subsistence Allowance)** | Per-diem ceilings by location | [icsc.un.org](https://icsc.un.org) → DSA Circulars (Liberia) |
| **WB Consultant Selection Framework cost norms** | STC rate corridors per country | World Bank Procurement Framework, Annex IV (or current equivalent) |
| **WB Liberia country-office cost-reasonableness benchmarks** | Historical bid pricing for comparable contracts | Bidder conferences; internal panel reference |
| **Local commercial rate cards** | Liberia ICT consulting market floor | Published rate cards of Liberian consulting firms |

Representative recent values (subject to verification against the
current effective tables):

**International ICSC daily-rate equivalents — STC corridors:**

| Grade | Daily rate (USD) | Typical role |
|---|---:|---|
| P-3 | $700 – $1,000 | Mid technical specialist |
| P-4 | $1,000 – $1,300 | Senior technical specialist |
| P-5 | $1,300 – $1,700 | Senior team lead, principal specialist |
| P-6 / D-1 | $1,700 – $2,000 | Team Leader, principal architect |

**UN Liberia NO daily-rate equivalents — corridors:**

| Grade | Daily rate (USD) | Typical role |
|---|---:|---|
| NO-A | $150 – $200 | Junior professional |
| NO-B | $200 – $350 | Mid professional |
| NO-C | $350 – $550 | Senior professional |
| NO-D | $550 – $800 | Principal national consultant |

**Liberia DSA:**

| Location | DSA (USD/day) |
|---|---:|
| Monrovia | ~$250 – $290 |
| County capitals (rural) | ~$150 – $190 |

The numbers above are **corridors, not points**. Bidders anchor to the
specific value in the table effective on bid submission day.

---

## 3. Direct costs every firm faces

These are largely independent of staffing model. Some scale slightly
with whether the trainer is Liberia-based or fly-in international, as
noted in §3.2.

### 3.1 Items

| Item | Range (USD) | Why irreducible |
|---|---:|---|
| External penetration test (regional firm, scope: web + API + mobile) | $15K – $25K | TOR-mandated for survivor data; no firm credibly does this in-house at quality |
| Training materials production: PDF user guides per role, video walkthroughs per workflow, printable quick-reference cards | $5K – $12K | TOR Stage-4 deliverable |
| Independent DPIA expert review (non-developer with GBV experience) | $4K – $8K | Required for Liberia Data Protection guidelines + WB GBV Good Practice Note |
| Travel + per diem in 6 counties × 2 rounds | See §3.2 | TOR explicit |
| Production hosting | Typically $0 if MOGCSP-procured; +$15–30K if firm-procured cloud-primary | Depends on hosting decision at Inception |

### 3.2 Travel + per diem calculation

The 6 LWEP counties (Bomi, Gbarpolu, Grand Cape Mount, Grand Gedeh,
Rural Montserrado, River Cess) can be clustered into ~4 trips per
training round. The TOR scopes 2 rounds (initial + refresher in
Phase 2).

**For a Liberia-based trainer** (per round):
- Trainer days in counties: 4 trips × 3 days × $170 DSA ≈ $2,000
- Vehicle + driver + fuel: ~$2,500
- Materials transport + venue contribution: ~$700
- Per-round subtotal: **~$5,200**
- **2 rounds: ~$10–12K**

**For an international trainer** (per round):
- International round-trip flight (Europe / US to Monrovia): $1,800 – $2,500
- Monrovia DSA at international rate with supplement: 5 days × $290 = $1,450
- County days at international DSA: 12 days × $190 = $2,280
- Vehicle + driver + fuel: ~$3,000
- Materials transport: ~$700
- Per-round subtotal: **~$9,200 – $10,000**
- **2 rounds: ~$18–22K**

If a firm fields 2 trainers per round (more realistic for 6 counties
with parallel workshops), multiply by ~1.6.

### 3.3 Direct-cost subtotal by firm type

| Direct line | Liberian firm | International firm |
|---|---:|---:|
| Pen-test | $15K | $20K |
| Training materials | $7K | $10K |
| DPIA review | $5K | $6K |
| Travel + per diem (2 rounds, 2 trainers) | $18K | $35K |
| Hosting (MOGCSP-procured) | $0 | $0 |
| **Direct subtotal** | **~$45K** | **~$71K** |

---

## 4. Local (Liberian) firm — floor derivation

**Assumptions:**
- Key Staff (TOR-named) at NO-D / upper NO-C grades — senior Liberian
  consultants with documented experience
- Non-key team at NO-B / NO-A grades
- All in-country; no international travel
- Firm overhead in the typical Liberian consultancy range (10 – 15 %)

### 4.1 Labour

| Role | Benchmark | Daily rate | TOR-implied time | Cost |
|---|---|---:|---:|---:|
| Team Leader (TOR Key Staff, 8–10 yrs) | NO-D senior | $700 | 8 wks × 5 d × 100% = 40 d | $28,000 |
| Senior Software Architect (Key Staff, 5–7 yrs) | NO-D / upper NO-C | $650 | 13 wks × 5 d × 80% = 52 d | $33,800 |
| Database & Data Management Specialist (Key Staff) | NO-C | $500 | 10 wks × 5 d × 60% = 30 d | $15,000 |
| Gender Specialist (Key Staff, 5–7 yrs GBV-data) | NO-D senior | $700 | 5 wks × 5 d × 100% = 25 d | $17,500 |
| Mid developer (non-key) | NO-B | $300 | 12 wks × 5 d × 100% = 60 d | $18,000 |
| Training coordinator + trainer (non-key) | NO-B | $250 | 12 wks × 5 d × 75% = 45 d | $11,250 |
| Junior developer (non-key) | NO-A | $200 | 8 wks × 5 d × 100% = 40 d | $8,000 |
| **Labour subtotal** | | | | **~$131,550** |

### 4.2 Aggregate

```
Labour                                  $131,550
Direct costs (§3.3)                      $45,000
                                       ─────────
Subtotal                                $176,550
Firm overhead + minimum margin (12%)     $21,200
                                       ─────────
Local-firm floor                       ~$197,750
                                          ≈ $200K
```

A Liberian firm bidding **at or above ~$200K** is funding the work
at NO benchmark rates with a minimum-viable margin. **Below ~$180K**
something has to give — either staff are billed at NO grades they
don't hold, non-key roles get cut, or direct costs get squeezed. The
reasons that might still be legitimate are in §6.

---

## 5. International firm — floor derivation

**Assumptions:**
- Key Staff (TOR-named) at ICSC P-4 / P-5 international STC rates
- Non-key team mixed: junior international and national substitution
  where the role doesn't require international presence
- International travel for Key Staff at Inception, Stage 4 training
  rounds, Stage 5 Go-Live
- Firm overhead in the international consultancy range (20 – 30 %)

### 5.1 Labour

| Role | Benchmark | Daily rate | TOR-implied time | Cost |
|---|---|---:|---:|---:|
| Team Leader (Key Staff) | P-5 senior STC | $1,500 | 8 wks × 5 d × 100% = 40 d | $60,000 |
| Senior Software Architect (Key Staff) | P-4 STC | $1,200 | 13 wks × 5 d × 80% = 52 d | $62,400 |
| Database Specialist (Key Staff) | P-3 STC | $900 | 10 wks × 5 d × 60% = 30 d | $27,000 |
| Gender Specialist (Key Staff) | P-5 senior STC | $1,500 | 5 wks × 5 d × 100% = 25 d | $37,500 |
| Mid developer (non-key, often national substitution) | P-2 / upper NO-B | $500 | 12 wks × 5 d × 100% = 60 d | $30,000 |
| Training coordinator + trainer (often national) | NO-C | $400 | 12 wks × 5 d × 75% = 45 d | $18,000 |
| Junior developer (non-key, national) | NO-A | $200 | 8 wks × 5 d × 100% = 40 d | $8,000 |
| **Labour subtotal** | | | | **~$242,900** |

### 5.2 Aggregate

```
Labour                                  $242,900
Direct costs (§3.3)                      $71,000
                                       ─────────
Subtotal                                $313,900
Firm overhead + minimum margin (25%)     $78,500
                                       ─────────
International-firm floor               ~$392,400
                                          ≈ $400K
```

An international firm bidding **at or above ~$400K** is funding the
work at ICSC benchmark rates with a typical international consultancy
margin. **Below ~$360K** the bid is either:

- Subsidising international rates with national substitution beyond
  what the Key Staff CVs imply,
- Pricing below the firm's own loaded cost (for one of the strategic
  reasons in §6.1), or
- Cutting standards that should be funded (corner-cutting per §6.2).

### 5.3 Why the international floor is roughly 2× the local floor

Three structural drivers, not negotiation positions:

1. **Labour rate ratio.** ICSC P-5 ≈ NO-D × 2 in daily rate.
   Same for P-4 vs. upper NO-C and P-3 vs. NO-C.
2. **Travel cost ratio.** International flights + DSA supplement add
   ~$25K direct per project relative to a Liberia-based trainer.
3. **Overhead ratio.** International consultancies carry significantly
   higher loaded overhead — HQ infrastructure, professional
   indemnity, tax-equalisation reserves — typically 20–30 % vs.
   Liberian firms' 10–15 %.

These are features of the staff categories the Bank itself prices
separately. The **input cost** differs; the **output standard** does
not. Both bidder types must meet the same TOR.

---

## 6. Why a firm of either type might price below its own derived floor

Some reasons are legitimate strategic choices; others are
corner-cutting that compromises TOR standards. Both produce the same
nominal effect — a bid below floor — but their consequences are
opposite.

### 6.1 Legitimate reasons to bid below floor

**Strategic pricing for relationship.** A firm bidding $40–60K below
floor is paying that amount for a multi-year client relationship.
This is rational if the firm expects 2+ years of follow-on work from
MOGCSP at market rate — hosting maintenance, expansion to other
ministries, indicator additions, refresher training cycles. It is
the most common reason competent firms bid below floor on government
MIS contracts.

**Cross-subsidy from other contracts.** A firm running several
parallel government contracts in Liberia absorbs shared overhead
(HR, IT, office, project administration) across all of them. Their
loaded cost per Key Staff member is lower than a single-contract
shop. They can bid lower without compromising standards because
their actual cost basis is genuinely lower.

**Reference value, especially for international firms.** An
international firm bidding $300K instead of $400K is paying $100K for
a referenceable World Bank-funded GBV MIS delivery in West Africa.
The reference enables shortlist entry on the next round of tenders
in Sierra Leone, Côte d'Ivoire, Ghana, where the firm's market is
larger. Justified if the firm has a named pipeline benefiting from
this reference.

**Pipeline value within the Bank.** The Bank's procurement framework
favours firms with completed deliveries on similar work. Below-cost
bids buy entry into that shortlist. For a firm planning 5+ WB bids
in the region over 3 years, this premium is rational.

**Mission alignment.** Some firms — particularly Liberian or regional
firms with social-sector roots — absorb margin on survivor-safety
work because their leadership chooses to. This is real and should be
disclosed honestly; it is not a euphemism for incompetence.

**Genuine prior-work amortisation.** If the firm has built comparable
systems before and can re-use architectural patterns, training
materials, runbooks, integration adapters, or test suites, the
marginal cost of this delivery is genuinely lower for them than the
benchmark suggests. The benchmark prices a clean-room build; a firm
with prior body of work has done some of it already.

### 6.2 Corner-cutting that explains a below-floor bid

**Substituting junior staff for senior Key Staff roles.** A junior at
NO-B rates is hired and billed against the Key Staff line that was
priced at NO-D. The CV reflects a real but unrelated senior who is
not actually engaged day-to-day. **Effect:** deliverables miss the
depth the TOR's Key Staff qualifications imply.

**Booking Key Staff time but not delivering it.** The Team Lead is
listed at 50 % utilisation but actually does 10 %. Bid math reads
correctly; project delivery does not reflect senior leadership.
**Effect:** missed acceptance gates, weak Audit Trail Form
submissions, slow course correction.

**Skipping benchmark-mandated direct costs.** Pen-test priced at $5K
(impossible at quality), training delivered in 1 round instead of 2,
DPIA produced internally instead of expert-reviewed. **Effect:** the
specific TOR-standard failures catalogued in any post-mortem
of similar contracts in the region.

**Pricing below the firm's own cost basis with no strategic offset.**
A firm bidding $80K when their own NO-scale costs total $130K is not
making a strategic choice — they are either losing money or planning
to cut something they have not disclosed.

**Counting on change orders to recoup.** The bid is intentionally
narrow on scope; the firm plans to recoup via mid-project amendments
("you also need X, that's an additional $50K"). Visible from
unusually narrow scope statements in the technical proposal.

**Stretching Key Staff across too many simultaneous contracts.** The
Team Lead is listed at 100 % on three contracts in the same window.
**Effect:** real allocation is whatever's left; the contract that
paid the highest gets the attention.

### 6.3 The bidder's own go/no-go logic

Each firm runs this internally before finalising their bid:

| Question | What an honest answer means |
|---|---|
| What is our actual loaded cost basis for the proposed team and direct costs? | If you can't answer, you don't know whether you are above or below the floor |
| Is our proposed bid above, at, or below that cost basis? | Above: viable commercially. At: viable but tight. Below: needs a strategic offset |
| If below cost basis: what is the offset (relationship, cross-subsidy, reference, pipeline, mission, prior work)? Can we name a specific upcoming opportunity that benefits? | If yes: legitimate. If "we'll figure it out": corner-cutting in disguise |
| If a $20–30K surprise hits in month 4 (rainy-season trip failure, scope clarification, second pen-test round), how do we absorb it without compromising TOR standards? | If the answer is "cut Gender Specialist hours / skip pen-test re-test / reduce training to 1 round": the bid is too thin |
| Do our Key Staff CVs match the role they are billed against, and are they actually available at the proposed utilisation? | If staff are double-booked or under-qualified: the bid is dishonestly structured |

A bid that survives all five questions is defensible at whatever
price it lands at. A bid that fails any one of them is either above
floor and uncompetitive, or below floor and structurally unsound.

---

## 7. Summary for each bidder type

### Liberian firm

- **Benchmark floor: ~$200K** (NO scales, Liberia-based direct costs,
  Liberian overhead).
- **Strategic-pricing range: ~$160K – ~$200K** — defensible if the
  firm can name the multi-year relationship, cross-subsidy, mission
  alignment, or prior-work amortisation that justifies it.
- **Below ~$150K:** very hard to justify without corner-cutting. The
  firm's own cost basis at NO rates plus irreducible direct costs
  leaves no room.
- **Above ~$230K:** competing against other Liberian firms who price
  closer to floor — risk of losing on financial score.

### International firm

- **Benchmark floor: ~$400K** (ICSC scales, international direct
  costs, international overhead).
- **Strategic-pricing range: ~$320K – ~$400K** — defensible if the
  firm can name the specific upcoming pipeline that benefits from a
  Liberia / WB-GBV reference.
- **Below ~$300K:** corner-cutting unless the firm is substituting
  national staff at NO rates while billing them as international Key
  Staff — visible to a careful panel and risky if discovered.
- **Above ~$450K:** likely losing on financial score against a
  Liberian competitor delivering the same TOR standards.

Both bidder types compete on the same TOR but their floors,
strategic-pricing ranges, and competitive ceilings sit at different
absolute numbers because the **input cost is different** for the same
**output standard**. The framework is the same; the anchor scales
differ.

---

## 8. Verification of any specific bid

Independent of bidder type, any bid can be tested for internal
coherence by working through:

1. Sum the labour line: Key Staff time × rate + non-key time × rate.
2. Sum the direct-cost line: pen-test + travel + DSA + materials +
   DPIA review.
3. Add overhead.
4. Compare the total to the bid.
   - If bid ≥ derived floor for the staffing category implied:
     cost-reasonable.
   - If bid < derived floor: there must be either a strategic offset
     (§6.1) or corner-cutting (§6.2). Ask which.
5. Verify Key Staff CVs match the grade billed.
6. Verify Key Staff utilisation is realistic given other contracts
   they are on.

The arithmetic the panel will perform is shown here so any bidder
can do it on their own bid before submission.
