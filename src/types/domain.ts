// ========== PROFILE DOMAIN ==========
export interface ProfileDomain {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarStoragePath: string | null;
  phone: string | null;
  emailVerified: boolean | null;
  kycStatus: string | null;
  kycVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========== TENANCY DOMAIN ==========
export interface TenancyDomain {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string | null;
  tenantId: string;
  tenantFirstName: string | null;
  tenantLastName: string | null;
  tenantEmail: string;
  status: string | null;
  startDate: string;
  plannedEndDate: string | null;
  endedAt: string | null;
  endReason: string | null;
  notes: string | null;
  createdAt: string;
}

// ========== INVITATION DOMAIN ==========
export interface InvitationDomain {
  id: string;
  propertyId: string;
  propertyTitle: string;
  email: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  token: string;
  invitedUserId: string | null;
  tenancyRequirementsId: string | null;
}

// ========== RENT AGREEMENT DOMAIN ==========
export interface RentAgreementDomain {
  id: string;
  propertyId: string;
  tenancyId: string;
  tenantId: string;
  managerId: string;
  rentAmountCents: number;
  paymentDay: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  mandateId: string | null;
  mandateStatus: string;
  tenantIban: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========== UPLOAD RESULT ==========
export interface UploadResult {
  storagePath: string;
  bucket: string;
}

// ========== SERVICE RESULT ==========
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}
