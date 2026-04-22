export const Sex = {
  FEMALE: 'FEMALE',
  MALE: 'MALE',
  INTERSEX: 'INTERSEX',
  UNDISCLOSED: 'UNDISCLOSED',
} as const;

export type Sex = (typeof Sex)[keyof typeof Sex];

export const DisabilityStatus = {
  VISUAL: 'VISUAL',
  HEARING: 'HEARING',
  MOBILITY: 'MOBILITY',
  COGNITIVE: 'COGNITIVE',
  SELF_CARE: 'SELF_CARE',
  COMMUNICATION: 'COMMUNICATION',
  NONE: 'NONE',
} as const;

export type DisabilityStatus = (typeof DisabilityStatus)[keyof typeof DisabilityStatus];

export const BeneficiaryStatus = {
  ENROLLED: 'ENROLLED',
  ACTIVE: 'ACTIVE',
  GRADUATED: 'GRADUATED',
  WITHDRAWN: 'WITHDRAWN',
  DECEASED: 'DECEASED',
} as const;

export type BeneficiaryStatus = (typeof BeneficiaryStatus)[keyof typeof BeneficiaryStatus];

export const EnrollmentSource = {
  LWEP_COMPONENT_1: 'LWEP_COMPONENT_1',
  LWEP_COMPONENT_2: 'LWEP_COMPONENT_2',
  LWEP_COMPONENT_3: 'LWEP_COMPONENT_3',
  REALISE_XREF: 'REALISE_XREF',
  OTHER: 'OTHER',
} as const;

export type EnrollmentSource = (typeof EnrollmentSource)[keyof typeof EnrollmentSource];

export const ConsentScope = {
  DATA_COLLECTION: 'DATA_COLLECTION',
  DHIS2_SHARING: 'DHIS2_SHARING',
  PHOTO_USE: 'PHOTO_USE',
  RESEARCH: 'RESEARCH',
} as const;

export type ConsentScope = (typeof ConsentScope)[keyof typeof ConsentScope];

export const GrantStatus = {
  PENDING: 'PENDING',
  DISBURSED: 'DISBURSED',
  CANCELLED: 'CANCELLED',
} as const;

export type GrantStatus = (typeof GrantStatus)[keyof typeof GrantStatus];

export const HouseholdRelationship = {
  SELF: 'SELF',
  SPOUSE: 'SPOUSE',
  CHILD: 'CHILD',
  PARENT: 'PARENT',
  SIBLING: 'SIBLING',
  OTHER: 'OTHER',
} as const;

export type HouseholdRelationship =
  (typeof HouseholdRelationship)[keyof typeof HouseholdRelationship];

export const VslaMemberRole = {
  CHAIR: 'CHAIR',
  TREASURER: 'TREASURER',
  SECRETARY: 'SECRETARY',
  MEMBER: 'MEMBER',
} as const;

export type VslaMemberRole = (typeof VslaMemberRole)[keyof typeof VslaMemberRole];

export const SessionType = {
  SASA_AWARENESS: 'SASA_AWARENESS',
  SASA_SUPPORT: 'SASA_SUPPORT',
  SASA_ACTION: 'SASA_ACTION',
  ASRH: 'ASRH',
  OTHER: 'OTHER',
} as const;

export type SessionType = (typeof SessionType)[keyof typeof SessionType];
