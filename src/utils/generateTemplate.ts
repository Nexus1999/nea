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
    // 1. Get or Create Template
    let templateId = currentTemplateId;
    if (!templateId) {
      const { data: newTemplate, error: tError } = await supabase
        .from('transportation_templates')
        .insert({ budget_id: budgetId, user_id: userId })
        .select()
        .single();
      if (tError) throw tError;
      templateId = newTemplate.id;
    }

    // 2. Fetch Rates
    const { data: rates, error: rError } = await supabase
      .from('transportation_rates')
      .select('*')
      .eq('budget_id', budgetId)
      .maybeSingle();

    if (rError) throw rError;
    if (!rates) throw new Error("Please configure budget rates first.");

    // 3. Fetch Routes with Vehicles and Stops
    const { data: routes, error: routesError } = await supabase
      .from('transportation_routes')
      .select(`
        *,
        transportation_route_vehicles (*),
        transportation_route_stops (*)
      `)
      .eq('budget_id', budgetId);

    if (routesError) throw routesError;
    if (!routes || routes.length === 0) throw new Error("No routes found to generate template.");

    // 4. Create New Version
    const nextVersion = currentVersionNum + 1;
    const { data: version, error: vError } = await supabase
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

    if (vError) throw vError;

    // Deactivate old versions
    await supabase
      .from('transportation_template_versions')
      .update({ is_current: false })
      .eq('template_id', templateId)
      .neq('id', version.id);

    const lineItems: any[] = [];
    let grandTotal = 0;
    let totalPersonnel = 0;
    let totalFuel = 0;
    let totalUpakiaji = 0;
    let totalTahadhari = 0;

    // 5. Process Each Route
    for (const route of routes) {
      const stops = route.transportation_route_stops || [];
      const vehicles = route.transportation_route_vehicles || [];
      
      // Safe duration calculation
      let durationDays = 1; 
      if (stops.length > 0) {
        const start = new Date(route.start_date);
        const endDates = stops
          .map(s => new Date(s.delivery_date))
          .filter(d => !isNaN(d.getTime()));
        
        if (endDates.length > 0) {
          const maxEndTime = Math.max(...endDates.map(d => d.getTime()));
          const startTime = start.getTime();
          
          if (!isNaN(startTime) && !isNaN(maxEndTime)) {
            durationDays = Math.ceil((maxEndTime - startTime) / (1000 * 60 * 60 * 24)) + 1;
            durationDays = Math.max(1, durationDays);
          }
        }
      }

      // A. Personnel Costs
      const personnelRoles = [
        { role: 'exam_officer', rate: rates.exam_officer_rate, qty: 1 },
        { role: 'police_officer', rate: rates.police_rate, qty: 2 },
        { role: 'security_officer', rate: rates.security_rate, qty: 1 },
        { role: 'driver', rate: rates.driver_rate, qty: 1 }
      ];

      for (const p of personnelRoles) {
        const cost = p.rate * p.qty * durationDays;
        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'PERSONNEL',
          role: p.role,
          quantity: p.qty,
          days: durationDays,
          posho: p.rate,
          total_cost: cost
        });
        totalPersonnel += cost;
      }

      // B. Fuel Costs
      for (const v of vehicles) {
        let consumption = rates.fuel_consumption_tt;
        if (v.vehicle_type === 'STANDARD_TRUCK') consumption = rates.fuel_consumption_truck;
        if (v.vehicle_type === 'ESCORT_VEHICLE') consumption = rates.fuel_consumption_escort;

        const estKm = 1200; // Placeholder for distance logic
        const fuelLiters = estKm / consumption;
        const fuelCost = Math.round(fuelLiters * rates.fuel_price_per_liter * v.quantity);

        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'FUEL',
          role: v.vehicle_type.toLowerCase(),
          quantity: v.quantity,
          days: 0, // Explicitly 0 to avoid null constraint
          fuel_cost: fuelCost,
          total_cost: fuelCost
        });
        totalFuel += fuelCost;

        // C. Emergency Allowance
        const emergencyRate = v.vehicle_type === 'TRUCK_AND_TRAILER' ? rates.emergency_tt : rates.emergency_standard;
        const emergencyTotal = emergencyRate * v.quantity;
        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'TAHADHARI',
          role: 'emergency',
          quantity: v.quantity,
          days: 0,
          emergency_allowance: emergencyTotal,
          total_cost: emergencyTotal
        });
        totalTahadhari += emergencyTotal;
      }

      // D. Unloading (Upakiaji)
      const totalBoxes = stops.reduce((sum, s) => sum + (s.boxes_count || 0), 0);
      const unloadingCost = totalBoxes * rates.unloading_rate_per_box;
      if (unloadingCost > 0) {
        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: 'UPAKIAJI',
          role: 'loading',
          quantity: totalBoxes,
          days: 0,
          unloading_cash: unloadingCost,
          total_cost: unloadingCost
        });
        totalUpakiaji += unloadingCost;
      }
    }

    // 6. Bulk Insert Line Items
    const { error: itemsError } = await supabase
      .from('transportation_template_line_items')
      .insert(lineItems);

    if (itemsError) throw itemsError;

    // 7. Update Version Totals
    grandTotal = totalPersonnel + totalFuel + totalUpakiaji + totalTahadhari;
    await supabase
      .from('transportation_template_versions')
      .update({
        grand_total: grandTotal,
        total_personnel: totalPersonnel,
        total_fuel: totalFuel,
        total_upakiaji: totalUpakiaji,
        total_tahadhari: totalTahadhari
      })
      .eq('id', version.id);

    return { success: true };
  } catch (error: any) {
    console.error("Template Generation Error:", error);
    return { success: false, error: error.message };
  }
};

export const appendChangeLog = async (versionId: string, message: string, userEmail: string) => {
  const { data: version } = await supabase
    .from('transportation_template_versions')
    .select('change_log')
    .eq('id', versionId)
    .single();

  const logs = version?.change_log || [];
  const newLog = {
    timestamp: new Date().toISOString(),
    user: userEmail,
    message
  };

  await supabase
    .from('transportation_template_versions')
    .update({ change_log: [...logs, newLog] })
    .eq('id', versionId);
};