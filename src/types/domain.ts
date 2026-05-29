// ========== STATUS ENUMS ==========
export type TenancyStatus = 'active' | 'ending_tenancy' | 'historic' | 'pending' | null;
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'declined' | 'property_inactive' | 'already_tenant' | 'cancelled';
export type MandateStatus = 'pending' | 'pending_signature' | 'active' | 'failed' | 'cancelled';
export type PropertyStatus = 'active' | 'inactive' | 'ending_tenancy';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed';
export type UtilityPaymentStatus = 'pending' | 'paid' | 'overdue';
export type UtilityType = 'electricity' | 'gas' | 'water' | 'internet' | 'heating' | 'trash' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type KYCStatus = 'not_started' | 'pending' | 'in_progress' | 'verified' | 'rejected' | 'expired';

// ========== PROFILE DOMAIN ==========
export interface ProfileDomain {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarStoragePath: string | null;
  phone: string | null;
  defaultRole: 'manager' | 'tenant' | null;
  emailVerified: boolean | null;
  kycStatus: KYCStatus | null;
  kycProvider: string | null;
  kycQrCodeUrl: string | null;
  kycExpiresAt: string | null;
  kycWalletDid: string | null;
  kycCredentialId: string | null;
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
  status: TenancyStatus;
  startDate: string;
  endDate: string | null;
  possessionDate: string | null;
  vacateDate: string | null;
  graceDays: number;
  endedAt: string | null;
  endReason: string | null;
  notes: string | null;
  createdAt: string;
  managerTenantName?: string | null;
  managerTenantSurname?: string | null;
  managerTenantPhone?: string | null;
}

// ========== INVITATION DOMAIN ==========
export interface InvitationDomain {
  id: string;
  propertyId: string;
  propertyTitle: string;
  email: string;
  status: InvitationStatus;
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
  mandateStatus: MandateStatus;
  tenantIban: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========== PROPERTY DOMAIN ==========
export interface PropertyDomain {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  description: string | null;
  status: PropertyStatus;
  images: string[] | null;
  managerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deleteReason: string | null;
  modificationReason: string | null;
}

export interface PropertyBasicInfo {
  title: string;
  address: string | null;
}

// ========== PAYMENT DOMAIN ==========
export interface PaymentDomain {
  id: string;
  propertyId: string;
  tenancyId: string;
  tenantId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paymentDate: string;
  dueDate: string;
  description: string | null;
  proofPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UtilityPaymentDomain {
  id: string;
  propertyId: string;
  type: UtilityType;
  amountCents: number;
  currency: string;
  status: UtilityPaymentStatus;
  paymentDate: string;
  dueDate: string;
  provider: string;
  proofPath: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========== TICKET DOMAIN ==========
export interface TicketDomain {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  createdBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface TicketCommentDomain {
  id: string;
  ticketId: string;
  userId: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketAttachmentDomain {
  id: string;
  ticketId: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// ========== UPLOAD RESULT ==========
export interface UploadResult {
  storagePath: string;
  bucket: string;
}