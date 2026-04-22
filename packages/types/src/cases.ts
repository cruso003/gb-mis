export const CaseStatus = {
  OPEN: 'OPEN',
  IN_SERVICE: 'IN_SERVICE',
  REFERRED: 'REFERRED',
  CLOSED_SUCCESSFUL: 'CLOSED_SUCCESSFUL',
  CLOSED_LOST_CONTACT: 'CLOSED_LOST_CONTACT',
  CLOSED_WITHDRAWN: 'CLOSED_WITHDRAWN',
} as const;

export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const CasePriority = {
  ROUTINE: 'ROUTINE',
  URGENT: 'URGENT',
  CRITICAL: 'CRITICAL',
} as const;

export type CasePriority = (typeof CasePriority)[keyof typeof CasePriority];

export const IntakeChannel = {
  COMMUNITY: 'COMMUNITY',
  FACILITY: 'FACILITY',
  HOTLINE: 'HOTLINE',
  REFERRAL: 'REFERRAL',
  OTHER: 'OTHER',
} as const;

export type IntakeChannel = (typeof IntakeChannel)[keyof typeof IntakeChannel];

export const ViolenceType = {
  PHYSICAL: 'PHYSICAL',
  SEXUAL: 'SEXUAL',
  PSYCHOLOGICAL: 'PSYCHOLOGICAL',
  ECONOMIC: 'ECONOMIC',
  NEGLECT: 'NEGLECT',
  HARMFUL_PRACTICE: 'HARMFUL_PRACTICE',
} as const;

export type ViolenceType = (typeof ViolenceType)[keyof typeof ViolenceType];

export const PerpetratorRelationship = {
  INTIMATE_PARTNER: 'INTIMATE_PARTNER',
  FORMER_INTIMATE_PARTNER: 'FORMER_INTIMATE_PARTNER',
  FAMILY_MEMBER: 'FAMILY_MEMBER',
  COMMUNITY_MEMBER: 'COMMUNITY_MEMBER',
  STRANGER: 'STRANGER',
  AUTHORITY_FIGURE: 'AUTHORITY_FIGURE',
  OTHER: 'OTHER',
} as const;

export type PerpetratorRelationship =
  (typeof PerpetratorRelationship)[keyof typeof PerpetratorRelationship];

export const ServiceType = {
  MEDICAL: 'MEDICAL',
  PSYCHOSOCIAL: 'PSYCHOSOCIAL',
  LEGAL: 'LEGAL',
  SHELTER: 'SHELTER',
  ECONOMIC: 'ECONOMIC',
  OTHER: 'OTHER',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const ServiceOutcome = {
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  DECLINED: 'DECLINED',
  FOLLOW_UP_NEEDED: 'FOLLOW_UP_NEEDED',
} as const;

export type ServiceOutcome = (typeof ServiceOutcome)[keyof typeof ServiceOutcome];

export const ReferralOutcome = {
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
  UNREACHABLE: 'UNREACHABLE',
  IN_PROGRESS: 'IN_PROGRESS',
} as const;

export type ReferralOutcome = (typeof ReferralOutcome)[keyof typeof ReferralOutcome];

export const AttachmentKind = {
  CONSENT: 'CONSENT',
  MEDICAL_REPORT: 'MEDICAL_REPORT',
  POLICE_REPORT: 'POLICE_REPORT',
  PHOTO: 'PHOTO',
  OTHER: 'OTHER',
} as const;

export type AttachmentKind = (typeof AttachmentKind)[keyof typeof AttachmentKind];
