# Runbook — Incident Response

**Audience.** On-call engineer, MOGCSP ICT Director, MOGCSP Data Protection Officer (DPO), MOGCSP Deputy Minister for Gender (per role, not by name).

**Use this runbook when.** Any of the four incident types in this document is suspected or confirmed. When in doubt, treat as confirmed and start the playbook — under-reporting survivor-data incidents is the worst failure mode.

**Communication channels** (per `SECURITY.md § Communications`):

- **Internal**: dedicated Slack or Signal channel reserved for incidents. Engineers, ICT Director, DPO are members.
- **To the Deputy Minister**: direct phone call followed by written follow-up.
- **To the World Bank PMU**: written notification within 24 hours of any confirmed severity-high+ incident.
- **To affected individuals**: only after MOGCSP leadership has been informed and the DPO has authorised. **Never before.**

**Preserve evidence first.** Per `SECURITY.md § Immediate response`: every incident begins with snapshot, log capture, and hash before any containment action that may destroy state.

> ⚠️ **DPO + Deputy Minister sign-off required to close any incident in this runbook.** "Resolved" is a paper artifact, not a unilateral on-call call.

---

## 0. The first five minutes (every incident type)

1. **Acknowledge.** The detecting engineer announces the incident in the incident channel: incident type, time of detection, current evidence.
2. **Preserve evidence.** Capture immediately and in this order:
   - Container logs: `docker compose --env-file /run/gb-mis/env logs --since 30m > /var/log/incidents/$(date +%FT%H%M%S)-logs.txt`
   - Audit log slice: `psql "$DB_AUDIT_URL" -c "\\copy (SELECT * FROM audit_log WHERE occurred_at > now() - interval '30 minutes') TO '/var/log/incidents/$(date +%FT%H%M%S)-audit.csv' CSV HEADER"`
   - Database dump if data integrity is suspected: `backup-restore.md § 3 Manual backup`
   - Compute SHA-256 of every captured artifact and record in the incident channel.
3. **Notify the on-call rotation.** The on-call engineer (a person, not a bot) takes incident-commander role unless re-assigned.
4. **Identify incident type.** Pick exactly one playbook below. If two apply, run both in parallel.
5. **Open the timeline document.** Every action, decision, and notification is timestamped. The timeline is the single source of truth for the post-incident review.

---

## A. Confirmed data breach involving survivor data

This is the highest-severity incident type. The threshold for "confirmed" is: there is positive evidence that survivor-linked data has been accessed, copied, or transmitted by a party not authorised under `ROLES_PERMISSIONS.md`.

If the evidence is suggestive but unconfirmed, run section B (suspected credential compromise) in parallel until the picture is clearer.

### A.1 Notification timeline (per `COMPLIANCE.md § Breach notification`)

Two clocks. The **detection** clock starts the moment the incident is detected; the **awareness** clock starts when the incident is confirmed as a likely-rights-impacting breach (typically the same as detection for clear-cut cases, later for cases that need investigation to confirm).

