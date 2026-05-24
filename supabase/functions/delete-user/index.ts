import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from request
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    // Create regular client to verify caller
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      console.error('Authentication error:', authError);
      throw new Error('Unauthorized: Invalid token');
    }

    console.log(`Delete user request from: ${caller.id}`);

    // Check if caller is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin'
    });
    
    if (roleError) {
      console.error('Role check error:', roleError);
      throw new Error('Forbidden: Unable to verify admin status');
    }
    
    if (!isAdmin) {
      console.warn(`Non-admin user ${caller.id} attempted to delete a user`);
      throw new Error('Forbidden: Admin access required');
    }

    // Get userId to delete from request body
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('Bad Request: userId is required');
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      console.warn(`Admin ${caller.id} attempted to delete their own account`);
      throw new Error('Bad Request: Cannot delete your own account');
    }

    console.log(`Admin ${caller.id} is deleting user ${userId}`);

    // Create admin client for deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Step 1: Clear invited_user_id references in invitations
    console.log(`Clearing invitations references for user ${userId}`);
    const { error: invitationsError } = await supabaseAdmin
      .from('invitations')
      .update({ invited_user_id: null })
      .eq('invited_user_id', userId);
    
    if (invitationsError) {
      console.error('Error clearing invitations:', invitationsError);
      // Continue anyway - FK constraint update should handle this
    }

    // Step 2: Delete property_tenants records
    console.log(`Deleting property_tenants for user ${userId}`);
    const { error: tenantsError } = await supabaseAdmin
      .from('property_tenants')
      .delete()
      .eq('tenant_id', userId);
    
    if (tenantsError) {
      console.error('Error deleting property_tenants:', tenantsError);
    }

    // Step 3: Delete user subscriptions
    console.log(`Deleting user_subscriptions for user ${userId}`);
    const { error: subscriptionsError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);
    
    if (subscriptionsError) {
      console.error('Error deleting user_subscriptions:', subscriptionsError);
    }

    // Step 4: Delete subscription usage
    console.log(`Deleting subscription_usage for user ${userId}`);
    const { error: usageError } = await supabaseAdmin
      .from('subscription_usage')
      .delete()
      .eq('user_id', userId);
    
    if (usageError) {
      console.error('Error deleting subscription_usage:', usageError);
    }

    // Step 5: Delete analytics records (GDPR compliance)
    console.log(`Deleting analytics_navigation_paths for user ${userId}`);
    const { error: navError } = await supabaseAdmin
      .from('analytics_navigation_paths')
      .delete()
      .eq('user_id', userId);
    
    if (navError) {
      console.error('Error deleting analytics_navigation_paths:', navError);
    }

    console.log(`Deleting analytics_events for user ${userId}`);
    const { error: eventsError } = await supabaseAdmin
      .from('analytics_events')
      .delete()
      .eq('user_id', userId);
    
    if (eventsError) {
      console.error('Error deleting analytics_events:', eventsError);
    }

    console.log(`Deleting analytics_page_views for user ${userId}`);
    const { error: pageViewsError } = await supabaseAdmin
      .from('analytics_page_views')
      .delete()
      .eq('user_id', userId);
    
    if (pageViewsError) {
      console.error('Error deleting analytics_page_views:', pageViewsError);
    }

    console.log(`Deleting analytics_sessions for user ${userId}`);
    const { error: sessionsError } = await supabaseAdmin
      .from('analytics_sessions')
      .delete()
      .eq('user_id', userId);
    
    if (sessionsError) {
      console.error('Error deleting analytics_sessions:', sessionsError);
    }

    // Step 6: Delete the user from auth.users (will cascade to profiles and user_roles)
    console.log(`Deleting auth user ${userId}`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Delete user error:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log(`✅ User ${userId} deleted successfully by admin ${caller.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error in delete-user function:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    
    let status = 500;
    if (errMsg.includes('Unauthorized')) {
      status = 401;
    } else if (errMsg.includes('Forbidden')) {
      status = 403;
    } else if (errMsg.includes('Bad Request')) {
      status = 400;
    }

    return new Response(
      JSON.stringify({ error: errMsg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status 
      }
    );
  }
});
