# Glossary

Acronyms, abbreviations, and domain terms used throughout the GB MIS documentation. Alphabetical within groups.

---

## Government of Liberia

| Term | Expansion | Notes |
|---|---|---|
| **ARREST Agenda** | Agriculture, Roads, Rule of Law, Education, Sanitation & Health, Tourism | Liberia's national development plan for 2025–2029 |
| **LISGIS** | Liberia Institute of Statistics and Geo-Information Services | The national statistical authority; owns the census, DHS, Labour Force Survey |
| **LLA** | Liberia Land Authority | Authoritative source for land-ownership data |
| **LWEP** | Liberia Women Empowerment Project | The US$44.6 M World Bank-funded project under which the GB MIS is built (2022–2027) |
| **MFDP** | Ministry of Finance and Development Planning | Owns gender-responsive budgeting data |
| **MoA** | Ministry of Agriculture | LWEP co-implementer; provides agricultural gender data |
| **MoCI** | Ministry of Commerce and Industry | Provides financial inclusion and women-owned business data |
| **MoD** | Ministry of Defence | Provides data on women in the armed forces (peacekeeping indicators) |
| **MoE** | Ministry of Education | Provides education indicators from the EMIS |
| **MoGCSP / MOGCSP** | Ministry of Gender, Children and Social Protection | The GB MIS's owner |
| **MoH** | Ministry of Health | Provides maternal health, ASRH, HIV, contraceptive prevalence data; runs Liberia's DHIS2 |
| **MoJ** | Ministry of Justice | Provides criminal-justice GBV data and legal aid data |
| **MoL** | Ministry of Labour | Provides labour-force participation, wage gap, informal employment data |
| **PMU** | Project Management Unit | The LWEP management team within MOGCSP |
| **REALISE** | A sibling World Bank project in Liberia | Shares a beneficiary-deduplication integration with LWEP |
| **Vision 2030** | Liberia's long-term development vision | Policy anchor for the indicator framework |

---

## International frameworks and instruments

| Term | Expansion | Notes |
|---|---|---|
| **AU** | African Union | |
| **AU WPS** | African Union Continental Framework for Women, Peace and Security | Organised around five pillars (Prevention, Participation, Protection, Relief & Recovery, Emerging Threats) |
| **Beijing + 30** | 30-year review of the Beijing Platform for Action | Shaped the 2025 update of gender-indicator priorities |
| **BPfA** | Beijing Platform for Action | 1995 global framework for gender equality; 12 areas of concern |
| **CEDAW** | Convention on the Elimination of All Forms of Discrimination Against Women | UN treaty; Liberia reports periodically; Concluding Observations drive follow-up indicators |
| **ECOWAS** | Economic Community of West African States | |
| **GDPR** | General Data Protection Regulation (EU) | Reference framework for data protection; we align with its principles |
| **Maputo Protocol** | AU Protocol on the Rights of Women in Africa | Africa-specific women's rights instrument |
| **SDG** | Sustainable Development Goals | UN 2030 agenda; SDG 5 is gender equality; we track all gender-relevant SDG indicators |
| **SDG 5** | Gender equality goal | |
| **UN SDG Minimum Set** | UN Statistics Division Minimum Set of Gender Indicators | 48 quantitative + 12 qualitative indicators; updated 12 April 2024; master reference for our catalog |
| **UNSD** | United Nations Statistics Division | Custodian of methodology for many statistical indicators |

---

## International agencies and custodians

