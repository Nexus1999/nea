import { supabase } from "@/integrations/supabase/client";
import { 
  Stationery, 
  StationeryReoDeoExtra, 
  StationeryBoxLimits, 
  StationeryMultiplier, 
  ReoDeoExtraFormValues, 
  BoxLimitsFormValues,
  StationeryCenterMultiplier,
  CenterMultipliersFormValues,
  MasterSummaryOption
} from "@/types/stationeries";

// Helper function to fetch the stationery entry along with its master summary details
export const fetchStationeryWithExamDetails = async (stationeryId: number): Promise<Stationery | null> => {
  const { data, error } = await supabase
    .from('stationeries')
    .select('*, mastersummaries(Examination, Code, Year)')
    .eq('id', stationeryId)
    .single();

  if (error) {
    console.error("Error fetching stationery details:", error);
    return null;
  }

  if (data) {
    return {
      ...data,
      examination_name: data.mastersummaries?.Examination || 'N/A',
      examination_code: data.mastersummaries?.Code || 'N/A',
      examination_year: data.mastersummaries?.Year || 'N/A',
    } as Stationery;
  }
  return null;
};

// Helper function to fetch master summary details by ID
export const fetchMasterSummaryById = async (masterSummaryId: number): Promise<MasterSummaryOption | null> => {
  const { data, error } = await supabase
    .from('mastersummaries')
    .select('id, Examination, Code, Year')
    .eq('id', masterSummaryId)
    .single();

  if (error) {
    console.error("Error fetching master summary by ID:", error);
    return null;
  }

  return data as MasterSummaryOption | null;
};

// --- REO/DEO Extra API ---

export const fetchReoDeoExtraSettings = async (stationeryId: number): Promise<StationeryReoDeoExtra | null> => {
  const { data, error } = await supabase
    .from('stationery_reo_deo_extra')
    .select('*')
    .eq('stationery_id', stationeryId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching REO/DEO Extra settings:", error);
    return null;
  }

  return data as StationeryReoDeoExtra | null;
};

export const saveReoDeoExtraSettings = async (
  stationeryId: number,
  values: ReoDeoExtraFormValues,
  existingId?: number
): Promise<StationeryReoDeoExtra | null> => {
  const payload = {
    stationery_id: stationeryId,
    ...values,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from('stationery_reo_deo_extra')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single();

    if (error) throw error;
    return data as StationeryReoDeoExtra;
  } else {
    const { data, error } = await supabase
      .from('stationery_reo_deo_extra')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as StationeryReoDeoExtra;
  }
};

// --- Box Limits API ---

export const fetchBoxLimitsSettings = async (stationeryId: number): Promise<StationeryBoxLimits | null> => {
  const { data, error } = await supabase
    .from('stationery_box_limits')
    .select('*')
    .eq('stationery_id', stationeryId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching Box Limits settings:", error);
    return null;
  }

  return data as StationeryBoxLimits | null;
};

export const saveBoxLimitsSettings = async (
  stationeryId: number,
  values: BoxLimitsFormValues,
  existingId?: number
): Promise<StationeryBoxLimits | null> => {
  const payload = {
    stationery_id: stationeryId,
    ...values,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from('stationery_box_limits')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single();

    if (error) throw error;
    return data as StationeryBoxLimits;
  } else {
    const { data, error } = await supabase
      .from('stationery_box_limits')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as StationeryBoxLimits;
  }
};

// --- Multipliers API ---

// Fetches all secondary subjects for a given exam code
export const fetchSecondarySubjects = async (examCode: string): Promise<StationeryMultiplier[]> => {
  const { data, error } = await supabase
    .from('subjects')
    .select('subject_code, subject_name')
    .eq('exam_code', examCode)
    .order('subject_code', { ascending: true });

  if (error) {
    console.error("Error fetching secondary subjects:", error);
    throw error;
  }

  return data.map(sub => ({
    stationery_id: 0, // Placeholder
    subject_code: sub.subject_code,
    subject_name: sub.subject_name,
    multiplier_value: 1, // Default multiplier value
  }));
};

export const fetchMultipliersSettings = async (stationeryId: number): Promise<StationeryMultiplier[]> => {
  const { data, error } = await supabase
    .from('stationery_multipliers')
    .select('*, subjects(subject_name)')
    .eq('stationery_id', stationeryId)
    .order('subject_code', { ascending: true });

  if (error) {
    console.error("Error fetching Multipliers settings:", error);
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    subject_name: item.subjects?.subject_name || 'N/A',
  })) as StationeryMultiplier[];
};

// Saves/Updates multipliers in a batch
export const saveMultipliersSettings = async (
  stationeryId: number,
  multipliers: { subject_code: string; multiplier_value: number }[]
): Promise<void> => {
  // 1. Delete existing multipliers for this stationery_id
  const { error: deleteError } = await supabase
    .from('stationery_multipliers')
    .delete()
    .eq('stationery_id', stationeryId);

  if (deleteError) throw deleteError;

  // 2. Insert new multipliers
  const insertPayload = multipliers.map(m => ({
    stationery_id: stationeryId,
    subject_code: m.subject_code,
    multiplier_value: m.multiplier_value,
  }));

  if (insertPayload.length > 0) {
    const { error: insertError } = await supabase
      .from('stationery_multipliers')
      .insert(insertPayload);

    if (insertError) throw insertError;
  }
};

export const fetchCenterMultipliers = async (
  stationeryId: number
): Promise<StationeryCenterMultiplier | null> => {
  const { data, error } = await supabase
    .from("stationery_center_multipliers")
    .select("*")
    .eq("stationery_id", stationeryId)
    .single();

  // If no row found, PostgREST returns PGRST116; treat as null
  if (error && (error as any).code !== "PGRST116") {
    console.error("Error fetching center multipliers:", error);
    throw error;
  }

  return (data || null) as StationeryCenterMultiplier | null;
};

export const saveCenterMultipliers = async (
  stationeryId: number,
  values: CenterMultipliersFormValues,
  existingId?: number
): Promise<StationeryCenterMultiplier> => {
  const payload = {
    stationery_id: stationeryId,
    ...values,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("stationery_center_multipliers")
      .update(payload)
      .eq("id", existingId)
      .select()
      .single();

    if (error) throw error;
    return data as StationeryCenterMultiplier;
  } else {
    const { data, error } = await supabase
      .from("stationery_center_multipliers")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as StationeryCenterMultiplier;
  }
};