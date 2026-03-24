// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define subject codes for secondary examinations
const CSEE_FTNA_SUBJECT_CODES = [
  '011','012','013','014','015','016','017','018','019','021','022','023','024','025','026',
  '031','032','033','034','035','036','041','042','050','051','052','061','062','071','072',
  '073','074','080','081','082','083','087','088','090','091'
];
const ACSEE_SUBJECT_CODES = [
  '111','112','113','114','115','116','118','121','122','123','125','126','131','132','133',
  '134','136','137','141','142','151','152','153','155','161'
];

// All subject codes for ualimu examinations
const UALIMU_SUBJECT_CODES = [
  '513','514','520','521','522-E','531','532','541','542','551','552','553','554','566','567',
  '585','586','587','588','589','595','596','597','598','599','610','611','520-E','616','522',
  '516','521-E','517','580','590','710','711','712','713','715','716','717','719','721','722',
  '724','725','731','732','733','735','736','737','738','740','750','751','752','753','761',
  '762','763','764','612','613','614','615','621','622','624','631','632','633','634','635',
  '636','638','640','641','650','651','652','654','680','682','683','684','686','687','689',
  '691','510','560','561','562','563','564','565','571','572','573','574','581','582','583',
  '584','661','664','665','669','670','672','673','674','675','676','679','692','693','694',
  '695','696'
];

const PRIMARY_EXPECTED_HEADERS = [
  'region', 'district', 'center_name', 'center_number', 'subjects', 'medium', 'special_subject', 'registered'
];
const SECONDARY_BASE_EXPECTED_HEADERS = [
  'region', 'district', 'center_name', 'center_number'
];
const UALIMU_REQUIRED_HEADERS = [
  'region', 'district', 'center_name', 'center_number'
];

