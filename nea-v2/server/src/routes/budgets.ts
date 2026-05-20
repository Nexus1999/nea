import { Router } from 'express';
import { db } from '../db';
import {
  budgets, budgetParticipants, transportRegionDemands, transportRoutes,
  transportRouteVehicles, transportRouteStops, transportRates, masterSummaries, regions
} from '../db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/budgets
router.get('/', requirePermission('budgets:view'), async (req, res) => {
  try {
    const data = await db.select({
      id: budgets.id,
      name: budgets.name,
      status: budgets.status,
      createdAt: budgets.createdAt,
      examination: masterSummaries.examination,
      code: masterSummaries.code,
      year: masterSummaries.year,
    })
    .from(budgets)
    .leftJoin(masterSummaries, eq(budgets.mid, masterSummaries.id))
    .orderBy(desc(budgets.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET /api/budgets/:id — full budget with transport details
router.get('/:id', requirePermission('budgets:view'), async (req, res) => {
  try {
    const id = req.params.id;
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    const participants = await db.select().from(budgetParticipants).where(eq(budgetParticipants.budgetId, id)).orderBy(asc(budgetParticipants.name));
    const demands = await db.select({ 
      id: transportRegionDemands.id, 
      boxesCount: transportRegionDemands.boxesCount,
      regionId: transportRegionDemands.regionId,
      regionName: regions.regionName
    }).from(transportRegionDemands).leftJoin(regions, eq(transportRegionDemands.regionId, regions.id)).where(eq(transportRegionDemands.budgetId, id));
    const routes = await db.select().from(transportRoutes).where(eq(transportRoutes.budgetId, id)).orderBy(asc(transportRoutes.name));
    const rates = await db.select().from(transportRates).where(eq(transportRates.budgetId, id)).limit(1);

    res.json({ budget, participants, demands, routes, rates: rates[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch budget details' });
  }
});

// POST /api/budgets
router.post('/', requirePermission('budgets:write'), async (req, res) => {
  try {
    const { name, mid, status } = req.body;
    const [created] = await db.insert(budgets).values({ name, mid, status, createdBy: req.user?.id }).returning();
    await auditLog({ tableName: 'budgets', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// PUT /api/budgets/:id/participants — replace participants
router.put('/:id/participants', requirePermission('budgets:write'), async (req, res) => {
  try {
    const id = req.params.id;
    const { participants } = req.body;
    await db.delete(budgetParticipants).where(eq(budgetParticipants.budgetId, id));
    if (participants?.length) {
      await db.insert(budgetParticipants).values(participants.map((p: any) => ({ ...p, budgetId: id })));
    }
    res.json({ message: 'Participants updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update participants' });
  }
});

// PUT /api/budgets/:id/demands — replace region box demands
router.put('/:id/demands', requirePermission('budgets:write'), async (req, res) => {
  try {
    const id = req.params.id;
    const { demands } = req.body;
    await db.delete(transportRegionDemands).where(eq(transportRegionDemands.budgetId, id));
    if (demands?.length) {
      await db.insert(transportRegionDemands).values(demands.map((d: any) => ({ ...d, budgetId: id })));
    }
    res.json({ message: 'Demands updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update demands' });
  }
});

// POST /api/budgets/:id/routes — add a route
router.post('/:id/routes', requirePermission('budgets:write'), async (req, res) => {
  try {
    const id = req.params.id;
    const { name, startingPoint, loadingDate, travelDate } = req.body;
    const [created] = await db.insert(transportRoutes).values({ budgetId: id, name, startingPoint, loadingDate, travelDate }).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// GET /api/budgets/routes/:routeId — route with stops & vehicles
router.get('/routes/:routeId', requirePermission('budgets:view'), async (req, res) => {
  try {
    const routeId = req.params.routeId;
    const [route] = await db.select().from(transportRoutes).where(eq(transportRoutes.id, routeId));
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const stops = await db.select({
      id: transportRouteStops.id,
      receivingPlace: transportRouteStops.receivingPlace,
      deliveryDate: transportRouteStops.deliveryDate,
      boxesCount: transportRouteStops.boxesCount,
      stopOrder: transportRouteStops.stopOrder,
      regionName: regions.regionName,
    }).from(transportRouteStops).leftJoin(regions, eq(transportRouteStops.regionId, regions.id)).where(eq(transportRouteStops.routeId, routeId)).orderBy(asc(transportRouteStops.stopOrder));

    const vehicles = await db.select().from(transportRouteVehicles).where(eq(transportRouteVehicles.routeId, routeId));

    res.json({ route, stops, vehicles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch route details' });
  }
});

// PUT /api/budgets/:id/rates — upsert transport rates
router.put('/:id/rates', requirePermission('budgets:write'), async (req, res) => {
  try {
    const id = req.params.id;
    const { dailyAllowance, fuelRatePerKm, escortDailyRate } = req.body;
    await db.delete(transportRates).where(eq(transportRates.budgetId, id));
    const [created] = await db.insert(transportRates).values({ budgetId: id, dailyAllowance, fuelRatePerKm, escortDailyRate }).returning();
    res.json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rates' });
  }
});

export default router;
