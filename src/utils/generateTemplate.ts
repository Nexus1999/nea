/**
 * generateTemplate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts Action Plan data into a versioned financial template.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";

export interface GenerateTemplateOptions {
  budgetId: string;
  currentVersionNum?: number;
  currentTemplateId?: string;
  userId: string;
  userEmail: string;
}

export interface LineItemRow {
  template_version_id: string;
  route_id: string;
  role: string;
  region_name?: string;
  vehicle_type?: string;
  quantity: number;
  days: number;
  transit_days: number;
  allowance_per_day: number;
  transit_rate_factor: number;
  posho: number;
  unloading_cash: number;
  emergency_allowance: number;
  fare_return: number;
  distance_km: number;
  fuel_liters: number;
  fuel_cost: number;
  unit_cost: number;
  item_quantity: number;
  operational_total: number;
  total_cost: number;
  notes: string;
  is_manually_edited: boolean;
}

function calcPostho(quantity: number, days: number, transitDays: number, rate: number, transitFactor: number): number {
  return quantity * (days * rate + transitDays * rate * transitFactor);
}

export async function generateTemplate({
  budgetId,
  currentVersionNum = 0,
  currentTemplateId,
  userId,
  userEmail,
}: GenerateTemplateOptions): Promise<{ success: boolean; error?: string }> {
  try {
    let { data: rates } = await supabase.from("transportation_rates").select("*").eq("budget_id", budgetId).maybeSingle();
    if (!rates) {
      const { data: newRates, error: rErr } = await supabase.from("transportation_rates").insert({ budget_id: budgetId }).select().single();
      if (rErr) throw new Error("Could not create default rates: " + rErr.message);
      rates = newRates;
    }

    const { data: routes, error: routeErr } = await supabase.from("transportation_routes").select(`*, transportation_route_stops (*), transportation_route_vehicles (*)`).eq("budget_id", budgetId);
    if (routeErr) throw routeErr;
    if (!routes || routes.length === 0) throw new Error("No routes found. Please build the Action Plan first.");

    const allRegionNames = [...new Set(routes.flatMap((r: any) => r.transportation_route_stops.map((s: any) => s.region_name)))];
    const { data: regionsData } = await supabase.from("regions").select("id, region_name").in("region_name", allRegionNames);
    const regionIdMap = new Map<string, number>((regionsData || []).map((r: any) => [r.region_name, r.id]));
    const { data: daysData } = await supabase.from("transportation_days_guideline").select("*").in("region_id", Array.from(regionIdMap.values())).eq("category", "EXAMS");
    const daysMap = new Map<number, any>((daysData || []).map((d: any) => [d.region_id, d]));
    const { data: faresData } = await supabase.from("transportation_fares").select("region_name, fare_amount").in("region_name", allRegionNames);
    const fareMap = new Map<string, number>((faresData || []).map((f: any) => [f.region_name, f.fare_amount]));

    let templateId = currentTemplateId;
    if (!templateId) {
      const { data: newTemplate, error: tErr } = await supabase.from("transportation_templates").insert({ budget_id: budgetId, status: "draft" }).select().single();
      if (tErr) throw tErr;
      templateId = newTemplate.id;
    }

    await supabase.from("transportation_template_versions").update({ is_current: false }).eq("template_id", templateId);
    const { data: version, error: vErr } = await supabase.from("transportation_template_versions").insert({
      template_id: templateId,
      version_num: currentVersionNum + 1,
      is_current: true,
      locked: false,
      label: `Auto-generated (${new Date().toLocaleDateString("sw-TZ")})`,
      rates_snapshot: rates,
      change_log: [],
    }).select().single();
    if (vErr) throw vErr;

    const lineItems: any[] = [];
    const totals = { personnel: 0, fuel: 0, upakiaji: 0, tahadhari: 0, nauli: 0, operational: 0 };

    for (const route of routes) {
      const stops = (route.transportation_route_stops || []).sort((a: any, b: any) => a.sequence_order - b.sequence_order);
      const lastStop = stops[stops.length - 1];
      const lastG = lastStop ? daysMap.get(regionIdMap.get(lastStop.region_name)!) : null;
      const rDays = lastG?.days_truck ?? 3;
      const rTransit = lastG?.transit_days ?? 1;

      // Police & Security
      const roles = [
        { role: 'police_officer', qty: lastG?.police_truck ?? 2, rate: rates.police_rate },
        { role: 'security_officer', qty: lastG?.security_truck ?? 1, rate: rates.security_rate }
      ];
      roles.forEach(r => {
        const posho = calcPostho(r.qty, rDays, rTransit, r.rate, rates.transit_rate_factor);
        lineItems.push({ template_version_id: version.id, route_id: route.id, role: r.role, quantity: r.qty, days: rDays, transit_days: rTransit, allowance_per_day: r.rate, transit_rate_factor: rates.transit_rate_factor, posho, total_cost: posho });
        totals.personnel += posho;
      });

      // Drivers & Fuel
      for (const v of route.transportation_route_vehicles) {
        const posho = calcPostho(v.quantity, rDays, rTransit, rates.driver_rate, rates.transit_rate_factor);
        const emergency = v.quantity * (v.vehicle_type === "TRUCK_AND_TRAILER" ? rates.emergency_tt : rates.emergency_standard);
        const consumption = v.vehicle_type === "TRUCK_AND_TRAILER" ? rates.fuel_consumption_tt : (v.vehicle_type === "STANDARD_TRUCK" ? rates.fuel_consumption_truck : rates.fuel_consumption_escort);
        const liters = (route.total_km || 0) / consumption;
        const fuelCost = liters * rates.fuel_price_per_liter;
        lineItems.push({ template_version_id: version.id, route_id: route.id, role: "driver", vehicle_type: v.vehicle_type, quantity: v.quantity, days: rDays, transit_days: rTransit, allowance_per_day: rates.driver_rate, transit_rate_factor: rates.transit_rate_factor, posho, emergency_allowance: emergency, distance_km: route.total_km || 0, fuel_liters: liters, fuel_cost: fuelCost, total_cost: posho + emergency + fuelCost });
        totals.personnel += posho; totals.tahadhari += emergency; totals.fuel += fuelCost;
      }

      // Exam Officers
      for (const stop of stops) {
        const g = daysMap.get(regionIdMap.get(stop.region_name)!);
        const posho = calcPostho(g?.exam_officers_truck ?? 1, g?.days_truck ?? 3, g?.transit_days ?? 2, rates.exam_officer_rate, rates.transit_rate_factor);
        const unloading = stop.boxes_count * rates.unloading_rate_per_box;
        const fare = fareMap.get(stop.region_name) ?? 0;
        lineItems.push({ template_version_id: version.id, route_id: route.id, role: "exam_officer", region_name: stop.region_name, quantity: g?.exam_officers_truck ?? 1, days: g?.days_truck ?? 3, transit_days: g?.transit_days ?? 2, allowance_per_day: rates.exam_officer_rate, transit_rate_factor: rates.transit_rate_factor, posho, unloading_cash: unloading, fare_return: fare, total_cost: posho + unloading + fare });
        totals.personnel += posho; totals.upakiaji += unloading; totals.nauli += fare;
      }

      // Operational
      const loadingTotal = rates.loading_vibarua_count * rates.loading_vibarua_rate;
      lineItems.push({ template_version_id: version.id, route_id: route.id, role: "loading", unit_cost: rates.loading_vibarua_rate, item_quantity: rates.loading_vibarua_count, operational_total: loadingTotal, total_cost: loadingTotal });
      lineItems.push({ template_version_id: version.id, route_id: route.id, role: "padlock", unit_cost: rates.padlock_set_cost, item_quantity: 1, operational_total: rates.padlock_set_cost, total_cost: rates.padlock_set_cost });
      totals.operational += loadingTotal + rates.padlock_set_cost;
    }

    await supabase.from("transportation_template_line_items").insert(lineItems);
    await supabase.from("transportation_template_versions").update({
      total_personnel: totals.personnel, total_fuel: totals.fuel, total_upakiaji: totals.upakiaji,
      total_tahadhari: totals.tahadhari, total_nauli: totals.nauli, total_operational: totals.operational,
      grand_total: totals.personnel + totals.fuel + totals.operational
    }).eq("id", version.id);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function appendChangeLog({ versionId, lineItemId, routeName, role, field, oldValue, newValue, userId, userEmail }: any) {
  const { data } = await supabase.from("transportation_template_versions").select("change_log").eq("id", versionId).single();
  const entry = { timestamp: new Date().toISOString(), user_id: userId, user_email: userEmail, line_item_id: lineItemId, route_name: routeName, role, field, old_value: oldValue, new_value: newValue };
  await supabase.from("transportation_template_versions").update({ change_log: [...(data?.change_log || []), entry] }).eq("id", versionId);
}