| Within | Notify | Mechanism |
| --- | --- | --- |
| 1 hour of **detection** | MOGCSP ICT Director; incident commander opens incident, preserves evidence, begins containment | Phone + incident channel |
| 2 hours of **detection** | DPO, Deputy Minister for Gender, LWEP PMU | Direct phone calls, then written follow-up |
| 8 hours of **detection** | Preliminary written report — what, when, scope, initial impact estimate — to DPO + Deputy Minister + LWEP PMU | Written, MOGCSP document system |
| 24 hours of **detection** | World Bank PMU (severity-high+ confirmed incidents per `SECURITY.md § Communications`) | Written, severity-high template |
| 72 hours of **awareness** | Competent data protection authority (GDPR Art. 33 baseline, applied as Liberia's Data Protection guidelines per `COMPLIANCE.md`) — only if the breach is likely to result in risk to rights and freedoms | Written, regulator template |
| Without undue delay (after MOGCSP approval) | Affected individuals — only when the breach is likely to result in **high** risk; with advice on protective measures, in language they understand | Through the survivor's existing case worker, not a system message |

> ⚠️ **MOGCSP approval required** for any breach notification leaving the ministry. Per `COMPLIANCE.md § Breach notification`, "no breach notification is ever sent on behalf of MOGCSP without the Deputy Minister's approval." The DPO drafts; the Deputy Minister authorises.
>
> ⚠️ **MOGCSP approval required** for the timeline and content of survivor-affected-individual notification. The DPO directs whether and when this happens. **Do not contact affected individuals before MOGCSP leadership has been informed and a remediation plan is in place** (per `SECURITY.md § Communications`).
>
> **External authority — confirm at Inception**: the "competent data protection authority" referenced above is the regulator designated under Liberia's Data Protection guidelines / Data Protection Act in force at deployment (per `COMPLIANCE.md` § Frameworks). The DPO confirms the named authority and its filing channel during Inception and updates the regulator-notification template in the MOGCSP document system. Until confirmed, the 72-hour notification is drafted and held with the DPO pending channel confirmation — the clock does not pause.

### A.2 Containment

1. **Identify the access vector.** Check audit log filtered to the suspected window:
   ```
   psql "$DB_AUDIT_URL" -c "SELECT actor_id, action, entity_type, entity_id, occurred_at, ip_address FROM audit_log WHERE occurred_at > now() - interval '24 hours' AND entity_type IN ('GbvCase','Beneficiary','CaseAttachment','Incident') ORDER BY occurred_at DESC;" > /var/log/incidents/$(date +%FT%H%M%S)-suspect-access.csv
   ```
2. **Disable the suspect actor.** If the breach traces to a specific user, disable their Keycloak account immediately:
   - In `$KEYCLOAK_URL` admin console, realm `gb-mis`, find the user, set Enabled=Off, terminate active sessions.
   - Also revoke their refresh tokens via Keycloak's token revocation endpoint.
3. **Disable the access path.** If the breach traces to a compromised service account or API key, rotate the credential at the KMS and refresh secrets per `deploy.md § 3, step 4`. The active processes will pick up the new credential at the next refresh cycle (within minutes).
4. **Preserve scope.** Do not delete log lines, audit rows, or database content during containment — RLS already prevents further reads by the disabled actor. The forensic trail is more valuable than the imagined cleanup.
5. **Block the egress** if data was exfiltrated to a known IP/domain — coordinate with the network team to add a firewall rule. Document the rule with a stable identifier.

### A.3 Investigation

1. **Reconstruct what was accessed.** From the audit slice in A.2 step 1, list every `entity_id` viewed or exported by the suspect actor. Each is potentially affected.
2. **Identify affected survivors.** For each `entity_id` in the affected list, retrieve:
   - The case status, county (`org_unit_id`), assigned case worker
   - Whether the case is currently open, closed, or under supervisor review
   - Whether a `ConsentRecord` exists and what notification it permits
3. **Assess re-traumatisation risk.** This step is led by the DPO with the case-worker supervisor. For each affected survivor:
   - Could the leak place them at physical risk? (e.g. a perpetrator with knowledge of the system per `SECURITY.md § Threat model`)
   - Should the case be reassigned or escalated? Should the survivor be re-contacted by their regular case worker?
4. **Hash-chain check.** Verify the audit chain is intact across the incident window:
   ```
   docker exec gb-mis-api node dist/scripts/verify-audit-chain.js --since '2 hours ago'
   ```
   A break here means the audit log itself may have been tampered with — escalate immediately.

### A.4 Remediation

1. **Revoke and reissue** any credentials the suspect actor held: Keycloak password reset, MFA re-enrolment, refresh-token revocation.
2. **Patch the vector** if technical: code change, config change, RLS policy adjustment. The change goes through the standard PR + review path, but may be expedited as a hotfix per `CONTRIBUTING.md`.
3. **Communications to survivors** are decided by the DPO and MOGCSP leadership. The notification, when it happens, is delivered through the survivor's existing case worker — not a system-generated message.
4. ⚠️ **MOGCSP approval required** before any public statement. The Deputy Minister approves all external communication.

### A.5 Closure

1. The incident is closed only when the DPO and Deputy Minister both sign off in writing.
2. The post-incident review (section 7) is filed within 10 working days.
3. A regulatory letter is filed if A.1's open question resolves to a notification obligation.

---

## B. Suspected credential compromise

Trigger: anomalous login pattern, a user reports they did not perform an action attributed to them, password manager reports a credential leak match, brute-force attempts against a specific account exceed Keycloak's threshold.

### B.1 Initial response

1. **Identify the account(s).** Pull the suspect login history from Keycloak:
   ```
   curl -sf -H "Authorization: Bearer $KEYCLOAK_ADMIN_TOKEN" "$KEYCLOAK_URL/admin/realms/gb-mis/events?type=LOGIN&type=LOGIN_ERROR&type=REFRESH_TOKEN&user=$USER_ID&first=0&max=200" | jq
   ```
   Capture the IPs, user-agents, and timestamps.
2. **Cross-reference audit log.** Did the suspect session perform sensitive actions? In particular: any read of `GbvCase` or `Beneficiary` outside the user's normal county, any export, any role change.
3. **Determine severity.** If sensitive actions occurred, the incident escalates to **A** (data breach). Run the A playbook.

### B.2 Containment

1. **Force logout.** Terminate the user's active sessions in Keycloak admin (Sessions → Logout all).
2. **Reset password.** Reset via Keycloak admin; require the user to set a new password on next login. ⚠️ **MOGCSP approval required** if the user is `SUPER_ADMIN` or `ADMIN` — coordinate with the ICT Director so two-person flow is preserved.
3. **Re-enrol MFA.** Wipe the user's MFA enrolment and require re-enrolment via Keycloak admin.
4. **Notify the user** through an out-of-band channel (their work phone, not the application). Confirm whether they recognise the activity. Their answer determines whether to escalate to A.
5. **Audit hash check** on the user's recent actions: identify any anomalous deletions or updates the legitimate user did not perform.

### B.3 Hardening

1. If brute-force was the vector, confirm Keycloak's brute-force protection is on (it is, per `infra/keycloak/realm-export.json`); review the threshold and lockout duration.
2. If a phishing kit captured the credential, send a ministry-wide reminder of the OIDC redirect URL pattern (`auth.$DOMAIN`); never accept credentials served from any other host.
3. ⚠️ **MOGCSP approval required** to require ministry-wide MFA re-enrolment if the compromise vector suggests other accounts may be affected.

### B.4 Closure

The DPO is informed of the incident regardless of whether section A is invoked, because credential compromise is a leading indicator. Close per section 7.

---

## C. Lost or stolen mobile device

Trigger: a case worker reports their device missing, an admin observes a device performing unexpected sync from an unfamiliar location, or device-loss is suspected from secondary signals (the device has not synced in N days and the case worker is contactable but cannot produce the device).

### C.1 Initial response

1. **Identify the device and the assigned case worker.** From the admin panel, locate the device record by case worker. Capture:
   - Last sync timestamp
   - Last known IP / approximate location
   - Number of `PENDING` `sync_records` on the device at last sync
2. **Confirm with the case worker** through a known-good channel (their personal phone, supervisor) that the device is genuinely lost, not misplaced.

### C.2 Containment

1. **Mark device as lost** in the admin panel. Per `SECURITY.md § Lost or stolen device`: the next time the device contacts the API, the app performs a wipe of the local encrypted database.
2. **Disable the case worker's session** at the Keycloak level — refresh tokens are revoked, the next device contact returns 401 and triggers the wipe path.
3. **Trust the encryption-at-rest.** If the device never reconnects, SQLCipher + the Android Keystore-bound device key (per `apps/mobile/MOBILE_SQLCIPHER_BUILD.md`) protect the local database against offline attack. The local DB is deliberately small (a few days of pending sync at most) — this caps blast radius even in the worst case.

### C.3 Survivor-impact assessment

1. Identify what the device held by examining server-side records assigned to the case worker:
   ```
   psql "$DB_URL" -c "SELECT id, county, status FROM gbv_cases WHERE assigned_case_worker_id = '$USER_ID' AND updated_at > now() - interval '7 days';"
   ```
2. List `sync_records` that were pending at last sync — these may not have reached the server. The post-incident reconciliation reaches out to the case worker to recover any from memory or paper notes (their training emphasises a paper-first intake practice exactly for this case).
3. ⚠️ **MOGCSP approval required** by the DPO for any survivor re-contact arising from this device loss. The case-worker supervisor leads the re-contact.

### C.4 Replacement

1. The case worker is issued a new device per the standard MDM provisioning process. The device receives a new identity and a fresh device-bound key — no migration of the lost device's key material.
2. The case worker's Keycloak password is reset and MFA re-enrolled when they regain access (treat the lost device as a possible compromise vector → run section B in parallel if there's any reason to suspect the device was compromised before going missing).

