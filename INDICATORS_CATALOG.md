# Indicators Catalog

This document enumerates the gender-equality indicators the GB MIS tracks. It is the human-readable version of what lives in the `Indicator` table (see [DATA_MODEL.md § 5](./DATA_MODEL.md#5-indicators-context)) and is the source used when seeding a fresh database via `pnpm db:seed`.

---

## Organisation

Indicators are grouped by framework. Each indicator carries:

- **Code** — stable identifier, never reused (e.g. `BPfA-REP-001`)
- **Name** — the official name
- **Area** — BPfA area or SDG goal
- **Unit** — of measurement
- **Periodicity** — how often new values arrive
- **Disaggregations** — supported breakdowns (sex is always required; age/location/disability as applicable)
- **Lead Ministry** — authoritative owner inside the Government of Liberia
- **Custodian Agency** — international custodian for methodology (WHO, UN Women, ILO, etc.)
- **Source** — the upstream dataset the value is typically drawn from
- **SDG Link** — the SDG target or indicator this maps to (where applicable)
- **DHIS2 Data Element** — optional mapping to a DHIS2 data element code (populated once DHIS2 alignment is done during Inception)
- **Notes** — methodology caveats

The indicator catalog is extensible: new frameworks (e.g. an ARREST Agenda monitoring framework) can be added as data, not as code changes. See `packages/indicators/src/catalog/` for the machine-readable source.

---

## Framework 1: The LWEP agreed 22-indicator minimum set

Source: the MOGCSP task-force consolidated list provided with the TOR (TASK_2 BAses for GB IMS GEWE Framework Assignment.xlsx, "Consolidated list" sheet).

### Representation

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-REP-001` | Percentage of seats held by women in national parliament | % | Annual | MOGCSP | IPU / UN Women | IPU, Liberia National Elections Commission | 5.5.1 |
| `BPfA-REP-002` | Percentage of women in ministerial positions | % | Annual | MOGCSP | UN Women | UN Women Global Database on Women in Politics | 5.5.1 |
| `BPfA-REP-003` | Percentage of women in leadership positions in media organisations | % | Biennial | MOGCSP | — | Liberia Media Development Report | — |
| `BPfA-REP-004` | Percentage of women in local councils / leadership positions in municipalities | % | Annual | MOGCSP | — | Local Government Act Implementation Report | 5.5.1 |
| `BPfA-REP-005` | Percentage of women leaders in civil-society organisations | % | Biennial | MOGCSP | — | Liberia CSO Report | — |

### Education

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-EDU-001` | Net enrolment rate for girls in primary education | % | Annual | MoE | UIS / UNESCO | MoE EMIS, UNESCO UIS | 4.1.2 |
| `BPfA-EDU-002` | Percentage of girls completing secondary education | % | Annual | MoE | UIS / UNESCO | MoE EMIS, UNICEF | 4.1.2 |
| `BPfA-EDU-003` | Adult female literacy rate | % | Every 5y | MoE | UIS / UNESCO | UNESCO, LISGIS HIES | 4.6.2 |
| `BPfA-EDU-004` | Percentage of women enrolled in STEM programs in tertiary education | % | Annual | MoE | UIS / UNESCO | MoE higher-ed returns | — |

### Work

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-WRK-001` | Female labour-force participation rate | % | Annual | MoL | ILO | ILO, LISGIS LFS | 8.5 |
| `BPfA-WRK-002` | Gender wage gap | % | Annual | MoL | ILO | ILO, LISGIS LFS | 8.5.1 |

### Health

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-HLT-001` | Maternal mortality ratio | per 100,000 live births | Annual | MoH | WHO / UNICEF / UNFPA | WHO, LISGIS DHS | 3.1.1 |
| `BPfA-HLT-002` | Contraceptive prevalence rate (modern methods) | % | Every 5y | MoH | UNPD / UNFPA | LISGIS DHS | 3.7.1 |
| `BPfA-HLT-003` | Percentage of women aged 20–24 married before age 18 | % | Every 5y | MoH | UNICEF | DHS, UNICEF | 5.3.1 |

### Violence (GBV)

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-GBV-001` | Prevalence of physical or sexual violence against women | % | Every 5y | MOGCSP | WHO / UNSD / UN Women | LISGIS DHS | 5.2.1 |

### WASH

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-WSH-001` | Percentage of women with access to safe drinking water and improved sanitation facilities | % | Annual | MoA / MoH | WHO / UNICEF JMP | Water & Sanitation Sector Performance Report | 6.1.1 / 6.2.1 |

### Agriculture & Environment

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-AGR-001` | Percentage of women with land ownership rights | % | Annual | MoA / LLA | FAO | Liberia Land Authority | 5.a.1 |
| `BPfA-AGR-002` | Percentage of women involved in decision-making in agricultural cooperatives | % | Annual | MoA | FAO | MoA cooperatives registry | 5.a |
| `BPfA-ENV-001` | Percentage of women involved in environmental conservation programs | % | Biennial | MoA / EPA | — | Liberia EPA | — |

### Security

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `BPfA-SEC-001` | Percentage of women in military or police peacekeeping forces | % | Annual | MoD / MoJ | UNODC | MoJ report, UNODC | 5.5 |

### Maputo Protocol additions

| Code | Indicator | Unit | Periodicity | Lead | Custodian | Typical Source | SDG |
|---|---|---|---|---|---|---|---|
| `MAPUTO-REP-001` | Percentage of women in national parliament (Maputo reporting frame) | % | Annual | MOGCSP | AU / UN Women | World Bank Gender Data Portal | 5.5.1 |
| `MAPUTO-DM-001` | Percentage of women in senior / decision-making positions (public or private sector) | % | Annual | MOGCSP | UN Women | MOGCSP survey | 5.5.2 |

**Total: 22 indicators** in the agreed minimum set.

---

## Framework 2: UN Minimum Set of Gender Indicators (48 quantitative + qualitative)

Source: UN Statistics Division, Minimum Set of Gender Indicators, updated 12 April 2024. This is the master reference for international reporting and is implemented in full — indicators absent from Framework 1 are still tracked here.

### Theme I: Economic structures, participation in productive activities, and access to resources

Five-area coverage: paid/unpaid work balance, labour-force participation, employment status, wages, poverty, ICT access.

| Code | Indicator | Tier | Custodian | SDG |
|---|---|---|---|---|
| `UNMIN-I-01` | Average number of hours spent on unpaid domestic and care work, by sex, age, location | 2 | UNSD / UN Women | 5.4.1 |
| `UNMIN-I-02` | Average number of hours spent on total work (paid and unpaid), by sex | 2 | UNSD | — |
| `UNMIN-I-03` | Labour-force participation rate for persons 15–24 and 15+, by sex | 1 | ILO | 8 |
| `UNMIN-I-04` | Proportion of employed by status in self-employment, by sex | 1 | ILO | 8 |
| `UNMIN-I-05` | Proportion of youth (15–24) not in education, employment or training, by sex | 1 | ILO | 8.6.1 |
| `UNMIN-I-06` | Percentage distribution of employed population by sector (Agriculture / Industry / Services), by sex | 1 | ILO | 8 |
| `UNMIN-I-07` | Proportion of informal employment in non-agriculture employment, by sex | 2 | ILO | 8.3.1 |
| `UNMIN-I-08` | Unemployment rate, by sex, age, disability | 1 | ILO | 8.5.2 |
| `UNMIN-I-09` | Proportion of adults (15+) with a bank / financial-institution / mobile-money account, by sex | 1 | World Bank | 8.10.2 |
| `UNMIN-I-10` | Ownership / secure rights over agricultural land, by sex; share of women among owners | 2 | FAO | 5.a.1 |
| `UNMIN-I-11` | Gender gap in wages, by occupation, age, disability | 2 | ILO | 8.5.1 |
| `UNMIN-I-12` | Proportion of employed working part-time, by sex | 2 | ILO | — |
| `UNMIN-I-13` | Prime-age employment-to-population ratio by sex, household type, presence of children | 1 | ILO | — |
| `UNMIN-I-14` | Proportion of population below international poverty line, by sex, age, employment, urban/rural | 1 | ILO / World Bank | 1.1.1 |
| `UNMIN-I-15` | Proportion of individuals using the internet, by sex | 1 | ITU | 17.8.1 |
| `UNMIN-I-16` | Proportion of individuals who own a mobile telephone, by sex | 2 | ITU | 5.b.1 |

### Theme II: Education

| Code | Indicator | Tier | Custodian | SDG |
|---|---|---|---|---|
| `UNMIN-II-01` | Participation rate in organised learning (one year before primary entry age), by sex | 1 | UIS | 4.2.2 |
| `UNMIN-II-02` | Total net enrolment rate, primary, by sex | 1 | UIS | 4 |
| `UNMIN-II-03` | Gross enrolment ratio in secondary education, by sex | 1 | UIS | 4 |
| `UNMIN-II-04` | Gross enrolment ratio in tertiary education, by sex | 1 | UIS / UNESCO | 4.3.2 |
| `UNMIN-II-05` | Completion rate (primary, lower secondary) by sex, location, wealth quintile | 1 | UIS | 4.1.2 |
| `UNMIN-II-06` | Gross graduation ratio from first-degree programmes in tertiary education, by sex | 1 | UIS | — |
| `UNMIN-II-07` | Proportion of females among tertiary-education teachers / professors | 1 | UIS | 4 |
| `UNMIN-II-08` | Youth literacy rate (15–24), by sex | 1 | UIS / UNESCO | 4.6.2 |
| `UNMIN-II-09` | Proportion of youth and adults with ICT skills, by sex, skill type | 2 | UIS / ITU | 4.4.1 |
| `UNMIN-II-10` | Educational attainment of population 25+, by sex, level | 1 | UIS / UNESCO | 4.4.3 |

### Theme III: Health and related services

| Code | Indicator | Tier | Custodian | SDG |
|---|---|---|---|---|
| `UNMIN-III-01` | Proportion of women (15–49) with family-planning needs satisfied with modern methods | 1 | UNPD / UNFPA | 3.7.1 |
| `UNMIN-III-02` | Under-five mortality rate, by sex | 1 | UNICEF / UNPD / WHO | 3.2.1 |
| `UNMIN-III-03` | Maternal mortality ratio | 1 | WHO / UNICEF / UNFPA | 3.1.1 |
| `UNMIN-III-04` | Antenatal care coverage (at least one visit; at least four visits) | 1 | UNICEF | 3 |
| `UNMIN-III-05` | Proportion of births attended by skilled health personnel | 1 | UNICEF | 3.1.2 |
| `UNMIN-III-06` | Age-standardised prevalence of current tobacco use (15+), by sex | 1 | WHO | 3.a.1 |
| `UNMIN-III-07` | Proportion of adults who are obese, by sex | 1 | WHO | 3 |
| `UNMIN-III-08` | New HIV infections per 1,000 uninfected, by sex, age, key populations | 1 | UNAIDS | 3.3.1 |
| `UNMIN-III-09` | Access to antiretroviral drugs, by sex | 1 | WHO | 3 |
| `UNMIN-III-10` | Life expectancy at age 60, by sex | 1 | UNPD | 3 |
| `UNMIN-III-11` | Mortality from cardiovascular disease, cancer, diabetes, chronic respiratory disease, by sex | 1 | WHO | 3.4.1 |

### Theme IV: Public life and decision-making

| Code | Indicator | Tier | Custodian | SDG |
|---|---|---|---|---|
| `UNMIN-IV-01` | Women's share of government ministerial positions | 1 | UN Women | 5 |
| `UNMIN-IV-02` | Proportion of seats held by women in national parliament and local governments | 1 | IPU / UN Women | 5.5.1 |
| `UNMIN-IV-03` | Proportion of women in managerial positions | 1 | ILO | 5.5.2 |
| `UNMIN-IV-04` | Percentage of female police officers | 2 | UNODC | 5 |
| `UNMIN-IV-05` | Percentage of female judges | 2 | UNODC | 5 |
| `UNMIN-IV-06` | Proportion of women (15–49) making own informed decisions on sexual relations, contraception, reproductive health | 2 | UNFPA | 5.6.1 |

### Theme V: Human rights of women and girl children

| Code | Indicator | Tier | Custodian | SDG |
|---|---|---|---|---|
| `UNMIN-V-01` | Proportion of ever-partnered women (15+) subjected to IPV (physical / sexual / psychological) in last 12 months | 2 | WHO / UNSD / UNICEF / UN Women / UNODC / UNFPA | 5.2.1 |
| `UNMIN-V-02` | Proportion of women (15+) subjected to non-partner sexual violence in last 12 months, by age, place | 2 | same | 5.2.2 |
| `UNMIN-V-03` | Proportion of girls / women (15–49) who have undergone FGM/C, by age | 2 | UNICEF | 5.3.2 |
| `UNMIN-V-04` | Proportion of women (20–24) married before 15; before 18 | 2 | UNICEF | 5.3.1 |
| `UNMIN-V-05` | Adolescent birth rate (10–14; 15–19) per 1,000 women | 1 | UNPD / UNFPA | 3.7.2 |

### Qualitative indicators (national norms)

A separate set of 12 qualitative indicators captures the legal-framework dimension — whether ILO conventions are ratified, whether there is a maternity-leave law, whether quotas exist, whether laws on domestic violence and marital rape are in place, etc.

| Code | Indicator | Custodian | SDG |
|---|---|---|---|
| `UNMIN-QI-01` | Extent of country commitment to gender equality in employment (ILO C100, C111 ratification) | ILO | — |
| `UNMIN-QI-02` | Extent of country commitment to reconciliation of work and family (ILO C156, C175, C177, C183) | ILO | — |
| `UNMIN-QI-03` | Length of maternity leave | ILO | 1.3 |
| `UNMIN-QI-04` | Percentage of wages paid during maternity leave | ILO | 1.3 |
| `UNMIN-QIV-01` | Presence of a gender quota for parliament (reserved seats / legal candidate quotas) | UN Women | — |
| `UNMIN-QIV-02` | Presence of a gender quota for parliament (voluntary party quotas) | IPU / IDEA | — |
| `UNMIN-QIV-03` | Existence of a law on gender statistics | UNSD | — |
| `UNMIN-QV-01` | Legal frameworks in place to promote gender equality and non-discrimination (four areas) | UN Women / WB / OECD | 5.1.1 |
| `UNMIN-QV-02` | Existence of laws on domestic violence, marital rape, sexual harassment | World Bank | — |
| `UNMIN-QV-03` | Whether inheritance rights discriminate against women / girls | OECD / WB | — |
| `UNMIN-QV-04` | Legal minimum age at marriage, by sex (with / without parental consent) | UNSD | — |

---

## Framework 3: African Union Continental Framework for Women, Peace and Security (AU WPS)

Indicators across five pillars — Prevention, Participation, Protection, Relief & Recovery, Emerging Threats. Implemented in full at catalog level; used for Liberia's AU reporting obligations.

Pillar structure is modelled as `area` values in the `Indicator` table: `AU-WPS-PREVENTION`, `AU-WPS-PARTICIPATION`, `AU-WPS-PROTECTION`, `AU-WPS-RELIEF-RECOVERY`, `AU-WPS-EMERGING-THREATS`.

High-priority subset for seeding (the full set of 30+ indicators lives in the machine-readable catalog):

| Code | Indicator | Pillar |
|---|---|---|
| `AU-WPS-PR-001` | Existence of laws / policies integrating gender into peace and security | Prevention |
| `AU-WPS-PR-002` | Proportion of national budget allocated to government departments addressing the WPS agenda | Prevention |
| `AU-WPS-PA-001` | Percentage of women in decision-making positions (ministers, permanent secretaries, commission heads) | Participation |
| `AU-WPS-PA-002` | Percentage of women in elective positions (national assembly, senate, mayors, electoral management bodies) | Participation |
| `AU-WPS-PA-003` | Percentage of women in security institutions (police, justice, military, immigration, intelligence, prisons) | Participation |
| `AU-WPS-PT-001` | Existence of legal and policy frameworks protecting women from SGBV | Protection |
| `AU-WPS-PT-002` | Number / proportion of GBV cases reported, acted upon, concluded | Protection |
| `AU-WPS-RR-001` | Existence of gender provisions in peace agreements | Relief & Recovery |
| `AU-WPS-RR-002` | Proportion of post-conflict recovery budget set aside for gender equality | Relief & Recovery |

---

## Framework 4: CEDAW Concluding Observations follow-up

CEDAW reporting is different from the other frameworks — rather than numeric indicators, it tracks recommendation-level implementation status. The `CedawRecommendation` and `CedawImplementationStatus` tables capture this and produce an "implementation scorecard" rather than numeric values.

The input for Liberia is the most recent CEDAW Concluding Observations document (referenced in the Task 2 spreadsheet CEDAW sheet). Each recommendation is modelled as:

| Field | Example |
|---|---|
| `cedawCode` | `D-22-c` (D = Recommendation, paragraph 22, sub-c) |
| `area` | "Stereotypes and harmful practices" |
| `recommendationText` | (as published) |
| `leadMinistry` | MOGCSP / MoE / etc. |
| `implementationStatus` | NOT_STARTED \| IN_PROGRESS \| COMPLETED \| SUPERSEDED |
| `evidence` | references to laws, policies, programmes demonstrating implementation |
| `nextReviewDue` | date |

This is surfaced in the "CEDAW follow-up" dashboard for the Deputy Minister.

---

## Framework 5: LWEP Project Output Indicators

These are not national-reporting indicators — they are LWEP's internal programme M&E indicators for World Bank reporting. They live in the same schema with `framework = 'LWEP'` and are **not** synced to DHIS2 (they are internal to LWEP management).

High-level examples (full set is in the LWEP Results Framework):

| Code | Indicator |
|---|---|
| `LWEP-OUT-C1-01` | Number of communities reached with SASA! social norms engagement |
| `LWEP-OUT-C1-02` | Number of community members participating in SASA! sessions, by sex and age |
| `LWEP-OUT-C2-01` | Number of adolescents accessing ASRH services in LWEP-supported facilities, by sex and age |
| `LWEP-OUT-C2-02` | Number of GBV cases receiving service through LWEP-supported entry points |
| `LWEP-OUT-C3-01` | Number of women receiving livelihood grants |
| `LWEP-OUT-C3-02` | Percentage of grant recipients reporting increased income 12 months post-disbursement |
| `LWEP-OUT-C4-01` | Number of MOGCSP / MoA staff trained on gender mainstreaming |
| `LWEP-OUT-C5-01` | Data-completeness rate of the GB MIS across the six counties |

---

## Framework 6: ARREST Agenda & National Gender Policy indicators

Populated once the new National Gender Policy and the updated ARREST Agenda monitoring framework are approved by the Government of Liberia. The schema is ready; the catalog entries are added by configuration, not code changes.

---

## Data value lifecycle

For each `Indicator`, an `IndicatorValue` is created when:

1. **Computed** — derived from case or beneficiary data in the MIS itself. The `indicators` module runs a pipeline on a schedule (hourly for LWEP output indicators, nightly for anything deriving from external data).
2. **Imported** — ingested from an upstream authoritative source (LISGIS DHS, MoH DHIS2, etc.) by the `etl` worker. `source` = `IMPORTED_*`.
3. **Manually entered** — for indicators where no upstream data exists yet, an authorised `analyst` role user can enter values through the web UI. Manual entries carry `qualityFlag = UNVERIFIED` until confirmed by the source ministry.
4. **Pulled from DHIS2** — for indicators where DHIS2 is the authoritative source for Liberia (health indicators primarily), `dhis2-sync` pulls the latest value.

Every value carries its `source`, `sourceReference`, and `qualityFlag`. The public dashboard filters to `qualityFlag IN (VERIFIED, PROVISIONAL)` by default; researchers with an analyst role can see unverified values.

---

## DHIS2 mapping

Not every indicator is synced to DHIS2. The mapping policy is:

- **Sync**: UN Minimum Set, Beijing Platform indicators, SDG indicators — these are national reporting indicators DHIS2 is the right bus for.
- **Do not sync**: LWEP internal output indicators, CEDAW implementation status, AU WPS indicators that are narrative rather than numeric.

Mappings live in `packages/indicators/src/dhis2-mapping.ts` and are reviewed quarterly with the MoH's DHIS2 administrator.

---

## Adding a new indicator

1. Choose a `code` in the appropriate namespace (never reuse a code).
2. Add an entry to `packages/indicators/src/catalog/` with all metadata.
3. If the indicator is computed from MIS data, add a formula implementation in `packages/indicators/src/formulas/`.
4. If the indicator has a DHIS2 counterpart, add the mapping entry.
5. Open a PR. The catalog change does not require a database migration — a seeding script runs on deploy to reconcile the `Indicator` table with the catalog file.
6. Update this document's framework section with the new entry.
7. Request sign-off from the MOGCSP M&E officer before merge.