const UALIMU_CODES = ['DSEE', 'GATCE', 'GATSCCE', 'DPEE', 'DSPEE', 'DPPEE'];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  let targetMasterSummaryId: number | null = null;
  let targetVersion: number = 1;
  let existingMasterSummaryId: number = NaN;

  try {
    const formData = await req.formData();
    existingMasterSummaryId = parseInt(formData.get("existingMasterSummaryId")?.toString() || "", 10);
    const examination = formData.get("examination")?.toString();
    const code = formData.get("code")?.toString();
    const year = parseInt(formData.get("year")?.toString() || "", 10);
    const jsonDataString = formData.get("data")?.toString();

    if (!examination || !code || isNaN(year) || !jsonDataString) {
      return new Response(
        JSON.stringify({ error: "Missing required form fields." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let rows: Record<string, any>[] = [];
    try {
      rows = JSON.parse(jsonDataString);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON data." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Received empty data." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // --- Strict Header Validation ---
    const headersInFile = Object.keys(rows[0] || {}).map(h => h.toLowerCase());
    let requiredHeaders: string[] = [];
    let specificSubjectCodes: string[] = [];
    let otherSubjectCodes: string[] = [];

    if (["SFNA", "SSNA", "PSLE"].includes(code)) {
      requiredHeaders = PRIMARY_EXPECTED_HEADERS;
    } else if (code === "FTNA" || code === "CSEE") {
      requiredHeaders = SECONDARY_BASE_EXPECTED_HEADERS;
      specificSubjectCodes = CSEE_FTNA_SUBJECT_CODES;
      otherSubjectCodes = [...ACSEE_SUBJECT_CODES, ...UALIMU_SUBJECT_CODES];
    } else if (code === "ACSEE") {
      requiredHeaders = SECONDARY_BASE_EXPECTED_HEADERS;
      specificSubjectCodes = ACSEE_SUBJECT_CODES;
      otherSubjectCodes = [...CSEE_FTNA_SUBJECT_CODES, ...UALIMU_SUBJECT_CODES];
    } else if (UALIMU_CODES.includes(code)) {
      requiredHeaders = UALIMU_REQUIRED_HEADERS;
      specificSubjectCodes = UALIMU_SUBJECT_CODES;
      otherSubjectCodes = [...CSEE_FTNA_SUBJECT_CODES, ...ACSEE_SUBJECT_CODES];
    }

    // Check base headers
    const missingHeaders = requiredHeaders.filter(h => !headersInFile.includes(h.toLowerCase()));
    if (missingHeaders.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Missing required headers: ${missingHeaders.join(', ')}.`,
          expectedHeaders: requiredHeaders,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check subject codes for Secondary/Ualimu
    if (specificSubjectCodes.length > 0) {
      const presentSpecific = specificSubjectCodes.filter(sub => headersInFile.includes(sub.toLowerCase()));
      const presentOthers = otherSubjectCodes.filter(sub => headersInFile.includes(sub.toLowerCase()));

      if (presentSpecific.length === 0) {
        return new Response(
          JSON.stringify({ error: `The uploaded file does not contain any subject columns for ${code}.` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (presentOthers.length > presentSpecific.length) {
        return new Response(
          JSON.stringify({ error: `The uploaded file appears to belong to a different examination type (found more columns matching other exams).` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // --- Database Operations ---
    let detailedTableName: string = '';
    if (["SFNA", "SSNA", "PSLE"].includes(code)) detailedTableName = 'primarymastersummary';
    else if (["FTNA", "CSEE", "ACSEE"].includes(code)) detailedTableName = 'secondarymastersummaries';
    else if (UALIMU_CODES.includes(code)) detailedTableName = 'ualimumastersummary';

    if (!isNaN(existingMasterSummaryId)) {
      targetMasterSummaryId = existingMasterSummaryId;
      const { data: current } = await supabaseAdmin.from("mastersummaries").select("version").eq("id", targetMasterSummaryId).single();
      targetVersion = (current?.version || 1) + 1;
      await supabaseAdmin.from(detailedTableName).update({ is_latest: false }).eq("mid", targetMasterSummaryId).eq("version", targetVersion - 1);
      await supabaseAdmin.from("mastersummaries").update({ version: targetVersion, created_at: new Date().toISOString() }).eq("id", targetMasterSummaryId);
    } else {
      const { data: master } = await supabaseAdmin.from("mastersummaries").insert({ Examination: examination, Code: code, Year: year, version: 1, is_latest: true }).select("id").single();
      targetMasterSummaryId = master?.id;
      targetVersion = 1;
    }

    const batchSize = 1000;
    const sanitizeNumber = (val: any) => {
      const parsed = parseInt(String(val).trim(), 10);
      return isNaN(parsed) ? 0 : parsed;
    };

    let batch: any[] = [];
    for (const row of rows) {
      const base: any = {
        mid: targetMasterSummaryId,
        region: String(row.region || row.Region || '').trim(),
        district: String(row.district || row.District || '').trim(),
        center_number: String(row.center_number || row.center_no || row.Center_Number || '').trim(),
        center_name: String(row.center_name || row.Center_Name || '').trim(),
        is_latest: true,
        version: targetVersion,
        created_at: new Date().toISOString(),
      };

      if (detailedTableName === 'primarymastersummary') {
        base.subjects = String(row.subjects || '').trim();
        base.medium = String(row.medium || '').trim();
        base.special_subject = String(row.special_subject || '').trim() || null;
        base.registered = sanitizeNumber(row.registered);
      } else {
        const codesToUse = detailedTableName === 'secondarymastersummaries' 
          ? (code === 'ACSEE' ? ACSEE_SUBJECT_CODES : CSEE_FTNA_SUBJECT_CODES)
          : UALIMU_SUBJECT_CODES;
        
        for (const sub of codesToUse) {
          if (row[sub] !== undefined) base[sub] = sanitizeNumber(row[sub]);
        }
      }

      batch.push(base);
      if (batch.length >= batchSize) {
        await supabaseAdmin.from(detailedTableName).insert(batch);
        batch = [];
      }
    }
    if (batch.length > 0) await supabaseAdmin.from(detailedTableName).insert(batch);

    return new Response(JSON.stringify({ message: "Success" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err: any) {
    if (targetMasterSummaryId && isNaN(existingMasterSummaryId)) {
      await supabaseAdmin.from("mastersummaries").delete().eq("id", targetMasterSummaryId);
    }
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});