| Term | Expansion | Notes |
|---|---|---|
| **FAO** | Food and Agriculture Organization | Custodian for land-ownership and agricultural gender indicators |
| **IDA** | International Development Association (World Bank) | LWEP financier |
| **ILO** | International Labour Organization | Custodian for labour-force, wage, and employment gender indicators |
| **IPU** | Inter-Parliamentary Union | Custodian for women-in-parliament data |
| **ITU** | International Telecommunication Union | Custodian for ICT access indicators |
| **OECD** | Organisation for Economic Co-operation and Development | Reference for institutional-discrimination indicators |
| **UIS** | UNESCO Institute for Statistics | Custodian for education indicators |
| **UN** | United Nations | |
| **UNAIDS** | Joint UN Programme on HIV/AIDS | HIV-related custodian |
| **UNDP** | United Nations Development Programme | |
| **UNESCO** | UN Educational, Scientific and Cultural Organization | |
| **UNFPA** | United Nations Population Fund | Custodian for reproductive-health indicators |
| **UNICEF** | UN Children's Fund | Custodian for child-marriage, FGM/C, child-mortality indicators |
| **UN Women** | UN Entity for Gender Equality and the Empowerment of Women | Co-custodian for several SDG 5 indicators |
| **UNODC** | UN Office on Drugs and Crime | Custodian for GBV and justice-system indicators |
| **UNPD** | UN Population Division | Custodian for mortality and fertility indicators |
| **WHO** | World Health Organization | Custodian for health indicators; author of the VAWG ethical guidance |

---

## Domain terms

| Term | Meaning |
|---|---|
| **ASRH** | Adolescent Sexual and Reproductive Health. A component of LWEP's health-sector engagement |
| **Beneficiary** | An individual enrolled in a LWEP programme activity — livelihood grant, community session, VSLA, etc. Not the same as a GBV case survivor, though a person can be both |
| **BPfA** | Beijing Platform for Action — see above |
| **Case** | In this system, a record of a GBV incident and the services / referrals provided. Centred on the survivor |
| **Case worker** | Frontline MOGCSP staff member who performs case intake and service coordination |
| **Consent record** | A `ConsentRecord` entity tracking what the subject has agreed to have their data used for, across what timeframe |
| **DHIS2** | District Health Information Software 2. The open-source health MIS used across much of Africa; MoH runs Liberia's instance; we interoperate with it as an indicator bus |
| **DHS** | Demographic and Health Survey. Nationally representative household survey; Liberia's most recent was 2019–2020, conducted by LISGIS |
| **DPA** | Data Protection Act (or equivalent Liberian legislation) |
| **DPIA** | Data Protection Impact Assessment. A formal document analysing the privacy risks of the system |
| **DPO** | Data Protection Officer. MOGCSP-appointed individual who oversees data-subject requests and breach notifications |
| **ETL** | Extract, Transform, Load. Shorthand for scheduled data-ingestion jobs |
| **FGM/C** | Female Genital Mutilation / Cutting |
| **GBV** | Gender-Based Violence. Umbrella term covering physical, sexual, psychological, economic violence, and harmful practices |
| **GEWE** | Gender Equality and Women's Empowerment |
| **HIES** | Household Income and Expenditure Survey — LISGIS survey used for literacy and poverty indicators |
| **IPV** | Intimate Partner Violence. A subset of GBV |
| **IRB** | Institutional Review Board. Ethics-review body for research |
| **IVR** | Interactive Voice Response. Not used in Phase 1 but mentioned in some stakeholder discussions |
| **K-anonymity** | Privacy property where each published record is indistinguishable from at least k–1 others; our minimum k is 5 |
| **Keycloak** | The open-source identity provider we use for auth |
| **KMS** | Key Management Service. Stores cryptographic keys outside the database |
| **M&E** | Monitoring and Evaluation |
| **MFA** | Multi-Factor Authentication |
| **MIS** | Management Information System |
| **MMR** | Maternal Mortality Ratio. Per 100,000 live births. One of our headline indicators |
| **MOU** | Memorandum of Understanding. Often used for inter-ministerial data-sharing arrangements |
| **NAP** | National Action Plan — in context of WPS, the national implementation plan for UNSCR 1325 |
| **OIDC** | OpenID Connect. The auth protocol Keycloak speaks |
| **Org unit** | Short for organisation unit; a node in the admin hierarchy (nation, county, district, community, facility) |
| **PDO** | Project Development Objective. World Bank term for the top-level project outcome statement |
| **PII** | Personally Identifiable Information |
| **PKCE** | Proof Key for Code Exchange. OAuth security extension used by our mobile app |
| **RBAC** | Role-Based Access Control |
| **RLS** | Row-Level Security. PostgreSQL feature that enforces per-row access policies |
| **RPO** | Recovery Point Objective. Maximum acceptable data loss in a disaster |
| **RTO** | Recovery Time Objective. Maximum acceptable downtime in a disaster |
| **SASA!** | A community mobilisation approach to preventing violence against women. The name is not an acronym; it means "now" in Kiswahili |
| **SBOM** | Software Bill of Materials. A list of all components in a released artefact |
| **SDLC** | Software Development Lifecycle |
| **SGBV** | Sexual and Gender-Based Violence. Overlaps heavily with GBV; used in AU and UN contexts |
| **SRE** | Site Reliability Engineering |
| **Survivor** | A person who has experienced GBV. We use this term rather than "victim" except when quoting a legal source |
| **TOR** | Terms of Reference. The contract document defining the consultant's scope |
| **UAT** | User Acceptance Testing |
| **UNSCR 1325** | UN Security Council Resolution 1325 on Women, Peace and Security (2000) |
| **VAWG** | Violence Against Women and Girls |
| **VSLA** | Village Savings and Loans Association. Community-level savings groups, a LWEP livelihoods instrument |
| **WASH** | Water, Sanitation and Hygiene |
| **WPS** | Women, Peace and Security. The policy domain anchored in UNSCR 1325 |

