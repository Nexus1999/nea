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
  userEmail,
}: GenerateTemplateProps) => {
  try {
    // 1. Get or Create Template
    let templateId = currentTemplateId;
    if (!templateId) {
      const { data: newTemplate, error: tError } = await supabase
        .from("transportation_templates")
        .insert({ budget_id: budgetId, status: "draft" })
        .select()
        .single();
      if (tError) throw tError;
      templateId = newTemplate.id;
    }

    // 2. Fetch Rates, Guidelines, and Regions
    const [ratesRes, guidelinesRes, regionsRes] = await Promise.all([
      supabase.from("transportation_rates").select("*").eq("budget_id", budgetId).maybeSingle(),
      supabase.from("transportation_days_guideline").select("*").eq("category", "EXAMS"),
      supabase.from("regions").select("id, name")
    ]);

    if (ratesRes.error) throw ratesRes.error;
    if (!ratesRes.data) throw new Error("Please configure budget rates first.");
    const rates = ratesRes.data;
    const guidelines = guidelinesRes.data || [];
    const regions = regionsRes.data || [];

    // 3. Fetch Routes with vehicles and stops
    const { data: routes, error: routesError } = await supabase
      .from("transportation_routes")
      .select(`
        *,
        transportation_route_vehicles (*),
        transportation_route_stops (*)
      `)
      .eq("budget_id", budgetId);

    if (routesError) throw routesError;
    if (!routes || routes.length === 0)
      throw new Error("No routes found to generate template.");

    // 4. Create New Version
    const nextVersion = currentVersionNum + 1;
    const { data: version, error: vError } = await supabase
      .from("transportation_template_versions")
      .insert({
        template_id: templateId,
        version_num: nextVersion,
        is_current: true,
        created_by: userId,
        rates_snapshot: rates,
      })
      .select()
      .single();
    if (vError) throw vError;

    // Deactivate old versions
    await supabase
      .from("transportation_template_versions")
      .update({ is_current: false })
      .eq("template_id", templateId)
      .neq("id", version.id);

    const lineItems: any[] = [];
    let totalPersonnel = 0;
    let totalFuel = 0;
    let totalUpakiaji = 0;
    let totalTahadhari = 0;
    let totalNauli = 0;

    // Helper to create a base item with all required columns initialized to 0/empty
    const createBaseItem = (routeId: string, category: string, role: string) => ({
      template_version_id: version.id,
      route_id: routeId,
      category,
      role,
      region_name: "",
      vehicle_type: "",
      vehicle_label: "",
      quantity: 0,
      days: 0,
      transit_days: 0,
      posho: 0,
      allowance_per_day: 0,
      distance_km: 0,
      fuel_liters: 0,
      fuel_cost: 0,
      unloading_cash: 0,
      item_quantity: 0,
      unit_cost: 0,
      operational_total: 0,
      fare_return: 0,
      emergency_allowance: 0,
      total_cost: 0,
      transit_rate_factor: 0.5,
    });

    // 5. Process Each Route
    for (const route of routes) {
      const stops = route.transportation_route_stops || [];
      const vehicles = route.transportation_route_vehicles || [];
      const routeRegionNames = stops.map(s => s.region_name.toUpperCase());
      
      // Determine if route uses heavy vehicles
      const hasHeavyTruck = vehicles.some(v => v.vehicle_type === 'TRUCK_AND_TRAILER' || v.vehicle_type === 'STANDARD_TRUCK');

      let maxRouteDays = 1;
      let routeDistance = 0;
      let routePoliceCount = 2;
      let routeSecurityCount = 1;

      // ── A. REGIONAL EXAM OFFICERS (One per region in route) ──
      for (const stop of stops) {
        const regionId = regions.find(r => r.name.toUpperCase() === stop.region_name.toUpperCase())?.id;
        if (!regionId) continue;

        // Find correct guideline with "via" logic
        const regionalGuidelines = guidelines.filter(g => g.region_id === regionId);
        let g = regionalGuidelines[0];
        if (regionalGuidelines.length > 1) {
          const viaMatch = regionalGuidelines.find(v => v.via && routeRegionNames.includes(v.via.toUpperCase()));
          if (viaMatch) g = viaMatch;
        }

        if (!g) continue;

        const stopDays = hasHeavyTruck ? (g.days_truck || 1) : (g.days_light || 1);
        const stopTransit = Math.max(0, Math.ceil(stopDays * 0.2));
        const stopDistance = Number(g.distance_km) || 0;

        if (stopDays > maxRouteDays) maxRouteDays = stopDays;
        if (stopDistance > routeDistance) routeDistance = stopDistance;

        // Update global personnel counts if guideline specifies higher
        const gPolice = hasHeavyTruck ? (g.police_truck || 2) : (g.police_light || 2);
        const gSecurity = hasHeavyTruck ? (g.security_truck || 1) : (g.security_light || 1);
        if (gPolice > routePoliceCount) routePoliceCount = gPolice;
        if (gSecurity > routeSecurityCount) routeSecurityCount = gSecurity;

        // Exam Officer for this region
        const eoQty = hasHeavyTruck ? (g.exam_officers_truck || 1) : (g.exam_officers_light || 1);
        const eoPosho = rates.exam_officer_rate || 0;
        const eoCost = eoPosho * eoQty * (stopDays + stopTransit);
        const eoNauli = rates.exam_officer_nauli || 0;

        // Unloading for this region
        const unloadingCost = (stop.boxes_count || 0) * (rates.unloading_rate_per_box || 0);

        const eoItem = createBaseItem(route.id, "personnel", "exam_officer");
        Object.assign(eoItem, {
          region_name: stop.region_name,
          quantity: eoQty,
          days: stopDays,
          transit_days: stopTransit,
          posho: eoPosho,
          allowance_per_day: eoPosho,
          unloading_cash: unloadingCost,
          item_quantity: stop.boxes_count || 0,
          unit_cost: rates.unloading_rate_per_box || 0,
          operational_total: unloadingCost,
          fare_return: eoNauli,
          total_cost: eoCost + unloadingCost + eoNauli
        });
        lineItems.push(eoItem);
        
        totalPersonnel += eoCost;
        totalUpakiaji += unloadingCost;
        totalNauli += eoNauli;
      }

      // ── B. DRIVERS (One row per vehicle) ──
      const transitDays = Math.max(0, Math.ceil(maxRouteDays * 0.2));

      for (const v of vehicles) {
        const driverRate = rates.driver_rate || 0;
        const driverCost = driverRate * (maxRouteDays + transitDays);
        
        const vehicleLabel = v.vehicle_type
          ? v.vehicle_type.toLowerCase().split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          : "Gari";

        const dItem = createBaseItem(route.id, "personnel", "driver");
        Object.assign(dItem, {
          vehicle_type: v.vehicle_type,
          vehicle_label: vehicleLabel,
          quantity: v.quantity || 1,
          days: maxRouteDays,
          transit_days: transitDays,
          posho: driverRate,
          allowance_per_day: driverRate,
          total_cost: driverCost
        });
        lineItems.push(dItem);
        totalPersonnel += driverCost;
      }

      // ── C. VEHICLES / FUEL (One row per vehicle for fuel & emergency) ──
      for (const v of vehicles) {
        const isTruck = v.vehicle_type === 'TRUCK_AND_TRAILER' || v.vehicle_type === 'STANDARD_TRUCK';
        
        // Fuel
        let consumption = rates.fuel_consumption_tt || 1;
        if (v.vehicle_type === "STANDARD_TRUCK") consumption = rates.fuel_consumption_truck || 1;
        if (v.vehicle_type === "ESCORT_VEHICLE") consumption = rates.fuel_consumption_escort || 1;

        const fuelLiters = Math.round((routeDistance / consumption) * (v.quantity || 1));
        const fuelCost = Math.round(fuelLiters * (rates.fuel_price_per_liter || 0));

        // Emergency
        const emergencyRate = isTruck ? (rates.emergency_tt || 0) : (rates.emergency_standard || 0);
        const emergencyTotal = emergencyRate * (v.quantity || 1);

        const vehicleLabel = v.vehicle_type
          ? v.vehicle_type.toLowerCase().split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          : "Gari";

        const fItem = createBaseItem(route.id, "fuel", "fuel");
        Object.assign(fItem, {
          vehicle_type: v.vehicle_type,
          vehicle_label: vehicleLabel,
          quantity: v.quantity || 1,
          distance_km: routeDistance,
          fuel_liters: fuelLiters,
          fuel_cost: fuelCost,
          emergency_allowance: emergencyTotal,
          total_cost: fuelCost + emergencyTotal
        });
        lineItems.push(fItem);

        totalFuel += fuelCost;
        totalTahadhari += emergencyTotal;
      }

      // ── D. GLOBAL PERSONNEL (Police & Security) ──
      // Police
      for (let p = 0; p < routePoliceCount; p++) {
        const pPosho = rates.police_rate || 0;
        const pCost = pPosho * (maxRouteDays + transitDays);
        const pItem = createBaseItem(route.id, "personnel", "police_officer");
        Object.assign(pItem, {
          quantity: 1,
          days: maxRouteDays,
          transit_days: transitDays,
          posho: pPosho,
          allowance_per_day: pPosho,
          total_cost: pCost
        });
        lineItems.push(pItem);
        totalPersonnel += pCost;
      }

      // Security
      for (let s = 0; s < routeSecurityCount; s++) {
        const sPosho = rates.security_rate || 0;
        const sCost = sPosho * (maxRouteDays + transitDays);
        const sItem = createBaseItem(route.id, "personnel", "security_officer");
        Object.assign(sItem, {
          quantity: 1,
          days: maxRouteDays,
          transit_days: transitDays,
          posho: sPosho,
          allowance_per_day: sPosho,
          total_cost: sCost
        });
        lineItems.push(sItem);
        totalPersonnel += sCost;
      }
    }

    // 6. Bulk Insert Line Items
    if (lineItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("transportation_template_line_items")
        .insert(lineItems);
      if (itemsError) throw itemsError;
    }

    // 7. Update Version Totals
    const grandTotal = totalPersonnel + totalFuel + totalUpakiaji + totalTahadhari + totalNauli;

    await supabase
      .from("transportation_template_versions")
      .update({
        grand_total: grandTotal,
        total_personnel: totalPersonnel,
        total_fuel: totalFuel,
        total_upakiaji: totalUpakiaji,
        total_tahadhari: totalTahadhari,
        total_nauli: totalNauli,
      })
      .eq("id", version.id);

    return { success: true, versionId: version.id };
  } catch (error: any) {
    console.error("Template Generation Error:", error);
    return { success: false, error: error.message };
  }
};

export const appendChangeLog = async (
  versionId: string,
  message: string,
  userId: string
) => {
  await supabase.from("transportation_template_change_logs").insert({
    version_id: versionId,
    message,
    created_by: userId,
  });
};