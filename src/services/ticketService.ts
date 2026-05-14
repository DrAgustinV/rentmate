import { supabase } from '@/integrations/supabase/client';

interface TicketFilters {
  propertyId?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'cancelled';
  type?: string;
  hasSourceTemplate?: boolean;
  page?: number;
  pageSize?: number;
}

// ========== TICKETS ==========

export async function getTickets(filters: TicketFilters = {}) {
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
  return { tickets: data || [], totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) };
}

export async function getTicket(id: string) {
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
  return data;
}

export async function getTicketDetail(id: string) {
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
  return data;
}

export async function getAllTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      properties (id, title),
      profiles!tickets_created_by_fkey (id, first_name, last_name, email)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPropertyTickets(propertyId: string) {
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
  return data || [];
}

export async function getAdminTickets() {
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
  return data || [];
}

export async function createTicket(ticket: any) {
  const { data, error } = await supabase
    .from('tickets')
    .insert(ticket)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicket(id: string, updates: any) {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicketSimple(id: string, updates: any) {
  const { error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ========== COMMENTS ==========

export async function getTicketComments(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select(`*, profiles (first_name, last_name, email)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addTicketComment(params: {
  ticketId: string;
  userId: string;
  comment: string;
  isInternal: boolean;
}) {
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

export async function getTicketAttachments(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_attachments')
    .select(`*, profiles (first_name, last_name)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addTicketAttachment(attachment: any) {
  const { error } = await supabase
    .from('ticket_attachments')
    .insert(attachment);
  if (error) throw error;
}

export async function deleteTicketAttachment(id: string) {
  const { error } = await supabase
    .from('ticket_attachments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ========== TICKET TEMPLATES ==========

export async function deleteTicketTemplate(id: string) {
  const { error } = await supabase.from('ticket_templates').delete().eq('id', id);
  if (error) throw error;
}

// ========== ACTIVITIES ==========

export async function getTicketActivities(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_activities')
    .select(`*, profiles (first_name, last_name)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addTicketActivity(activity: any) {
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
