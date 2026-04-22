# Project Context

## The program this system serves

The **Liberia Women Empowerment Project (LWEP)** is a **US$44.6 million, five-year (2022–2027) multi-sectoral initiative** implemented by the Ministry of Gender, Children and Social Protection (MOGCSP) with financing from the World Bank (IDA). It targets approximately **267,200 people** across **~750 communities** in six climate-vulnerable counties, with 36,000 directly supported through livelihood grants. The project closes on **30 June 2027**.

LWEP aligns with Liberia's **ARREST Agenda for Inclusive Development (2025–2029)** — Agriculture, Roads, Rule of Law, Education, Sanitation/Health, Tourism — and with Liberia's commitments under CEDAW, the Beijing Platform for Action, the SDGs, the Maputo Protocol, and the AU Continental Framework for Women, Peace and Security.

### Why this system is needed

Liberia ranked **177th of 193 countries** on the 2022 Gender Inequality Index. MOGCSP's ability to coordinate the national gender response is constrained by the absence of a single authoritative data platform. Indicators live in paper reports, separate ministries' systems, donor-specific databases, and one-off consultancies. The GB MIS consolidates this landscape into one platform that MOGCSP owns and controls.

## Project components (all five matter for this system)

| # | Component | Data the MIS must support |
|---|---|---|
| 1 | **Fostering Positive Social & Community Mobilization** (SASA! approach, community norms change) | Community engagement events, session attendance, norm-change survey results |
| 2 | **Enhancing Basic Services in Health & Education** (ASRH, GBV health-sector response, school-driven engagement) | GBV case records, ASRH service uptake, school retention of girls |
| 3 | **Promoting Resilient Livelihoods** (economic grants, credit, business training, life skills) | Beneficiary register, grant disbursements, VSLA group tracking, graduation indicators |
| 4 | **Strengthening Public Institutions** (MOGCSP + MoA capacity, multi-sectoral gender platform) | Policy-tracking indicators, inter-ministerial data submissions |
| 5 | **Project Management, M&E** | Project-level KPIs, impact evaluation data pipeline |

## Counties covered

The system must support all six LWEP counties from day one, with the data model designed to extend to all 15 Liberian counties post-closure so MOGCSP can run it nationally.

| County | Field office | Characteristics |
|---|---|---|
| Bomi | Tubmanburg | Coastal, moderate connectivity |
| Gbarpolu | Bopolu | Remote, low connectivity, forested |
| Grand Cape Mount | Robertsport | Coastal, moderate connectivity |
| Grand Gedeh | Zwedru | Southeastern, low connectivity |
| Rural Montserrado | (several) | Peri-urban, best connectivity |
| River Cess | Cesstos | Coastal southeast, low connectivity |

The offline-first design requirement comes directly from this geography. Assume field workers in Gbarpolu or River Cess will complete a full day of interviews with zero connectivity and sync overnight when they return to a district office.

## Institutional stakeholders

### Primary owner
- **Ministry of Gender, Children and Social Protection (MOGCSP)** — owns the system; the Deputy Minister for Gender approves deliverables; the LWEP PMU coordinates day-to-day

### Co-implementers and data providers
- **Ministry of Agriculture (MoA)** — co-beneficiary institution (Component 4); provides land-ownership and agricultural cooperative data
- **Ministry of Health (MoH)** — maternal health, ASRH, HIV, contraceptive prevalence data; owns precedent IMS experience from Ebola and COVID-19 responses
- **Ministry of Education (MoE)** — girls' enrolment, retention, STEM participation data
- **Ministry of Labour (MoL)** — labour-force participation, wage gap, informal employment data
- **Ministry of Justice (MoJ)** — criminal-justice GBV data, legal aid
- **Ministry of Commerce & Industry (MoCI)** — financial inclusion, women-owned business data
- **Ministry of Finance & Development Planning (MFDP)** — gender-responsive budgeting data
- **Liberia Institute of Statistics and Geo-Information Services (LISGIS)** — the national statistical authority; owns the DHS, census, and labour force survey
- **Liberia Land Authority (LLA)** — women's land ownership data

### Donor and technical partners
- **World Bank (IDA)** — funder; reviews all major deliverables through the LWEP PMU
- **REALISE Project** — sibling World Bank project; the GB MIS must interoperate with REALISE to avoid duplicate household data collection
- **UN Women, UNFPA, UNICEF, UN Statistics Division** — global indicator custodians and methodology reference
- **FAO** — agricultural gender data reference (National Gender Profile of Agriculture and Livelihoods for Liberia, 2018)
- **WHO** — custodian of ethical/safety guidelines for VAWG research and data collection

## National & international policy anchors

The indicator framework and data standards derive from these instruments. Each is a first-class concept in the data model (see [INDICATORS_CATALOG.md](./INDICATORS_CATALOG.md)).

- **Beijing Platform for Action (BPfA)** — 12 areas of concern (poverty; education; health; violence; armed conflict; economy; power & decision-making; institutional mechanisms; human rights; media; environment; girl child)
- **Sustainable Development Goals (SDGs)** — SDG 5 + gender-relevant indicators across other goals; the **UN Minimum Set of Gender Indicators (48 quantitative + qualitative indicators, updated 12 April 2024)** is the core reference
- **Convention on the Elimination of All Forms of Discrimination Against Women (CEDAW)** — with Liberia-specific Concluding Observations (CEDAW/C/LBR) tracked for follow-up
- **Maputo Protocol** (AU Protocol on the Rights of Women in Africa)
- **AU Continental Framework for Women, Peace and Security** — five pillars (Prevention, Participation, Protection, Relief & Recovery, Prevention & Response to Emerging Threats)
- **Liberia National Gender Policy** (under revision)
- **Liberia National Action Plan on Women, Peace and Security** (3rd iteration, under development)
- **Liberia ARREST Agenda (2025–2029)** — national development plan
- **Liberia Vision 2030** — long-term aspiration
- **Africa Vision 2063**

## Project duration and acceptance model

Delivery is **16 weeks of consultant effort split across 12 months** in two phases:

- **Phase 1 — Delivery (12 weeks across the first 6 months):** Inception → System Development → Training → Rollout & Field Test → Final Presentation
- **Phase 2 — Post-deployment support (4 weeks across the following 6 months, on-call):** Technical support and refresher training

Acceptance happens at defined gates — Inception, Prototype, UAT, Go-Live, Handover — each reviewed by the MOGCSP Technical Team and PMU, and approved by the Deputy Minister for Gender within five working days of submission using the **Audit Trail Form** feedback mechanism (see `/project-materials/Anex_1-_Audit_Trail_Form.docx`).

See [ROADMAP.md](./ROADMAP.md) for the week-by-week plan mapped to deliverables and payment tranches.

## What success looks like

At handover, MOGCSP should have:

1. A running, hosted, fully functional GB MIS accessible to authorised users across all six LWEP counties and the Monrovia HQ.
2. Complete source code, database schemas, administrator credentials, API keys, signing certificates, and cloud account control handed over — no vendor-held assets.
3. Trained MOGCSP staff across all seven role categories (see [ROLES_PERMISSIONS.md](./ROLES_PERMISSIONS.md)) able to use the system without consultant intervention.
4. A living indicator dataset covering the 22 minimum indicators plus the full UN SDG minimum set, with documented provenance for each data point.
5. A working DHIS2 interoperability channel and a REALISE integration channel, both operating on scheduled syncs.
6. Written disaster-recovery runbooks and a 12-month performance-tuning + bug-fix support commitment from the consultant.