---

## Technical terms

| Term | Meaning |
|---|---|
| **ADR** | Architecture Decision Record |
| **argon2id** | Password-hashing algorithm we use in Keycloak and for device-key derivation |
| **BullMQ** | The background-job queue library we use atop Redis |
| **DEK** | Data Encryption Key. Encrypts data; itself encrypted by a KEK |
| **HSTS** | HTTP Strict Transport Security |
| **JWT** | JSON Web Token. Our access-token format |
| **KEK** | Key Encryption Key. Wraps DEKs in the KMS |
| **mTLS** | Mutual TLS. Both ends authenticate via certificate; used for partner integrations |
| **OpenAPI** | Open standard for describing REST APIs; we use version 3.1 |
| **PostGIS** | PostgreSQL extension for geographic data |
| **Prisma** | Our TypeScript ORM |
| **SAST** | Static Application Security Testing |
| **SQLCipher** | Encrypted-at-rest SQLite implementation used on the mobile app |
| **SSE-KMS** | Server-Side Encryption with KMS-managed keys. Object-storage encryption scheme |
| **Turborepo** | Our monorepo build orchestrator |
| **Vitest** | Our primary test runner |
| **WAF** | Web Application Firewall |
| **WatermelonDB** | The offline database library used by the mobile app |
| **WebAuthn** | Hardware-key-based authentication standard; used by admins |

---

## Role shorthand

See [ROLES_PERMISSIONS.md](./ROLES_PERMISSIONS.md) for full definitions.

| Code | Role |
|---|---|
| `SUPER_ADMIN` | System super-administrator; break-glass only |
| `ADMIN` | Day-to-day platform administrator |
| `SUPERVISOR` | County-level case-worker supervisor |
| `CASE_WORKER` | Frontline GBV case management |
| `DATA_ENTRY_CLERK` | High-volume data entry |
| `ANALYST` | M&E and research |
| `VIEWER` | Read-only executive / partner |
| `DPO` | Data Protection Officer (attribute) |
| `M_AND_E_OFFICER` | Monitoring and Evaluation officer (attribute) |
| `CHILD_PROTECTION_LEAD` | Lead on cases involving minors (attribute) |
| `COMPLIANCE_AUDITOR` | Time-bounded audit engagement role (attribute) |
