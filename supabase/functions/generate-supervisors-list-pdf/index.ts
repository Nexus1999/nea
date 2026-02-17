import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"
import autoTable from "https://esm.sh/jspdf-autotable@3.5.28"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { supervision_id, code, year, region, districts } = await req.json()
    
    console.log(`Generating PDF for Supervision: ${supervision_id}, Region: ${region}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing environment variables for Supabase connection.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch assignments
    let query = supabase
      .from('supervisorassignments')
      .select('*')
      .eq('supervision_id', supervision_id)
      .eq('region', region)
      .order('district', { ascending: true })
      .order('center_no', { ascending: true });

    if (districts && districts.length > 0) {
      query = query.in('district', districts);
    }

    const { data: assignments, error: fetchError } = await query;
    
    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      throw fetchError;
    }

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ error: "No supervisor assignments found for the selected criteria." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Found ${assignments.length} assignments. Starting PDF generation...`);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Text
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("THE UNITED REPUBLIC OF TANZANIA", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.text("PRESIDENT'S OFFICE", pageWidth / 2, 22, { align: "center" });
    doc.text("REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT", pageWidth / 2, 27, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`${region.toUpperCase()} REGION`, pageWidth / 2, 35, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(15, 38, pageWidth - 15, 38);

    doc.setFontSize(12);
    doc.text(`LIST OF SUPERVISORS FOR ${code} ${year}`, pageWidth / 2, 48, { align: "center" });

    // Table Data Preparation
    const tableData = assignments.map((a, index) => [
      index + 1,
      a.district,
      a.center_no,
      a.supervisor_name,
      a.workstation,
      a.phone
    ]);

    // Generate Table
    autoTable(doc, {
      startY: 55,
      head: [['S/N', 'District', 'Center', 'Supervisor Name', 'Workstation', 'Phone']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 9, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 50 },
        5: { cellWidth: 30 }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { top: 55 }
    });

    // Footer / Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    const pageHeight = doc.internal.pageSize.getHeight();

    if (finalY < pageHeight - 40) {
      doc.setFontSize(10);
      doc.text("..........................................", 15, finalY);
      doc.text("REGIONAL EDUCATION OFFICER", 15, finalY + 7);
      
      doc.text("..........................................", pageWidth - 75, finalY);
      doc.text("DATE", pageWidth - 75, finalY + 7);
    }

    // Convert to base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    console.log("PDF generation complete.");

    return new Response(JSON.stringify({ pdfBase64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})