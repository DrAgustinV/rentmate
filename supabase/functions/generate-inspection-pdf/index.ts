import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InspectionItem {
  room_name: string;
  condition: string | null;
  notes: string | null;
  photos: string[];
  videos: string[];
}

interface Inspection {
  id: string;
  inspection_type: 'move_in' | 'move_out';
  inspection_date: string;
  notes: string | null;
  overall_condition: string | null;
  manager_signed_at: string | null;
  tenant_signed_at: string | null;
  completed_at: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { inspectionId } = await req.json();

    if (!inspectionId) {
      throw new Error("Missing inspectionId");
    }

    // Fetch inspection details
    const { data: inspection, error: inspectionError } = await supabaseClient
      .from("tenancy_inspections")
      .select(`
        *,
        property:properties(title, address, city),
        tenant:profiles!tenancy_inspections_tenant_id_fkey(first_name, last_name, email),
        manager:profiles!tenancy_inspections_manager_id_fkey(first_name, last_name, email)
      `)
      .eq("id", inspectionId)
      .single();

    if (inspectionError) throw inspectionError;

    // Fetch inspection items
    const { data: items, error: itemsError } = await supabaseClient
      .from("inspection_items")
      .select("*")
      .eq("inspection_id", inspectionId)
      .order("room_order", { ascending: true });

    if (itemsError) throw itemsError;

    // Generate HTML for PDF
    const html = generateInspectionPdfHtml(inspection, items);

    // For now, we'll return the HTML content
    // In production, you would use a service like Puppeteer or a PDF generation API
    // to convert this HTML to PDF

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        message: "PDF generation prepared. Full PDF generation requires additional setup."
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error("Error generating inspection PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});

function generateInspectionPdfHtml(inspection: any, items: InspectionItem[]): string {
  const inspectionType = inspection.inspection_type === 'move_in' ? 'Move-In' : 'Move-Out';
  const propertyTitle = inspection.property?.title || 'Unknown Property';
  const propertyAddress = [
    inspection.property?.address,
    inspection.property?.city
  ].filter(Boolean).join(', ');

  const managerName = inspection.manager 
    ? `${inspection.manager.first_name || ''} ${inspection.manager.last_name || ''}`.trim() || inspection.manager.email
    : 'N/A';
  
  const tenantName = inspection.tenant
    ? `${inspection.tenant.first_name || ''} ${inspection.tenant.last_name || ''}`.trim() || inspection.tenant.email
    : 'N/A';

  const conditionColors: Record<string, string> = {
    excellent: '#22c55e',
    good: '#34d399',
    fair: '#eab308',
    poor: '#f97316',
    damaged: '#ef4444',
  };

  const roomsHtml = items.map(item => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px;">${item.room_name}</h3>
        ${item.condition ? `
          <span style="
            background-color: ${conditionColors[item.condition] || '#6b7280'};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          ">${item.condition.toUpperCase()}</span>
        ` : '<span style="color: #9ca3af;">Not inspected</span>'}
      </div>
      ${item.notes ? `<p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">${item.notes}</p>` : ''}
      ${item.photos.length > 0 ? `<p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">📷 ${item.photos.length} photo(s) attached</p>` : ''}
      ${item.videos.length > 0 ? `<p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af;">🎥 ${item.videos.length} video(s) attached</p>` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${inspectionType} Inspection Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #1f2937;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 24px;
          margin-bottom: 32px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          color: #111827;
        }
        .header p {
          margin: 8px 0 0;
          color: #6b7280;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        .info-box {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
        }
        .info-box h4 {
          margin: 0 0 8px;
          font-size: 12px;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .info-box p {
          margin: 0;
          font-size: 14px;
        }
        .section-title {
          font-size: 18px;
          margin: 32px 0 16px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .signature-box {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }
        .signature-box h4 {
          margin: 0 0 12px;
          font-size: 14px;
        }
        .signature-line {
          border-bottom: 1px solid #1f2937;
          height: 50px;
          margin-bottom: 8px;
        }
        .signature-date {
          font-size: 12px;
          color: #6b7280;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${inspectionType} Inspection Report</h1>
        <p>${propertyTitle}</p>
        <p>${propertyAddress}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h4>Inspection Date</h4>
          <p>${new Date(inspection.inspection_date).toLocaleDateString()}</p>
        </div>
        <div class="info-box">
          <h4>Status</h4>
          <p>${inspection.status.replace('_', ' ').toUpperCase()}</p>
        </div>
        <div class="info-box">
          <h4>Property Manager</h4>
          <p>${managerName}</p>
        </div>
        <div class="info-box">
          <h4>Tenant</h4>
          <p>${tenantName}</p>
        </div>
      </div>

      <h2 class="section-title">Room Conditions</h2>
      ${roomsHtml}

      ${inspection.notes ? `
        <h2 class="section-title">Overall Notes</h2>
        <p style="color: #4b5563;">${inspection.notes}</p>
      ` : ''}

      <div class="signature-section">
        <div class="signature-box">
          <h4>Property Manager Signature</h4>
          <div class="signature-line"></div>
          <p class="signature-date">${inspection.manager_signed_at 
            ? `Signed: ${new Date(inspection.manager_signed_at).toLocaleDateString()}`
            : 'Pending signature'}</p>
        </div>
        <div class="signature-box">
          <h4>Tenant Signature</h4>
          <div class="signature-line"></div>
          <p class="signature-date">${inspection.tenant_signed_at 
            ? `Signed: ${new Date(inspection.tenant_signed_at).toLocaleDateString()}`
            : 'Pending signature'}</p>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>This document is for record-keeping purposes.</p>
      </div>
    </body>
    </html>
  `;
}
