import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('DocuSeal webhook received:', payload);

    const { 
      event_type,
      data: {
        slug,
        status,
        email,
        role,
        completed_at,
        documents,
      }
    } = payload;

    // Only process completion events
    if (event_type !== 'submission.completed' && event_type !== 'form.completed') {
      console.log('Ignoring non-completion event:', event_type);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the signature record
    const { data: signature, error: findError } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('docuseal_submission_slug', slug)
      .single();

    if (findError) {
      console.error('Signature not found for slug:', slug);
      throw new Error('Signature record not found');
    }

    console.log('Found signature:', signature.id);

    // Update signature based on role
    const updateData: any = {};
    
    if (role === 'Manager') {
      updateData.manager_signed_at = completed_at;
      updateData.manager_signature_method = 'docuseal';
      updateData.docuseal_manager_document_url = documents?.[0]?.url || null;
    } else if (role === 'Tenant') {
      updateData.tenant_signed_at = completed_at;
      updateData.tenant_signature_method = 'docuseal';
      updateData.docuseal_tenant_document_url = documents?.[0]?.url || null;
    }

    // Check if both parties have signed
    const bothSigned = (signature.manager_signed_at || role === 'Manager') && 
                       (signature.tenant_signed_at || role === 'Tenant');

    if (bothSigned) {
      updateData.workflow_status = 'completed';
      updateData.completed_at = new Date().toISOString();
      updateData.signed_document_url = documents?.[0]?.url || null;
    }

    const { error: updateError } = await supabase
      .from('contract_signatures')
      .update(updateData)
      .eq('id', signature.id);

    if (updateError) throw updateError;

    console.log('Signature updated successfully:', signature.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${role} signature recorded`,
        completed: bothSigned,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing DocuSeal webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
