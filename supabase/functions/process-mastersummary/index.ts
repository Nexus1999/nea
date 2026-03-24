// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SUBJECT CODES
const CSEE_FTNA = ['011','012','013','014','015','016','017','018','019','021','022','023','024','025','026','031','032','033','034','035','036','041','042','050','051','052','061','062','071','072','073','074','080','081','082','083','087','088','090','091'];
const ACSEE = ['111','112','113','114','115','116','118','121','122','123','125','126','131','132','133','134','136','137','141','142','151','152','153','155','161'];
const UALIMU = ['513','514','520','521','522-E','531','532','541','542','551','552','553','554','566','567','585','586','587','588','589','595','596','597','598','599','610','611','520-E','616','522','516','521-E','517','580','590','710','711','712','713','715','716','717','719','721','722','724','725','731','732','733','735','736','737','738','740','750','751','752','753','761','762','763','764','612','613','614','615','621','622','624','631','632','633','634','635','636','638','640','641','650','651','652','654','680','682','683','684','686','687','689','691','510','560','561','562','563','564','565','571','572','573','574','581','582','583','584','661','664','665','669','670','672','673','674','675','676','679','692','693','694','695','696'];

const PRIMARY_HEADERS = ['region','district','center_name','center_number','subjects','medium','special_subject','registered'];
const BASE_HEADERS = ['region','district','center_name','center_number'];
const UALIMU_CODES = ['DSEE','GATCE','GATSCCE','DPEE','DSPEE','DPPEE'];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: corsHeaders });
  }

  let targetId: number | null = null;
  let version = 1;
  let existingId = NaN;

  try {
    const formData = await req.formData();
    existingId = parseInt(formData.get("existingMasterSummaryId")?.toString() || "", 10);
    const code = formData.get("code")?.toString();
    const exam = formData.get("examination")?.toString();
    const year = parseInt(formData.get("year")?.toString() || "", 10);
    const json = formData.get("data")?.toString();

    if (!code || !exam || isNaN(year) || !json) throw new Error("Missing required fields");

    const rows = JSON.parse(json);
    if (!rows.length) throw new Error("Empty data");

    // Create a case-insensitive header map
    const headerMap: Record<string, string> = {};
    Object.keys(rows[0]).forEach(k => headerMap[k.toLowerCase()] = k);
    const headers = Object.keys(headerMap);

    // ---- VALIDATION ----
    let required: string[] = [];
    let specific: string[] = [];
    let others: string[] = [];

    if (["SFNA","SSNA","PSLE"].includes(code)) {
      required = PRIMARY_HEADERS;
    } else if (["CSEE","FTNA"].includes(code)) {
      required = BASE_HEADERS;
      specific = CSEE_FTNA;
      others = [...ACSEE, ...UALIMU];
    } else if (code === "ACSEE") {
      required = BASE_HEADERS;
      specific = ACSEE;
      others = [...CSEE_FTNA, ...UALIMU];
    } else if (UALIMU_CODES.includes(code)) {
      required = BASE_HEADERS;
      specific = UALIMU;
      others = [...CSEE_FTNA, ...ACSEE];
    } else {
      throw new Error(`Unknown exam code ${code}`);
    }

    const missing = required.filter(h => !headers.includes(h));
    if (missing.length) throw new Error(`Missing headers: ${missing.join(", ")}`);

    if (specific.length) {
      const presentSpecific = specific.filter(s => headers.includes(s.toLowerCase()));
      const presentOthers = others.filter(s => headers.includes(s.toLowerCase()));

      if (!presentSpecific.length) throw new Error(`The uploaded file does not contain any subject columns for ${code}.`);
      if (presentOthers.length > presentSpecific.length) throw new Error(`The uploaded file appears to belong to a different examination type.`);
    }

    // ---- TABLE SELECTION ----
    let table = "";
    if (["SFNA","SSNA","PSLE"].includes(code)) table = "primarymastersummary";
    else if (["CSEE","FTNA","ACSEE"].includes(code)) table = "secondarymastersummaries";
    else table = "ualimumastersummary";

    // ---- VERSIONING & MASTER RECORD ----
    if (!isNaN(existingId)) {
      targetId = existingId;
      const { data } = await supabaseAdmin.from("mastersummaries").select("version").eq("id", targetId).single();
      version = (data?.version || 1) + 1;

      await supabaseAdmin.from(table).update({ is_latest: false }).eq("mid", targetId);
      await supabaseAdmin.from("mastersummaries").update({ version, created_at: new Date().toISOString() }).eq("id", targetId);
    } else {
      const { data, error } = await supabaseAdmin.from("mastersummaries")
        .insert({ Examination: exam, Code: code, Year: year, version: 1, is_latest: true })
        .select("id").single();
      if (error) throw error;
      targetId = data.id;
    }

    // ---- BATCH INSERT ----
    const batchSize = 1000;
    let batch: any[] = [];
    const num = (v: any) => isNaN(parseInt(v)) ? 0 : parseInt(v);

    for (const row of rows) {
      const base: any = {
        mid: targetId,
        region: String(row[headerMap['region']] || '').trim(),
        district: String(row[headerMap['district']] || '').trim(),
        center_name: String(row[headerMap['center_name']] || '').trim(),
        center_number: String(row[headerMap['center_number']] || '').trim(),
        version,
        is_latest: true,
        created_at: new Date().toISOString()
      };

      if (table === "primarymastersummary") {
        base.subjects = String(row[headerMap['subjects']] || '').trim();
        base.medium = String(row[headerMap['medium']] || '').trim();
        base.special_subject = row[headerMap['special_subject']] || null;
        base.registered = num(row[headerMap['registered']]);
      } else {
        const codes = table === "secondarymastersummaries"
          ? (code === "ACSEE" ? ACSEE : CSEE_FTNA)
          : UALIMU;

        for (const c of codes) {
          const originalKey = headerMap[c.toLowerCase()];
          if (originalKey) {
            base[c] = num(row[originalKey]);
          }
        }
      }

      batch.push(base);

      if (batch.length >= batchSize) {
        const { error } = await supabaseAdmin.from(table).insert(batch);
        if (error) throw error;
        batch = [];
      }
    }

    if (batch.length) {
      const { error } = await supabaseAdmin.from(table).insert(batch);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ message: "Success", version }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("ERROR:", err.message);
    if (targetId && isNaN(existingId)) {
      await supabaseAdmin.from("mastersummaries").delete().eq("id", targetId);
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});