### C.5 Closure

1. After 30 days of no device contact, the device record is archived and the wipe-on-next-contact flag remains active in case the device ever appears again.
2. ⚠️ **DPO sign-off required** to close.

---

## D. Accidental internal data disclosure

Trigger: a permission error allowed a user to view data outside their scope; an export was sent to the wrong person; a screenshot of survivor data was shared in a non-reserved channel; a developer queried a production database directly without authorisation.

This is the lowest-severity incident type **only when** the recipient was internal and the volume was small. If either condition fails, escalate to section A.

### D.1 Initial response

1. **Identify the disclosure.** What data was disclosed? To whom? When? Through what channel?
2. **Capture evidence** — the message, the email, the screenshot, the audit-log entries showing the access. Hash and store.
3. **Determine the recipient's authorisation.** Cross-check `ROLES_PERMISSIONS.md`: would the recipient have been authorised to see the data through their normal role?
   - If yes: this is a **process** failure (wrong channel) but not a privacy incident. Document, train, close.
   - If no: this is a **privacy** incident. Continue.

### D.2 Containment

1. **Recall the disclosure** where possible: ask the recipient to delete the message/email/screenshot from their devices. Document the request and the confirmation.
2. If the recipient is outside MOGCSP, escalate to section A — internal-only is a precondition for this section.
3. **Block the disclosure path** if technical: revoke the export token, fix the permission bug, patch the RLS policy. The fix follows the standard PR review process.

