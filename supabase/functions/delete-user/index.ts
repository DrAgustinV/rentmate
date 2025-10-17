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

    // Delete the user from auth.users (will cascade to profiles and user_roles)
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

  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    
    let status = 500;
    if (error.message.includes('Unauthorized')) {
      status = 401;
    } else if (error.message.includes('Forbidden')) {
      status = 403;
    } else if (error.message.includes('Bad Request')) {
      status = 400;
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status 
      }
    );
  }
});
