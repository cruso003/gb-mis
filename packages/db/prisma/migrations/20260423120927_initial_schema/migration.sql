-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'CASE_WORKER', 'DATA_ENTRY_CLERK', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrgUnitLevel" AS ENUM ('NATIONAL', 'COUNTY', 'DISTRICT', 'COMMUNITY', 'FACILITY');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "DisabilityStatus" AS ENUM ('VISUAL', 'HEARING', 'MOBILITY', 'COGNITIVE', 'SELF_CARE', 'COMMUNICATION', 'NONE');

-- CreateEnum
CREATE TYPE "BeneficiaryStatus" AS ENUM ('ENROLLED', 'ACTIVE', 'GRADUATED', 'WITHDRAWN', 'DECEASED');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('LWEP_COMPONENT_1', 'LWEP_COMPONENT_2', 'LWEP_COMPONENT_3', 'REALISE_XREF', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('DATA_COLLECTION', 'DHIS2_SHARING', 'PHOTO_USE', 'RESEARCH');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('PENDING', 'DISBURSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HouseholdRelationship" AS ENUM ('SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "VslaMemberRole" AS ENUM ('CHAIR', 'TREASURER', 'SECRETARY', 'MEMBER');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('SASA_AWARENESS', 'SASA_SUPPORT', 'SASA_ACTION', 'ASRH', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_SERVICE', 'REFERRED', 'CLOSED_SUCCESSFUL', 'CLOSED_LOST_CONTACT', 'CLOSED_WITHDRAWN');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('ROUTINE', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IntakeChannel" AS ENUM ('COMMUNITY', 'FACILITY', 'HOTLINE', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ViolenceType" AS ENUM ('PHYSICAL', 'SEXUAL', 'PSYCHOLOGICAL', 'ECONOMIC', 'NEGLECT', 'HARMFUL_PRACTICE');

-- CreateEnum
CREATE TYPE "PerpetratorRelationship" AS ENUM ('INTIMATE_PARTNER', 'FORMER_INTIMATE_PARTNER', 'FAMILY_MEMBER', 'COMMUNITY_MEMBER', 'STRANGER', 'AUTHORITY_FIGURE', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MEDICAL', 'PSYCHOSOCIAL', 'LEGAL', 'SHELTER', 'ECONOMIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceOutcome" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'DECLINED', 'FOLLOW_UP_NEEDED');

-- CreateEnum
CREATE TYPE "ReferralOutcome" AS ENUM ('COMPLETED', 'DECLINED', 'UNREACHABLE', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('CONSENT', 'MEDICAL_REPORT', 'POLICE_REPORT', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "IndicatorFramework" AS ENUM ('BPFA', 'SDG', 'CEDAW', 'MAPUTO', 'AU_WPS', 'ARREST', 'LWEP', 'NATIONAL');

-- CreateEnum
CREATE TYPE "Periodicity" AS ENUM ('ANNUAL', 'QUARTERLY', 'MONTHLY', 'BIENNIAL', 'EVERY_5Y', 'EVENT_DRIVEN');

-- CreateEnum
CREATE TYPE "Disaggregation" AS ENUM ('SEX', 'AGE', 'LOCATION', 'DISABILITY', 'WEALTH_QUINTILE');

-- CreateEnum
CREATE TYPE "IndicatorSource" AS ENUM ('COMPUTED_FROM_CASES', 'COMPUTED_FROM_BENEFICIARIES', 'IMPORTED_LISGIS', 'IMPORTED_MOH', 'MANUAL_ENTRY', 'DHIS2_PULL');

-- CreateEnum
CREATE TYPE "QualityFlag" AS ENUM ('VERIFIED', 'UNVERIFIED', 'ESTIMATE', 'PROVISIONAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'LOGIN', 'LOGIN_FAIL', 'LOGOUT', 'MFA_CHALLENGE', 'MFA_ENROLL', 'ROLE_GRANT', 'ROLE_REVOKE', 'CONFIG_CHANGE', 'KEY_ROTATE', 'SYNC_PUSH', 'SYNC_PULL', 'REPORT_GENERATE', 'DATA_SUBJECT_REQUEST', 'ERASURE_APPROVE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SYNCED', 'CONFLICT', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keycloakSubject" TEXT NOT NULL,
    "emailEncrypted" BYTEA,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "assignedById" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "user_org_unit_scopes" (
    "userId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_org_unit_scopes_pkey" PRIMARY KEY ("userId","orgUnitId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parentId" UUID,
    "level" "OrgUnitLevel" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "dhis2Id" TEXT,
    "lwepCovered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_unit_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "org_unit_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_unit_group_members" (
    "groupId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,

    CONSTRAINT "org_unit_group_members_pkey" PRIMARY KEY ("groupId","orgUnitId")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryCode" TEXT NOT NULL,
    "nationalIdEncrypted" BYTEA,
    "nationalIdSearchHash" BYTEA,
    "fullNameEncrypted" BYTEA NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "genderIdentityEncrypted" BYTEA,
    "disabilityStatuses" "DisabilityStatus"[],
    "orgUnitId" UUID NOT NULL,
    "householdId" UUID,
    "enrollmentSource" "EnrollmentSource" NOT NULL,
    "realiseHouseholdRef" TEXT,
    "consentRecordId" UUID NOT NULL,
    "status" "BeneficiaryStatus" NOT NULL DEFAULT 'ENROLLED',
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "householdCode" TEXT NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "headOfHouseholdId" UUID,
    "memberCount" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "householdId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "relationship" "HouseholdRelationship" NOT NULL,
    "primaryResidence" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("householdId","beneficiaryId")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "scopes" "ConsentScope"[],
    "grantedAt" TIMESTAMPTZ NOT NULL,
    "expiresAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,
    "evidenceObjectKey" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livelihood_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "grantCycle" TEXT NOT NULL,
    "amountLrd" DECIMAL(18,2) NOT NULL,
    "amountUsd" DECIMAL(18,2) NOT NULL,
    "disbursedAt" TIMESTAMPTZ NOT NULL,
    "partnerFintechTxnRef" TEXT,
    "status" "GrantStatus" NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "livelihood_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vsla_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "formedAt" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "vsla_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vsla_memberships" (
    "vslaGroupId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "role" "VslaMemberRole" NOT NULL,
    "joinedAt" DATE NOT NULL,
    "leftAt" DATE,

    CONSTRAINT "vsla_memberships_pkey" PRIMARY KEY ("vslaGroupId","beneficiaryId")
);

-- CreateTable
CREATE TABLE "community_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "SessionType" NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "facilitatorId" UUID NOT NULL,
    "heldAt" TIMESTAMPTZ NOT NULL,
    "topic" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "beneficiaryId" UUID,
    "sexAgeBracket" TEXT,
    "attendedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "session_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbv_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseNumber" TEXT NOT NULL,
    "survivorId" UUID,
    "anonymisedSurvivor" JSONB,
    "orgUnitId" UUID NOT NULL,
    "intakeChannel" "IntakeChannel" NOT NULL,
    "intakeDate" DATE NOT NULL,
    "intakeByUserId" UUID NOT NULL,
    "firstIncidentDate" DATE,
    "mostRecentIncidentDate" DATE,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CasePriority" NOT NULL DEFAULT 'ROUTINE',
    "assignedCaseWorkerId" UUID,
    "assignedSupervisorId" UUID,
    "supervisorReviewedAt" TIMESTAMPTZ,
    "closedAt" TIMESTAMPTZ,
    "clientEventId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "gbv_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ,
    "occurrenceOrgUnitId" UUID,
    "types" "ViolenceType"[],
    "perpetratorRelationship" "PerpetratorRelationship",
    "perpetratorDemographics" JSONB,
    "weaponUsed" BOOLEAN NOT NULL DEFAULT false,
    "notesEncrypted" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services_provided" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "type" "ServiceType" NOT NULL,
    "providerOrgUnitId" UUID NOT NULL,
    "providedAt" TIMESTAMPTZ NOT NULL,
    "outcome" "ServiceOutcome" NOT NULL,
    "notesEncrypted" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_provided_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "toOrgUnitId" UUID NOT NULL,
    "toService" "ServiceType" NOT NULL,
    "referredAt" TIMESTAMPTZ NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "outcome" "ReferralOutcome",
    "notesEncrypted" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "uploadedAt" TIMESTAMPTZ NOT NULL,
    "sha256" BYTEA NOT NULL,

    CONSTRAINT "case_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "framework" "IndicatorFramework" NOT NULL,
    "area" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "periodicity" "Periodicity" NOT NULL,
    "disaggregations" "Disaggregation"[],
    "custodianAgency" TEXT NOT NULL,
    "leadMinistry" TEXT NOT NULL,
    "formula" TEXT,
    "dhis2DataElementId" TEXT,
    "dhis2CategoryComboId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "indicatorId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "disaggregations" JSONB NOT NULL DEFAULT '{}',
    "source" "IndicatorSource" NOT NULL,
    "sourceReference" TEXT,
    "qualityFlag" "QualityFlag" NOT NULL DEFAULT 'UNVERIFIED',
    "enteredById" UUID,
    "importedAt" TIMESTAMPTZ,
    "lastComputedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "indicator_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "indicatorId" UUID NOT NULL,
    "orgUnitId" UUID,
    "targetYear" INTEGER NOT NULL,
    "targetValue" DECIMAL(18,6) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "indicator_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secondary_datasets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "sourceAgency" TEXT NOT NULL,
    "collectionStart" DATE NOT NULL,
    "collectionEnd" DATE NOT NULL,
    "ingestedAt" TIMESTAMPTZ NOT NULL,
    "methodology" TEXT NOT NULL,
    "documentationObjectKey" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "secondary_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secondary_data_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "datasetId" UUID NOT NULL,
    "indicatorId" UUID,
    "orgUnitId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "variable" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "disaggregations" JSONB NOT NULL DEFAULT '{}',
    "qualityFlag" "QualityFlag" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secondary_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" UUID,
    "actorRole" "Role",
    "actorIp" TEXT,
    "actorDeviceFingerprint" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "requestId" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "additionalContext" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" UUID NOT NULL,
    "resourcePath" TEXT NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "responseStatus" SMALLINT NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientEventId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "conflictData" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sync_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloakSubject_key" ON "users"("keycloakSubject");

-- CreateIndex
CREATE UNIQUE INDEX "org_units_code_key" ON "org_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_beneficiaryCode_key" ON "beneficiaries"("beneficiaryCode");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_consentRecordId_key" ON "beneficiaries"("consentRecordId");

-- CreateIndex
CREATE INDEX "beneficiaries_nationalIdSearchHash_idx" ON "beneficiaries"("nationalIdSearchHash");

-- CreateIndex
CREATE INDEX "beneficiaries_orgUnitId_idx" ON "beneficiaries"("orgUnitId");

-- CreateIndex
CREATE INDEX "beneficiaries_status_idx" ON "beneficiaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "households_householdCode_key" ON "households"("householdCode");

-- CreateIndex
CREATE UNIQUE INDEX "session_attendances_sessionId_attendedAt_beneficiaryId_key" ON "session_attendances"("sessionId", "attendedAt", "beneficiaryId");

-- CreateIndex
CREATE UNIQUE INDEX "gbv_cases_caseNumber_key" ON "gbv_cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "gbv_cases_clientEventId_key" ON "gbv_cases"("clientEventId");

-- CreateIndex
CREATE INDEX "gbv_cases_orgUnitId_idx" ON "gbv_cases"("orgUnitId");

-- CreateIndex
CREATE INDEX "gbv_cases_status_idx" ON "gbv_cases"("status");

-- CreateIndex
CREATE INDEX "gbv_cases_survivorId_idx" ON "gbv_cases"("survivorId");

-- CreateIndex
CREATE UNIQUE INDEX "indicators_code_key" ON "indicators"("code");

-- CreateIndex
CREATE INDEX "indicator_values_indicatorId_orgUnitId_idx" ON "indicator_values"("indicatorId", "orgUnitId");

-- CreateIndex
CREATE INDEX "indicator_values_qualityFlag_idx" ON "indicator_values"("qualityFlag");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_values_indicatorId_orgUnitId_periodStart_periodEn_key" ON "indicator_values"("indicatorId", "orgUnitId", "periodStart", "periodEnd", "disaggregations");

-- CreateIndex
CREATE INDEX "audit_events_occurredAt_idx" ON "audit_events"("occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_idx" ON "audit_events"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "access_logs_occurredAt_idx" ON "access_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "access_logs_actorUserId_idx" ON "access_logs"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_records_clientEventId_key" ON "sync_records"("clientEventId");

-- CreateIndex
CREATE INDEX "sync_records_status_idx" ON "sync_records"("status");

-- CreateIndex
CREATE INDEX "sync_records_userId_idx" ON "sync_records"("userId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_unit_scopes" ADD CONSTRAINT "user_org_unit_scopes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_unit_scopes" ADD CONSTRAINT "user_org_unit_scopes_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_unit_group_members" ADD CONSTRAINT "org_unit_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "org_unit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_unit_group_members" ADD CONSTRAINT "org_unit_group_members_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livelihood_grants" ADD CONSTRAINT "livelihood_grants_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vsla_groups" ADD CONSTRAINT "vsla_groups_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vsla_memberships" ADD CONSTRAINT "vsla_memberships_vslaGroupId_fkey" FOREIGN KEY ("vslaGroupId") REFERENCES "vsla_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vsla_memberships" ADD CONSTRAINT "vsla_memberships_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_sessions" ADD CONSTRAINT "community_sessions_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "community_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbv_cases" ADD CONSTRAINT "gbv_cases_survivorId_fkey" FOREIGN KEY ("survivorId") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbv_cases" ADD CONSTRAINT "gbv_cases_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbv_cases" ADD CONSTRAINT "gbv_cases_intakeByUserId_fkey" FOREIGN KEY ("intakeByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbv_cases" ADD CONSTRAINT "gbv_cases_assignedCaseWorkerId_fkey" FOREIGN KEY ("assignedCaseWorkerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbv_cases" ADD CONSTRAINT "gbv_cases_assignedSupervisorId_fkey" FOREIGN KEY ("assignedSupervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "gbv_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services_provided" ADD CONSTRAINT "services_provided_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "gbv_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "gbv_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "gbv_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_targets" ADD CONSTRAINT "indicator_targets_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_targets" ADD CONSTRAINT "indicator_targets_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_data_points" ADD CONSTRAINT "secondary_data_points_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "secondary_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_data_points" ADD CONSTRAINT "secondary_data_points_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_data_points" ADD CONSTRAINT "secondary_data_points_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
