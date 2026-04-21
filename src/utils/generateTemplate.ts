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

    // 2. Fetch Rates & Guidelines & Regions
    const [ratesRes, guidelinesRes, regionsRes] = await Promise.all([
      supabase.from('transportation_rates').select('*').eq('budget_id', budgetId).maybeSingle(),
      supabase.from('transportation_days_guideline').select('*'),
      supabase.from('regions').select('id, name')
    ]);

    if (ratesRes.error) throw ratesRes.error;
    if (!ratesRes.data) throw new Error("Please configure budget rates first.");
    const rates = ratesRes.data;
    const guidelines = guidelinesRes.data || [];
    const regions = regionsRes.data || [];

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
    let totalPersonnel = 0;
    let totalFuel = 0;
    let totalUpakiaji = 0;
    let totalTahadhari = 0;
    let totalNauli = 0;

    // Helper to initialize a line item with defaults to avoid NOT NULL constraints
    const createBaseItem = (routeId: string, category: string, role: string) => ({
      template_version_id: version.id,
      route_id: routeId,
      category,
      role,
      quantity: 0,
      days: 0,
      transit_days: 0,
      posho: 0,
      distance_km: 0,
      fuel_liters: 0,
      fuel_cost: 0,
      unloading_cash: 0,
      emergency_allowance: 0,
      fare_return: 0,
      total_cost: 0
    });

    // 5. Process Each Route
    for (const route of routes) {
      const stops = route.transportation_route_stops || [];
      const vehicles = route.transportation_route_vehicles || [];
      const routeRegionNames = stops.map(s => s.region_name.toUpperCase());
      
      // Determine if this route uses a heavy truck
      const hasHeavyTruck = vehicles.some(v => v.vehicle_type === 'TRUCK_AND_TRAILER' || v.vehicle_type === 'STANDARD_TRUCK');

      for (const stop of stops) {
        const regionId = regions.find(r => r.name.toUpperCase() === stop.region_name.toUpperCase())?.id;
        if (!regionId) continue;

        // Find matching guidelines for this region
        const regionalGuidelines = guidelines.filter(g => g.region_id === regionId);
        let selectedGuideline = regionalGuidelines[0];

        // If multiple guidelines (via logic), check if the 'via' region is in the route stops
        if (regionalGuidelines.length > 1) {
          const viaMatch = regionalGuidelines.find(g => g.via && routeRegionNames.includes(g.via.toUpperCase()));
          if (viaMatch) selectedGuideline = viaMatch;
        }

        if (!selectedGuideline) continue;

        const days = hasHeavyTruck ? (selectedGuideline.days_truck || 1) : (selectedGuideline.days_light || 1);
        
        // A. Examination Officer for this region
        const eoQty = hasHeavyTruck ? (selectedGuideline.exam_officers_truck || 1) : (selectedGuideline.exam_officers_light || 1);
        const eoCost = rates.exam_officer_rate * eoQty * days;
        const eoItem = createBaseItem(route.id, 'PERSONNEL', 'exam_officer');
        Object.assign(eoItem, {
          region_name: stop.region_name,
          quantity: eoQty,
          days: days,
          posho: rates.exam_officer_rate,
          total_cost: eoCost
        });
        lineItems.push(eoItem);
        totalPersonnel += eoCost;

        // B. Unloading (Upakiaji) for this region
        const unloadingCost = (stop.boxes_count || 0) * rates.unloading_rate_per_box;
        if (unloadingCost > 0) {
          const upItem = createBaseItem(route.id, 'UPAKIAJI', 'loading');
          Object.assign(upItem, {
            region_name: stop.region_name,
            quantity: stop.boxes_count,
            unloading_cash: unloadingCost,
            total_cost: unloadingCost
          });
          lineItems.push(upItem);
          totalUpakiaji += unloadingCost;
        }
      }

      // C. Vehicles & Global Personnel (Police, Security, Drivers)
      // These are usually per route, but we use the max days from the furthest stop guideline
      let maxRouteDays = 1;
      let routeDistance = 0;

      for (const stop of stops) {
        const regionId = regions.find(r => r.name.toUpperCase() === stop.region_name.toUpperCase())?.id;
        const regionalGuidelines = guidelines.filter(g => g.region_id === regionId);
        let g = regionalGuidelines[0];
        if (regionalGuidelines.length > 1) {
          const viaMatch = regionalGuidelines.find(v => v.via && routeRegionNames.includes(v.via.toUpperCase()));
          if (viaMatch) g = viaMatch;
        }
        if (g) {
          const d = hasHeavyTruck ? (g.days_truck || 1) : (g.days_light || 1);
          if (d > maxRouteDays) maxRouteDays = d;
          routeDistance = Math.max(routeDistance, Number(g.distance_km) || 0);
        }
      }

      // Add Police, Security, Drivers based on vehicles
      for (const v of vehicles) {
        const isTruck = v.vehicle_type === 'TRUCK_AND_TRAILER' || v.vehicle_type === 'STANDARD_TRUCK';
        
        // Driver(s)
        const driverRate = rates.driver_rate;
        const driverItem = createBaseItem(route.id, 'PERSONNEL', 'driver');
        const driverCost = driverRate * v.quantity * maxRouteDays;
        Object.assign(driverItem, {
          vehicle_label: v.vehicle_type,
          quantity: v.quantity,
          days: maxRouteDays,
          posho: driverRate,
          total_cost: driverCost
        });
        lineItems.push(driverItem);
        totalPersonnel += driverCost;

        // Fuel
        let consumption = rates.fuel_consumption_tt;
        if (v.vehicle_type === 'STANDARD_TRUCK') consumption = rates.fuel_consumption_truck;
        if (v.vehicle_type === 'ESCORT_VEHICLE') consumption = rates.fuel_consumption_escort;

        const fuelLiters = routeDistance / (consumption || 1);
        const fuelCost = Math.round(fuelLiters * rates.fuel_price_per_liter * v.quantity);
        const fuelItem = createBaseItem(route.id, 'FUEL', v.vehicle_type.toLowerCase());
        Object.assign(fuelItem, {
          quantity: v.quantity,
          distance_km: routeDistance,
          fuel_liters: Math.round(fuelLiters),
          fuel_cost: fuelCost,
          total_cost: fuelCost
        });
        lineItems.push(fuelItem);
        totalFuel += fuelCost;

        // Emergency
        const emergencyRate = isTruck ? rates.emergency_tt : rates.emergency_standard;
        const emergencyTotal = emergencyRate * v.quantity;
        const emItem = createBaseItem(route.id, 'TAHADHARI', 'emergency');
        Object.assign(emItem, {
          quantity: v.quantity,
          emergency_allowance: emergencyTotal,
          total_cost: emergencyTotal
        });
        lineItems.push(emItem);
        totalTahadhari += emergencyTotal;
      }

      // Global Security/Police for the route (simplified logic)
      const securityRoles = [
        { role: 'police_officer', rate: rates.police_rate, qty: 2 },
        { role: 'security_officer', rate: rates.security_rate, qty: 1 }
      ];
      for (const s of securityRoles) {
        const sCost = s.rate * s.qty * maxRouteDays;
        const sItem = createBaseItem(route.id, 'PERSONNEL', s.role);
        Object.assign(sItem, {
          quantity: s.qty,
          days: maxRouteDays,
          posho: s.rate,
          total_cost: sCost
        });
        lineItems.push(sItem);
        totalPersonnel += sCost;
      }
    }

    // 6. Bulk Insert Line Items
    const { error: itemsError } = await supabase
      .from('transportation_template_line_items')
      .insert(lineItems);

    if (itemsError) throw itemsError;

    // 7. Update Version Totals
    const grandTotal = totalPersonnel + totalFuel + totalUpakiaji + totalTahadhari + totalNauli;
    await supabase
      .from('transportation_template_versions')
      .update({
        grand_total: grandTotal,
        total_personnel: totalPersonnel,
        total_fuel: totalFuel,
        total_upakiaji: totalUpakiaji,
        total_tahadhari: totalTahadhari,
        total_nauli: totalNauli
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