import { supabase } from '@/integrations/supabase/client';
import type { TicketDomain, TicketCommentDomain, TicketAttachmentDomain } from '@/types/domain';
import type { TicketStatus, TicketPriority } from '@/types/enums';

interface TicketFilters {
  propertyId?: string;
  status?: TicketStatus;
  type?: string;
  hasSourceTemplate?: boolean;
  page?: number;
  pageSize?: number;
}

interface TicketInput {
  property_id: string;
  title: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  created_by?: string;
  assigned_to?: string;
  source_template_id?: string;
}

interface TicketUpdates {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assigned_to?: string;
  resolved_at?: string;
}

interface TicketAttachmentInput {
  ticket_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

interface TicketActivityInput {
  ticket_id: string;
  user_id: string;
  activity_type: string;
  description?: string;
}

// ========== TICKETS ==========

export async function getTickets(filters: TicketFilters = {}): Promise<{ tickets: TicketDomain[]; totalCount: number; totalPages: number }> {
  const { propertyId, status, type, hasSourceTemplate, page = 1, pageSize = 10 } = filters;

  let query = supabase
    .from('tickets')
    .select(`
      *,
      property:properties(title, address),
      created_by_profile:profiles!tickets_created_by_fkey(first_name, last_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (propertyId) query = query.eq('property_id', propertyId);
  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  if (hasSourceTemplate === true) {
    query = query.not('source_template_id', 'is', null);
  } else if (hasSourceTemplate === false) {
    query = query.is('source_template_id', null);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { tickets: (data || []) as TicketDomain[], totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) };
}

export async function getTicket(id: string): Promise<TicketDomain | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      property:properties(title, address),
      created_by_profile:profiles!tickets_created_by_fkey(first_name, last_name, email),
      assigned_to_profile:profiles!tickets_assigned_to_fkey(first_name, last_name, email)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as TicketDomain | null;
}

export async function getTicketDetail(id: string): Promise<TicketDomain | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      properties (id, title, address, manager_id),
      profiles!tickets_created_by_fkey (id, first_name, last_name, email),
      ticket_templates (title, description)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as TicketDomain | null;
}

export async function getAllTickets(): Promise<TicketDomain[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      properties (id, title),
      profiles!tickets_created_by_fkey (id, first_name, last_name, email)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as TicketDomain[];
}

export async function getPropertyTickets(propertyId: string): Promise<TicketDomain[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      properties (id, title),
      profiles!tickets_created_by_fkey (id, first_name, last_name, email)
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as TicketDomain[];
}

export async function getAdminTickets(): Promise<TicketDomain[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      property:properties (title),
      creator:created_by (first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as TicketDomain[];
}

export async function createTicket(ticket: TicketInput): Promise<TicketDomain> {
  const { data, error } = await supabase
    .from('tickets')
    .insert(ticket)
    .select()
    .single();
  if (error) throw error;
  return data as TicketDomain;
}

export async function updateTicket(id: string, updates: TicketUpdates): Promise<TicketDomain> {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as TicketDomain;
}

export async function updateTicketSimple(id: string, updates: TicketUpdates): Promise<void> {
  const { error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ========== COMMENTS ==========

export async function getTicketComments(ticketId: string): Promise<TicketCommentDomain[]> {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select(`*, profiles (first_name, last_name, email)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TicketCommentDomain[];
}

export async function addTicketComment(params: {
  ticketId: string;
  userId: string;
  comment: string;
  isInternal: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: params.ticketId,
      user_id: params.userId,
      comment: params.comment,
      is_internal: params.isInternal,
    });
  if (error) throw error;
}

// ========== ATTACHMENTS ==========

export async function getTicketAttachments(ticketId: string): Promise<TicketAttachmentDomain[]> {
  const { data, error } = await supabase
    .from('ticket_attachments')
    .select(`*, profiles (first_name, last_name)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as TicketAttachmentDomain[];
}

export async function addTicketAttachment(attachment: TicketAttachmentInput): Promise<void> {
  const { error } = await supabase
    .from('ticket_attachments')
    .insert(attachment);
  if (error) throw error;
}

export async function deleteTicketAttachment(id: string): Promise<void> {
  const { error } = await supabase
    .from('ticket_attachments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ========== TICKET TEMPLATES ==========

export async function deleteTicketTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('ticket_templates').delete().eq('id', id);
  if (error) throw error;
}

// ========== ACTIVITIES ==========

export async function getTicketActivities(ticketId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('ticket_activities')
    .select(`*, profiles (first_name, last_name)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addTicketActivity(activity: TicketActivityInput): Promise<void> {
  const { error } = await supabase
    .from('ticket_activities')
    .insert(activity);
  if (error) throw error;
}

export const ticketService = {
  getTickets,
  getTicket,
  getTicketDetail,
  getAllTickets,
  getPropertyTickets,
  getAdminTickets,
  createTicket,
  updateTicket,
  updateTicketSimple,
  getTicketComments,
  addTicketComment,
  getTicketAttachments,
  addTicketAttachment,
  deleteTicketAttachment,
  getTicketActivities,
  addTicketActivity,
  deleteTicketTemplate,
};
