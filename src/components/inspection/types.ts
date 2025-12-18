export type InspectionType = 'move_in' | 'move_out';
export type InspectionStatus = 'draft' | 'in_progress' | 'pending_signatures' | 'completed';
export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface Inspection {
  id: string;
  tenancy_id: string;
  property_id: string;
  inspection_type: InspectionType;
  status: InspectionStatus;
  template_document_id: string | null;
  inspection_date: string;
  notes: string | null;
  overall_condition: string | null;
  manager_signed_at: string | null;
  manager_signature_data: any;
  manager_id: string | null;
  tenant_signed_at: string | null;
  tenant_signature_data: any;
  tenant_id: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  completed_at: string | null;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  room_name: string;
  room_order: number;
  condition: ConditionRating | null;
  notes: string | null;
  photos: string[];
  videos: string[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_ROOMS = [
  { name: 'Living Room', order: 0 },
  { name: 'Kitchen', order: 1 },
  { name: 'Bathroom', order: 2 },
  { name: 'Bedroom 1', order: 3 },
  { name: 'Bedroom 2', order: 4 },
  { name: 'Hallway', order: 5 },
  { name: 'Balcony/Terrace', order: 6 },
  { name: 'Storage', order: 7 },
];

export const CONDITION_RATINGS: { value: ConditionRating; label: string; color: string }[] = [
  { value: 'excellent', label: 'Excellent', color: 'bg-green-500' },
  { value: 'good', label: 'Good', color: 'bg-emerald-400' },
  { value: 'fair', label: 'Fair', color: 'bg-yellow-500' },
  { value: 'poor', label: 'Poor', color: 'bg-orange-500' },
  { value: 'damaged', label: 'Damaged', color: 'bg-red-500' },
];
