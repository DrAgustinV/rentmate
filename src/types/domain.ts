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
  status: string;
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
  status: string;
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
  type: string;
  amountCents: number;
  currency: string;
  status: string;
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
  status: string;
  priority: string;
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

