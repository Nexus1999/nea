import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.5.28";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UALIMU_CODES = ["GATCE", "DSEE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"];

// Robust image loader from Supabase Storage "assets" bucket
async function fetchImageFromAssets(
  supabase: ReturnType<typeof createClient>,
  pathCandidates: string[]
): Promise<{ base64: string; format: 'PNG' | 'JPEG' } | null> {
  for (const path of pathCandidates) {
    const lower = path.toLowerCase();
    const expectedFormat = lower.endsWith('.png') ? 'PNG' : 'JPEG';

    const { data, error } = await supabase.storage.from("assets").download(path);
    if (!error && data) {
      const arrayBuffer = await data.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return { base64, format: expectedFormat };
    }
    if (error) console.error(`Download failed for ${path}: ${error.message}`);

    const { data: signedData } = await supabase.storage.from("assets").createSignedUrl(path, 60);
    if (signedData?.signedUrl) {
      try {
        const res = await fetch(signedData.signedUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return { base64, format: expectedFormat };
        }
      } catch (e) {
        console.error(`Signed URL fetch failed for ${path}:`, e);
      }
    }

    const { data: publicData } = supabase.storage.from("assets").getPublicUrl(path);
    if (publicData?.publicUrl) {
      try {
        const res = await fetch(publicData.publicUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return { base64, format: expectedFormat };
        }
      } catch (e) {
        console.error(`Public URL fetch failed for ${path}:`, e);
      }
    }
  }

  console.error(`Could not load image from any candidate: ${pathCandidates.join(', ')}`);
  return null;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { supervision_id, code, year, region, districts } = await req.json();

    const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const coat = await fetchImageFromAssets(supabase, [
      "images/COAT.png",
      "logos/COAT.png",
      "COAT.png",
    ]);

    const necta = await fetchImageFromAssets(supabase, [
      "images/NECTA.jpg",
      "images/NECTA.jpeg",
      "logos/NECTA.jpg",
      "NECTA.jpg",
    ]);

    let query = supabase
      .from('supervisorassignments')
      .select('*')
      .eq('supervision_id', supervision_id);

    if (region && region !== "all") query = query.eq('region', region);
    if (districts?.length) query = query.in('district', districts);

    const { data: rows, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!rows?.length) {
      return new Response(JSON.stringify({ error: "No assignments found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

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

    const isUalimu = code === "UALIMU" || UALIMU_CODES.includes(code);

    const centersTableMap: Record<string, string> = {
      SFNA: "primarymastersummary",
      SSNA: "primarymastersummary",
      PSLE: "primarymastersummary",
      FTNA: "secondarymastersummaries",
      CSEE: "secondarymastersummaries",
      ACSEE: "secondarymastersummaries",
      DPEE: "ualimumastersummary",
      DPNE: "dpnemastersummary",
      GATCE: "ualimumastersummary",
      DSEE: "ualimumastersummary",
      GATSCCE: "ualimumastersummary",
      DSPEE: "ualimumastersummary",
      DPPEE: "ualimumastersummary",
    };

    const centersTable = centersTableMap[code];
    const centerNumbers = [...new Set(sortedRows.map(r => r.center_no))];
    const centerCache: Record<string, string> = {};

    if (isUalimu && centerNumbers.length > 0) {
      const { data: tcRes } = await supabase
        .from('teacherscolleges')
        .select('center_no, name')
        .in('center_no', centerNumbers);

      tcRes?.forEach(c => {
        centerCache[c.center_no] = `${c.center_no} - ${abbreviateSchoolName(c.name)}`.toUpperCase();
      });
    } else if (centersTable && centerNumbers.length > 0) {
      const { data: supData } = await supabase
        .from('supervisions')
        .select('mid')
        .eq('id', supervision_id)
        .single();

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

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin     = 50;

    const districtsMap: Record<string, any[]> = {};
    sortedRows.forEach(r => {
      const key = r.district.toUpperCase();
      districtsMap[key] = districtsMap[key] || [];
      districtsMap[key].push(r);
    });

    let globalPageNumber = 1;

    const addHeader = (regionName: string, districtName: string) => {
      const logoSize = 82;

      if (coat) {
        try {
          doc.addImage(`data:image/png;base64,${coat.base64}`, 'PNG', margin, 30, logoSize, logoSize);
        } catch (e) {
          console.error("Failed to add Coat of Arms:", e);
        }
      }

      if (necta) {
        try {
          doc.addImage(
            `data:image/${necta.format.toLowerCase()};base64,${necta.base64}`,
            necta.format,
            pageWidth - margin - logoSize,
            30,
            logoSize,
            logoSize
          );
        } catch (e) {
          console.error("Failed to add NECTA logo:", e);
        }
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('JAMHURI YA MUUNGANO WA TANZANIA', pageWidth / 2, 55, { align: 'center' });

      doc.setFontSize(14);
      doc.text('WIZARA YA ELIMU, SAYANSI NA TEKNOLOJIA', pageWidth / 2, 75, { align: 'center' });
      doc.text('BARAZA LA MITIHANI LA TANZANIA', pageWidth / 2, 95, { align: 'center' });

      let headingText = "";
      if (isUalimu) {
        headingText = `ORODHA YA WASIMAMIZI WAKUU WA MITIHANI YA UALIMU ${year}`;
      } else {
        switch (code) {
          case "SFNA": headingText = `ORODHA YA WASIMAMIZI WAKUU WA UPIMAJI WA KITAIFA WA DARASA LA NNE ${year}`; break;
          case "PSLE": headingText = `ORODHA YA WASIMAMIZI WAKUU WA MTIHANI WA KUHITIMU DARASA LA SABA ${year}`; break;
          case "FTNA": headingText = `ORODHA YA WASIMAMIZI WAKUU WA UPIMAJI WA KITAIFA WA KIDATO CHA PILI ${year}`; break;
          case "CSEE": headingText = `ORODHA YA WASIMAMIZI WAKUU WA MTIHANI WA KIDATO CHA NNE ${year}`; break;
          case "ACSEE": headingText = `ORODHA YA WASIMAMIZI WAKUU WA MTIHANI WA KIDATO CHA SITA ${year}`; break;
          default: headingText = `ORODHA YA WASIMAMIZI WAKUU ${year}`;
        }
      }

      doc.text(headingText, pageWidth / 2, 123, { align: 'center' });
      doc.setFontSize(13);
      doc.text(`MKOA WA ${regionName || 'N/A'}`.toUpperCase(), pageWidth / 2, 143, { align: 'center' });

      let districtText = districtName;
      if      (districtName.endsWith('CC')) districtText = `HALMASHAURI YA JIJI LA ${districtName.slice(0, -2)}`;
      else if (districtName.endsWith('MC')) districtText = `HALMASHAURI YA MANISPAA YA ${districtName.slice(0, -2)}`;
      else if (districtName.endsWith('TC')) districtText = `HALMASHAURI YA MJI ${districtName.slice(0, -2)}`;
      else if (districtName.endsWith('DC')) districtText = `HALMASHAURI YA WILAYA YA ${districtName.slice(0, -2)}`;
      else                                  districtText = `HALMASHAURI YA WILAYA YA ${districtName}`;

      doc.text(districtText.toUpperCase(), pageWidth / 2, 163, { align: 'center' });
      doc.setLineWidth(1);
      doc.line(margin, 170, pageWidth - margin, 170);
    };

    let first = true;
    const districtKeys = Object.keys(districtsMap).sort();

    for (const districtName of districtKeys) {
      const districtRows = districtsMap[districtName];
      const regionName = districtRows[0]?.region ?? 'N/A';

      if (!first) doc.addPage();

      addHeader(regionName, districtName);

      const tableData = districtRows.map((r, idx) => [
        (idx + 1).toString(),
        (centerCache[r.center_no] || r.center_no).toUpperCase(),
        (r.supervisor_name || "N/A").toUpperCase(),
        (r.workstation || "N/A").toUpperCase(),
        (r.phone || "N/A").toUpperCase(),
      ]);

      autoTable(doc, {
        head: [["SN", "KITUO CHA KUSIMAMIA", "JINA LA MSIMAMIZI", "KITUO CHA KAZI", "SIMU"]],
        body: tableData,
        startY: 180,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textTransform: 'uppercase',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 40, halign: 'center' },
          1: { cellWidth: 200,overflow: 'hidden' },
          2: { cellWidth: 200 ,overflow: 'hidden'},
          3: { cellWidth: 200, overflow: 'hidden'},
          4: { cellWidth: 100 ,overflow: 'hidden'},
        },
        didParseCell: (data) => {
          if (data.section === 'head' && data.column.index === 0) {
            data.cell.styles.halign = 'center';
          }
        },
        didDrawPage: () => {
          doc.setFontSize(16);
          doc.setTextColor(255, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.text("SIRI", pageWidth / 2, 25, { align: 'center' });
          doc.text("SIRI", pageWidth / 2, pageHeight - 20, { align: 'center' });

          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Ukurasa ${globalPageNumber}`,
            pageWidth - margin,
            pageHeight - 30,
            { align: 'right' }
          );

          globalPageNumber++;
        },
      });

      first = false;
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return new Response(JSON.stringify({ pdfBase64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});