"use client";

import { supabase } from "@/integrations/supabase/client";

interface GenerateTemplateProps {
  budgetId: string;
  currentVersionNum: number;
  currentTemplateId?: string;
  userId: string;
  userEmail: string;
}

export const generateTemplate = async ({
  budgetId,
  currentVersionNum,
  currentTemplateId,
  userId,
  userEmail
}: GenerateTemplateProps) => {
  try {
    // 1. Fetch Rates for this budget
    const { data: rates, error: ratesError } = await supabase
      .from('transportation_rates')
      .select('*')
      .eq('budget_id', budgetId)
      .maybeSingle();

    if (ratesError || !rates) {
      throw new Error("Tafadhali weka viwango vya malipo (Rates) kwenye mipangilio ya bajeti kwanza.");
    }

    // 2. Fetch Routes and their details
    const { data: routes, error: routesError } = await supabase
      .from('transportation_routes')
      .select(`
        *,
        transportation_route_vehicles (*),
        transportation_route_stops (*)
      `)
      .eq('budget_id', budgetId);

    if (routesError) throw routesError;
    if (!routes || routes.length === 0) {
      throw new Error("Hakuna misafara iliyopangwa. Tafadhali panga misafara kwanza.");
    }

    // 3. Ensure Template exists
    let templateId = currentTemplateId;
    if (!templateId) {
      const { data: newTemp, error: tempErr } = await supabase
        .from('transportation_templates')
        .insert({ budget_id: budgetId, created_by: userId })
        .select()
        .single();
      if (tempErr) throw tempErr;
      templateId = newTemp.id;
    }

    // 4. Create New Version
    const nextVersion = currentVersionNum + 1;
    const { data: version, error: verErr } = await supabase
      .from('transportation_template_versions')
      .insert({
        template_id: templateId,
        version_num: nextVersion,
        is_current: true,
        created_by: userId,
        rates_snapshot: rates
      })
      .select()
      .single();
    if (verErr) throw verErr;

    // Set previous versions to not current
    await supabase
      .from('transportation_template_versions')
      .update({ is_current: false })
      .eq('template_id', templateId)
      .neq('id', version.id);

    const lineItems: any[] = [];
    let totalPersonnel = 0;
    let totalFuel = 0;
    let totalUpakiaji = 0;
    let totalTahadhari = 0;
    let totalNauli = 0;

    // 5. Process Each Route
    for (const route of routes) {
      const stops = route.transportation_route_stops || [];
      const vehicles = route.transportation_route_vehicles || [];
      
      // Calculate duration (days)
      const start = new Date(route.start_date);
      const endStops = stops.map(s => new Date(s.delivery_date));
      const maxEnd = new Date(Math.max(...endStops.map(d => d.getTime())));
      const durationDays = Math.ceil((maxEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // A. Personnel Costs
      const roles = [
        { role: 'exam_officer', rate: rates.exam_officer_rate, qty: 2 },
        { role: 'police_officer', rate: rates.police_rate, qty: 2 },
        { role: 'security_officer', rate: rates.security_rate, qty: 1 },
      ];

      for (const r of roles) {
        const posho = r.rate * durationDays * r.qty;
        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'PERSONNEL',
          role: r.role,
          quantity: r.qty,
          days: durationDays,
          allowance_per_day: r.rate,
          posho: posho,
          total_cost: posho
        });
        totalPersonnel += posho;
      }

      // B. Vehicle Specific Costs
      for (const v of vehicles) {
        // Driver for each truck
        if (v.vehicle_type.includes('TRUCK')) {
          const driverPosho = rates.driver_rate * durationDays * v.quantity;
          lineItems.push({
            template_version_id: version.id,
            route_id: route.id,
            category: 'PERSONNEL',
            role: 'driver',
            quantity: v.quantity,
            days: durationDays,
            allowance_per_day: rates.driver_rate,
            posho: driverPosho,
            total_cost: driverPosho
          });
          totalPersonnel += driverPosho;

          // Emergency Allowance
          const emergency = (v.vehicle_type === 'TRUCK_AND_TRAILER' ? rates.emergency_tt : rates.emergency_standard) * v.quantity;
          lineItems.push({
            template_version_id: version.id,
            route_id: route.id,
            category: 'TAHADHARI',
            role: 'emergency',
            vehicle_type: v.vehicle_type,
            quantity: v.quantity,
            emergency_allowance: emergency,
            total_cost: emergency
          });
          totalTahadhari += emergency;
        }

        // Fuel Calculation
        const consumption = v.vehicle_type === 'TRUCK_AND_TRAILER' ? rates.fuel_consumption_tt : 
                           v.vehicle_type === 'STANDARD_TRUCK' ? rates.fuel_consumption_truck : 
                           rates.fuel_consumption_escort;
        
        const estKm = 1200; // Default fallback
        const liters = (estKm / consumption) * v.quantity;
        const fuelCost = liters * rates.fuel_price_per_liter;

        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'FUEL',
          role: 'fuel',
          vehicle_type: v.vehicle_type,
          quantity: v.quantity,
          distance_km: estKm,
          fuel_liters: Math.round(liters),
          fuel_cost: Math.round(fuelCost),
          total_cost: Math.round(fuelCost)
        });
        totalFuel += fuelCost;
      }

      // C. Unloading (Vibarua) per Stop
      for (const stop of stops) {
        const unloading = (stop.boxes_count || 0) * rates.unloading_rate_per_box;
        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'UPAKIAJI',
          role: 'loading',
          region_name: stop.region_name,
          item_quantity: stop.boxes_count,
          unit_cost: rates.unloading_rate_per_box,
          operational_total: unloading,
          total_cost: unloading
        });
        totalUpakiaji += unloading;
      }
    }

    // 6. Bulk Insert Line Items
    const { error: insertErr } = await supabase
      .from('transportation_template_line_items')
      .insert(lineItems);
    if (insertErr) throw insertErr;

    // 7. Update Version Totals
    const grandTotal = totalPersonnel + totalFuel + totalUpakiaji + totalTahadhari + totalNauli;
    await supabase
      .from('transportation_template_versions')
      .update({
        total_personnel: totalPersonnel,
        total_fuel: totalFuel,
        total_upakiaji: totalUpakiaji,
        total_tahadhari: totalTahadhari,
        total_nauli: totalNauli,
        grand_total: grandTotal
      })
      .eq('id', version.id);

    return { success: true };
  } catch (error: any) {
    console.error("Generation Error:", error);
    return { success: false, error: error.message };
  }
};

export const appendChangeLog = async (versionId: string, logEntry: any) => {
  const { data } = await supabase
    .from('transportation_template_versions')
    .select('change_log')
    .eq('id', versionId)
    .single();
  
  const newLog = [...(data?.change_log || []), { ...logEntry, timestamp: new Date().toISOString() }];
  
  await supabase
    .from('transportation_template_versions')
    .update({ change_log: newLog })
    .eq('id', versionId);
};