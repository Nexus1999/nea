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

    // 2. Fetch Rates
    const { data: rates, error: rError } = await supabase
      .from("transportation_rates")
      .select("*")
      .eq("budget_id", budgetId)
      .maybeSingle();
    if (rError) throw rError;
    if (!rates) throw new Error("Please configure budget rates first.");

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

    // 5. Process Each Route
    for (const route of routes) {
      const stops = route.transportation_route_stops || [];
      const vehicles = route.transportation_route_vehicles || [];

      // --- Duration calculation ---
      let durationDays = 1;
      let transitDays = 0;
      if (stops.length > 0) {
        const start = new Date(route.start_date);
        const endDates = stops
          .map((s: any) => new Date(s.delivery_date))
          .filter((d: Date) => !isNaN(d.getTime()));
        if (endDates.length > 0) {
          const maxEndTime = Math.max(...endDates.map((d: Date) => d.getTime()));
          const startTime = start.getTime();
          if (!isNaN(startTime) && !isNaN(maxEndTime)) {
            const totalDays =
              Math.ceil((maxEndTime - startTime) / (1000 * 60 * 60 * 24)) + 1;
            transitDays = Math.max(0, Math.ceil(totalDays * 0.2)); // 20% of trip as transit
            durationDays = Math.max(1, totalDays - transitDays);
          }
        }
      }

      // Total boxes for unloading
      const totalBoxes = stops.reduce(
        (sum: number, s: any) => sum + (s.boxes_count || 0),
        0
      );
      const unloadingCost = totalBoxes * (rates.unloading_rate_per_box || 0);

      // Region name from route (used to label the exam officer)
      const regionName: string = route.region_name || route.name || "";

      // ---------------------------------------------------------------
      // ROW ORDER PER ROUTE:
      //   1. Afisa Mitihani (exam_officer) — 1 per region, carries Upakuaji
      //   2. Askari Polisi   (police_officer) × 2 — two separate rows
      //   3. Afisa Usalama   (security_officer)
      //   4. Dereva(s)       (driver) — one row per vehicle, carries Tahadhari
      // ---------------------------------------------------------------

      // ── A. AFISA MITIHANI (exam officer) ──────────────────────────
      const examCost =
        (rates.exam_officer_rate || 0) * (durationDays + transitDays);
      const examNauli = rates.exam_officer_nauli || 0;
      lineItems.push({
        template_version_id: version.id,
        route_id: route.id,
        category: "personnel",
        role: "exam_officer",
        region_name: regionName,
        quantity: 1,
        days: durationDays,
        transit_days: transitDays,
        posho: rates.exam_officer_rate || 0,
        allowance_per_day: rates.exam_officer_rate || 0,
        // Upakuaji lives here
        unloading_cash: unloadingCost,
        item_quantity: totalBoxes,
        unit_cost: rates.unloading_rate_per_box || 0,
        operational_total: unloadingCost,
        fare_return: examNauli,
        total_cost: examCost + unloadingCost + examNauli,
        // unused for this role
        fuel_cost: 0,
        fuel_liters: 0,
        distance_km: 0,
        emergency_allowance: 0,
        transit_rate_factor: 0.5,
      });
      totalPersonnel += examCost;
      totalUpakiaji += unloadingCost;
      totalNauli += examNauli;

      // ── B. ASKARI POLISI — 2 individual rows ──────────────────────
      for (let p = 0; p < 2; p++) {
        const policeCost =
          (rates.police_rate || 0) * (durationDays + transitDays);
        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: "personnel",
          role: "police_officer",
          region_name: regionName,
          quantity: 1,
          days: durationDays,
          transit_days: transitDays,
          posho: rates.police_rate || 0,
          allowance_per_day: rates.police_rate || 0,
          total_cost: policeCost,
          unloading_cash: 0,
          item_quantity: 0,
          unit_cost: 0,
          operational_total: 0,
          fare_return: 0,
          fuel_cost: 0,
          fuel_liters: 0,
          distance_km: 0,
          emergency_allowance: 0,
          transit_rate_factor: 0.5,
        });
        totalPersonnel += policeCost;
      }

      // ── C. AFISA USALAMA (security officer) ───────────────────────
      const securityCost =
        (rates.security_rate || 0) * (durationDays + transitDays);
      lineItems.push({
        template_version_id: version.id,
        route_id: route.id,
        category: "personnel",
        role: "security_officer",
        region_name: regionName,
        quantity: 1,
        days: durationDays,
        transit_days: transitDays,
        posho: rates.security_rate || 0,
        allowance_per_day: rates.security_rate || 0,
        total_cost: securityCost,
        unloading_cash: 0,
        item_quantity: 0,
        unit_cost: 0,
        operational_total: 0,
        fare_return: 0,
        fuel_cost: 0,
        fuel_liters: 0,
        distance_km: 0,
        emergency_allowance: 0,
        transit_rate_factor: 0.5,
      });
      totalPersonnel += securityCost;

      // ── D. DRIVERS — one row per vehicle, each carries its Tahadhari ──
      for (const v of vehicles) {
        // Fuel
        let consumption = rates.fuel_consumption_tt || 1;
        if (v.vehicle_type === "STANDARD_TRUCK")
          consumption = rates.fuel_consumption_truck || 1;
        if (v.vehicle_type === "ESCORT_VEHICLE")
          consumption = rates.fuel_consumption_escort || 1;

        const estKm = route.estimated_km || 1200;
        const fuelLiters = Math.round((estKm / consumption) * (v.quantity || 1));
        const fuelCost = Math.round(
          fuelLiters * (rates.fuel_price_per_liter || 0)
        );

        // Tahadhari (emergency) for this vehicle
        const emergencyRate =
          v.vehicle_type === "TRUCK_AND_TRAILER"
            ? rates.emergency_tt || 0
            : rates.emergency_standard || 0;
        const emergencyTotal = emergencyRate * (v.quantity || 1);

        // Driver posho
        const driverCost =
          (rates.driver_rate || 0) * (durationDays + transitDays);

        // Friendly label for the vehicle
        const vehicleLabel = v.vehicle_type
          ? v.vehicle_type
              .toLowerCase()
              .split("_")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : "Gari";

        lineItems.push({
          template_version_id: version.id,
          route_id: route.id,
          category: "personnel",
          role: "driver",
          region_name: regionName,
          vehicle_type: v.vehicle_type,
          vehicle_label: vehicleLabel,
          quantity: v.quantity || 1,
          days: durationDays,
          transit_days: transitDays,
          posho: rates.driver_rate || 0,
          allowance_per_day: rates.driver_rate || 0,
          // Fuel columns
          distance_km: estKm,
          fuel_liters: fuelLiters,
          fuel_cost: fuelCost,
          // Tahadhari on this driver row
          emergency_allowance: emergencyTotal,
          total_cost: driverCost + fuelCost + emergencyTotal,
          // unused
          unloading_cash: 0,
          item_quantity: 0,
          unit_cost: 0,
          operational_total: 0,
          fare_return: 0,
          transit_rate_factor: 0.5,
        });

        totalPersonnel += driverCost;
        totalFuel += fuelCost;
        totalTahadhari += emergencyTotal;
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
    const grandTotal =
      totalPersonnel + totalFuel + totalUpakiaji + totalTahadhari + totalNauli;

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