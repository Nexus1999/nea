import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"
import autoTable from "https://esm.sh/jspdf-autotable@3.5.28"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const abbreviateSchoolName = (name: string): string => {
  if (!name) return "";
  return name
    .replace(/\bISLAMIC SEMINARY\b/gi, "ISL SEM")
    .replace(/\bSECONDARY SCHOOL\b/gi, "SS")
    .replace(/\bHIGH SCHOOL\b/gi, "SS")
    .replace(/\bPRIMARY SCHOOL\b/gi, "PS")
    .replace(/\bTEACHERS'? TRAINING COLLEGE\b/gi, "TC")
    .replace(/\bTEACHERS'? COLLEGE\b/gi, "TC")
    .replace(/\bSEMINARY\b/gi, "SEM")
    .replace(/\s+/g, " ")
    .trim();
};

// Helper to fetch image and convert to base64
async function getBase64Image(url: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Failed to fetch image:", url, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { supervision_id, code, year, region, districts } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Logos (Assuming they are in the public folder of the app)
    // We use a placeholder or a known public URL. For this environment, we'll try to fetch from the project's assets.
    const baseUrl = req.headers.get('origin') || '';
    const coatLogo = await getBase64Image(`${baseUrl}/images/COAT.png`);
    const nectaLogo = await getBase64Image(`${baseUrl}/images/NECTA.jpg`);

    // 2. Fetch Assignments
    let query = supabase
      .from('supervisorassignments')
      .select('*')
      .eq('supervision_id', supervision_id);

    if (region && region !== "all") {
      query = query.eq('region', region);
    }

    if (districts && districts.length > 0) {
      query = query.in('district', districts);
    }

    const { data: rows, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No assignments found." }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 404 
      });
    }

    // 3. Custom Sorting
    let sortedRows = [...rows];
    if (['FTNA', 'CSEE', 'ACSEE'].includes(code)) {
      const pCenters: Record<string, any> = {};
      const sCenters: Record<string, any> = {};
      const reserves: any[] = [];

      rows.forEach(r => {
        if (r.center_no.startsWith('P')) pCenters[r.center_no.slice(1)] = r;
        else if (r.center_no.startsWith('S')) sCenters[r.center_no.slice(1)] = r;
        else reserves.push(r);
      });

      const ordered: any[] = [];
      const allKeys = [...new Set([...Object.keys(pCenters), ...Object.keys(sCenters)])].sort();

      allKeys.forEach(key => {
        if (sCenters[key]) ordered.push(sCenters[key]);
        if (pCenters[key]) ordered.push(pCenters[key]);
      });
      ordered.push(...reserves);
      sortedRows = ordered;
    } else {
      sortedRows.sort((a, b) => a.center_no.localeCompare(b.center_no));
    }

    // 4. Fetch Center Names
    const centersTableMap: Record<string, string> = {
      SFNA: "primarymastersummary", SSNA: "primarymastersummary", PSLE: "primarymastersummary",
      FTNA: "secondarymastersummaries", CSEE: "secondarymastersummaries", ACSEE: "secondarymastersummaries",
      DPEE: "dpeemastersummary", DPNE: "dpnemastersummary",
    };
    
    const centersTable = centersTableMap[code];
    const centerNumbers = [...new Set(sortedRows.map(r => r.center_no))];
    const centerCache: Record<string, string> = {};

    if (centersTable && centerNumbers.length > 0) {
      const { data: supData } = await supabase.from('supervisions').select('mid').eq('id', supervision_id).single();
      if (supData?.mid) {
        const { data: cRes } = await supabase
          .from(centersTable)
          .select('center_number, center_name')
          .eq('mid', supData.mid)
          .in('center_number', centerNumbers);
        
        cRes?.forEach(c => {
          centerCache[c.center_number] = `${c.center_number} - ${abbreviateSchoolName(c.center_name)}`.toUpperCase();
        });
      }
    }

    // 5. Initialize PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;

    // 6. Group by District
    const districtsMap: Record<string, any[]> = {};
    sortedRows.forEach(r => {
      const key = r.district.toUpperCase();
      if (!districtsMap[key]) districtsMap[key] = [];
      districtsMap[key].push(r);
    });

    // 7. Header Function
    const addHeader = (regionName: string, districtName: string) => {
      const logoSize = 60;
      if (coatLogo) doc.addImage(coatLogo, 'PNG', margin, 30, logoSize, logoSize);
      if (nectaLogo) doc.addImage(nectaLogo, 'JPEG', pageWidth - margin - logoSize, 30, logoSize, logoSize);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('JAMHURI YA MUUNGANO WA TANZANIA', pageWidth / 2, 55, { align: 'center' });

      doc.setFontSize(14);
      doc.text('WIZARA YA ELIMU, SAYANSI NA TEKNOLOJIA', pageWidth / 2, 75, { align: 'center' });
      doc.text('BARAZA LA MITIHANI LA TANZANIA', pageWidth / 2, 95, { align: 'center' });

      let headingText = "";
      switch (code) {
        case "SFNA": headingText = `ORODHA YA WASIMAMIZI WAKUU WA UPIMAJI WA KITAIFA WA DARASA LA NNE ${year}`; break;
        case "PSLE": headingText = `ORODHA YA WASIMAMIZI WAKUU WA MTIHANI WA KUHITIMU DARASA LA SABA ${year}`; break;
        case "FTNA": headingText = `ORODHA YA WASIMAMIZI WAKUU WA UPIMAJI WA KITAIFA WA KIDATO CHA PILI ${year}`; break;
        case "CSEE": headingText = `ORODHA YA WASIMAMIZI WAKUU WA MTIHANI WA KIDATO CHA NNE ${year}`; break;
        case "ACSEE": headingText = `ORODHA YA WASIMAMIZI WAKUU WA MTIHANI WA KIDATO CHA SITA ${year}`; break;
        default: headingText = `ORODHA YA WASIMAMIZI WAKUU ${year}`;
      }

      doc.text(headingText, pageWidth / 2, 123, { align: 'center' });
      doc.setFontSize(13);
      doc.text(`MKOA WA ${regionName || 'N/A'}`.toUpperCase(), pageWidth / 2, 143, { align: 'center' });

      let districtText = districtName;
      if (districtName.endsWith('CC')) districtText = `HALMASHAURI YA JIJI LA ${districtName.slice(0, -2)}`;
      else if (districtName.endsWith('MC')) districtText = `HALMASHAURI YA MANISPAA YA ${districtName.slice(0, -2)}`;
      else if (districtName.endsWith('TC')) districtText = `HALMASHAURI YA MJI ${districtName.slice(0, -2)}`;
      else if (districtName.endsWith('DC')) districtText = `HALMASHAURI YA WILAYA YA ${districtName.slice(0, -2)}`;
      else districtText = `HALMASHAURI YA WILAYA YA ${districtName}`;

      doc.text(districtText.toUpperCase(), pageWidth / 2, 163, { align: 'center' });
      doc.setLineWidth(1);
      doc.line(margin, 170, pageWidth - margin, 170);
    };

    // 8. Generate Pages
    let first = true;
    const districtKeys = Object.keys(districtsMap).sort();
    const rowsPerPage = 20;

    for (const districtName of districtKeys) {
      const districtRows = districtsMap[districtName];
      const regionName = districtRows[0].region;
      const totalPagesForDistrict = Math.ceil(districtRows.length / rowsPerPage);
      let currentPageForDistrict = 1;

      if (!first) doc.addPage();
      addHeader(regionName, districtName);

      const tableData = districtRows.map((r, idx) => [
        (idx + 1).toString(),
        (centerCache[r.center_no] || r.center_no).toUpperCase(),
        (r.supervisor_name || "N/A").toUpperCase(),
        (r.workstation || "N/A").toUpperCase(),
        (r.phone || "N/A").toUpperCase()
      ]);

      autoTable(doc, {
        head: [["SN", "KITUO CHA KUSIMAMIA", "JINA LA MSIMAMIZI", "KITUO CHA KAZI", "SIMU"]],
        body: tableData,
        startY: 180,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3, textTransform: 'uppercase' },
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 40, halign: 'center' },
          1: { cellWidth: 200 },
          2: { cellWidth: 200 },
          3: { cellWidth: 200 },
          4: { cellWidth: 100 }
        },
        didDrawPage: (data) => {
          // SIRI Watermark
          doc.setFontSize(16);
          doc.setTextColor(255, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.text("SIRI", pageWidth / 2, 25, { align: 'center' });
          doc.text("SIRI", pageWidth / 2, pageHeight - 20, { align: 'center' });

          // Pagination (Reset per district)
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.text(`Ukurasa ${currentPageForDistrict} / ${totalPagesForDistrict}`, pageWidth - margin, pageHeight - 30, { align: 'right' });
          currentPageForDistrict++;
        }
      });

      first = false;
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
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