### D.3 Investigation

1. Was the disclosure caused by:
   - A bug in the application (RLS gap, permission check missing)?
   - A configuration error (wrong export role assigned)?
   - User behaviour (screenshot, email forward)?
2. Each root cause has a different remediation. Document which.
3. If multiple users may have triggered the same bug, identify all affected entities and assess the same way as in A.3.

### D.4 Remediation

1. **Technical fix** if the cause was a bug or config error. The PR includes a regression test specific to the discovered gap.
2. **Process or training fix** if the cause was user behaviour. The DPO determines the training intervention.
3. ⚠️ **MOGCSP approval required** by the DPO before declaring the technical fix sufficient — privacy regressions require the DPO to validate the test, not only the code reviewer.

### D.5 Closure

1. Internal disclosures with intact, authorised recipients close with a memo and a training note. ⚠️ **DPO sign-off required.**
2. Internal disclosures with unauthorised recipients always require Deputy Minister sign-off.

---

## 7. Post-incident review (every incident, every type)

Within 10 working days of incident closure, regardless of severity:

1. The incident commander writes the post-mortem document. Template lives in the MOGCSP document system.
2. The post-mortem covers:
   - Timeline (with timestamps from the incident channel)
   - Root cause (technical, process, or both)
   - What detected the incident, how long detection took, why it took that long
   - What was contained, when, and the contain-time
   - What was remediated, including any code changes (link the PRs)
   - Survivors affected (count and category, never names) and how the DPO directed survivor communication
   - Notifications performed against the timeline
   - Specific runbook improvements and their owners with due dates
3. The post-mortem is reviewed by the MOGCSP Technical Team. Severity-high+ post-mortems are presented to the Deputy Minister.
4. ⚠️ **MOGCSP approval required** to close the incident record. The DPO and the ICT Director both sign.
5. Action items from the post-mortem are tracked in the project tool until completed. Action items are not optional.

---

## Quick-reference card (printable)

```
DETECT → ANNOUNCE → PRESERVE → IDENTIFY TYPE → RUN PLAYBOOK

A. Survivor-data breach   →  1 h ICT Director; 2 h Deputy + DPO + LWEP PMU;
                              8 h written report; 24 h WB PMU; 72 h regulator (if rights-impacting)
B. Credential compromise  →  Lock account, force MFA re-enrol, escalate to A if sensitive access occurred
C. Lost / stolen device   →  Mark lost in admin, revoke session, trust SQLCipher
D. Internal disclosure    →  Recall, fix path, DPO assesses scope, train

NEVER:
- Contact affected individuals before DPO + Deputy Minister approval
- Delete logs or audit rows during an incident
- Skip the hash-chain verification
- Close without MOGCSP sign-off
```
