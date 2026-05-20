import { pgTable, serial, integer, text, boolean, timestamp, jsonb, numeric, uuid, primaryKey, bigserial, date, index, foreignKey } from 'drizzle-orm/pg-core';

// --- REFERENCE ---
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  regionCode: integer('region_code').unique().notNull(),
  regionName: text('region_name').notNull(),
  postalAddress: text('postal_address'),
  town: text('town'),
  reo: text('reo'),
  reoEmail: text('reo_email'),
  reoPhone: text('reo_phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const institutions = pgTable('institutions', {
  id: serial('id').primaryKey(),
  centerNumber: text('center_number').unique().notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // primary, secondary, college
  category: text('category'), // government, private
  regionId: integer('region_id').references(() => regions.id, { onDelete: 'restrict' }),
  districtId: integer('district_id').references(() => districts.id, { onDelete: 'restrict' }),
  postalAddress: text('postal_address'),
  email: text('email'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const districts = pgTable('districts', {
  id: serial('id').primaryKey(),
  regionNumber: integer('region_number').references(() => regions.regionCode, { onDelete: 'cascade' }),
  districtNumber: integer('district_number'),
  districtName: text('district_name').notNull(),
  fullForm: text('full_form'),
  regionId: integer('region_id').references(() => regions.id, { onDelete: 'restrict' }), // Keep for compatibility if needed
  districtCode: integer('district_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const examinations = pgTable('examinations', {
  id: serial('id').primaryKey(),
  examination: text('examination').notNull(),
  code: text('code').unique().notNull(),
  level: text('level').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  subjectCode: text('subject_code').notNull(),
  subjectName: text('subject_name').notNull(),
  examCode: text('exam_code').references(() => examinations.code, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('active'),
  normalBookletMultiplier: numeric('normal_booklet_multiplier').default('1'),
  graphBookletMultiplier: numeric('graph_booklet_multiplier').default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const regionDistances = pgTable('region_distances', {
  id: serial('id').primaryKey(),
  fromRegionId: integer('from_region_id').references(() => regions.id).notNull(),
  toRegionId: integer('to_region_id').references(() => regions.id).notNull(),
  distanceKm: numeric('distance_km', { precision: 10, scale: 2 }).notNull(),
  via: text('via'),
});

export const transportDayGuidelines = pgTable('transport_day_guidelines', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  description: text('description'),
  days: integer('days').notNull(),
});

// --- SECURITY ---
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }));

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'),
  phoneNumber: text('phone_number'),
  dateOfBirth: text('date_of_birth'),
  roleId: uuid('role_id').references(() => roles.id),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastActivity: timestamp('last_activity', { withTimezone: true }).defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  actionType: text('action_type').notNull(),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  changedBy: uuid('changed_by').references(() => profiles.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
});

// --- MASTER SUMMARIES ---
export const masterSummaries = pgTable('master_summaries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  examination: text('examination').notNull(),
  code: text('code').references(() => examinations.code).notNull(),
  year: integer('year').notNull(),
  version: integer('version').default(1).notNull(),
  isLatest: boolean('is_latest').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const masterSummaryDetails = pgTable('master_summary_details', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  mid: integer('mid').references(() => masterSummaries.id, { onDelete: 'cascade' }).notNull(),
  regionId: integer('region_id').references(() => regions.id),
  districtId: integer('district_id').references(() => districts.id),
  centerName: text('center_name').notNull(),
  centerNumber: text('center_number').notNull(),
  medium: text('medium'),
  registered: integer('registered'),
  version: integer('version').notNull(),
  isLatest: boolean('is_latest').default(true).notNull(),
});

export const masterSummarySubjectCounts = pgTable('master_summary_subject_counts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  detailId: integer('detail_id').references(() => masterSummaryDetails.id, { onDelete: 'cascade' }).notNull(),
  subjectCode: text('subject_code').notNull(),
  count: integer('count').default(0).notNull(),
});

export const specialNeedsDetails = pgTable('special_needs_details', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  mid: integer('mid').references(() => masterSummaries.id, { onDelete: 'cascade' }).notNull(),
  detailId: integer('detail_id').references(() => masterSummaryDetails.id),
  specialNeed: text('special_need').notNull(),
  registered: integer('registered').default(0).notNull(),
});

// --- SUPERVISORS ---
export const supervisors = pgTable('supervisors', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  supervisorName: text('supervisor_name').notNull(),
  checkNumber: text('check_number').unique().notNull(),
  subject: text('subject'),
  districtId: integer('district_id').references(() => districts.id),
  workstation: text('workstation'),
  regionId: integer('region_id').references(() => regions.id),
  phone: text('phone'),
  accountName: text('account_name'),
  accountNumber: text('account_number'),
  bankName: text('bank_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const supervisions = pgTable('supervisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  mid: integer('mid').references(() => masterSummaries.id).notNull(),
  status: text('status').default('pending').notNull(),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const supervisorAssignments = pgTable('supervisor_assignments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  supervisionId: uuid('supervision_id').references(() => supervisions.id, { onDelete: 'cascade' }).notNull(),
  supervisorId: integer('supervisor_id').references(() => supervisors.id).notNull(),
  detailId: integer('detail_id').references(() => masterSummaryDetails.id),
  assignedBy: uuid('assigned_by').references(() => profiles.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
});

// --- TEACHERS ---
export const teachers = pgTable('teachers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  teacherName: text('teacher_name').notNull(),
  checkNumber: text('check_number').unique().notNull(),
  districtId: integer('district_id').references(() => districts.id),
  workstation: text('workstation'),
  indexNo: text('index_no'),
  cseeYear: text('csee_year'),
  phone: text('phone'),
  accountName: text('account_name'),
  accountNumber: text('account_number'),
  bankName: text('bank_name'),
  regionId: integer('region_id').references(() => regions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const jobAssignments = pgTable('job_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  section: text('section'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  totalRequired: integer('total_required').default(0).notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const teacherJobAssignments = pgTable('teacher_job_assignments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  jobId: uuid('job_id').references(() => jobAssignments.id, { onDelete: 'cascade' }).notNull(),
  teacherId: integer('teacher_id').references(() => teachers.id).notNull(),
});

// --- BUDGETS & TRANSPORTATION ---
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  mid: integer('mid').references(() => masterSummaries.id),
  status: text('status').default('draft').notNull(),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const budgetParticipants = pgTable('budget_participants', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  phone: text('phone'),
});

export const transportRegionDemands = pgTable('transport_region_demands', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }).notNull(),
  regionId: integer('region_id').references(() => regions.id).notNull(),
  boxesCount: integer('boxes_count').default(0).notNull(),
});

export const transportRoutes = pgTable('transport_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  startingPoint: text('starting_point').default('DAR ES SALAAM').notNull(),
  loadingDate: date('loading_date'),
  travelDate: date('travel_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const transportRouteVehicles = pgTable('transport_route_vehicles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  routeId: uuid('route_id').references(() => transportRoutes.id, { onDelete: 'cascade' }).notNull(),
  vehicleType: text('vehicle_type').notNull(),
  quantity: integer('quantity').default(1).notNull(),
});

export const transportRouteStops = pgTable('transport_route_stops', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  routeId: uuid('route_id').references(() => transportRoutes.id, { onDelete: 'cascade' }).notNull(),
  regionId: integer('region_id').references(() => regions.id),
  receivingPlace: text('receiving_place'),
  deliveryDate: date('delivery_date'),
  boxesCount: integer('boxes_count').default(0),
  stopOrder: integer('stop_order').notNull(),
});

export const transportRates = pgTable('transport_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }).unique().notNull(),
  dailyAllowance: numeric('daily_allowance', { precision: 12, scale: 2 }),
  fuelRatePerKm: numeric('fuel_rate_per_km', { precision: 12, scale: 2 }),
  escortDailyRate: numeric('escort_daily_rate', { precision: 12, scale: 2 }),
});

// --- STATIONERIES ---
export const stationeries = pgTable('stationeries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  mid: integer('mid').references(() => masterSummaries.id).unique().notNull(),
  status: text('status').default('Draft').notNull(),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const stationeryReoDeoExtras = pgTable('stationery_reo_deo_extras', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stationeryId: integer('stationery_id').references(() => stationeries.id, { onDelete: 'cascade' }).unique().notNull(),
  reoExtras: integer('reo_extras').default(0),
  deoExtras: integer('deo_extras').default(0),
});

export const stationeryBoxLimits = pgTable('stationery_box_limits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stationeryId: integer('stationery_id').references(() => stationeries.id, { onDelete: 'cascade' }).unique().notNull(),
  maxPerBox: integer('max_per_box').default(500),
});

export const stationeryMultipliers = pgTable('stationery_multipliers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stationeryId: integer('stationery_id').references(() => stationeries.id, { onDelete: 'cascade' }).notNull(),
  subjectCode: text('subject_code').notNull(),
  multiplier: numeric('multiplier', { precision: 5, scale: 2 }).default('1.0').notNull(),
});

export const stationeryCenterMultipliers = pgTable('stationery_center_multipliers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stationeryId: integer('stationery_id').references(() => stationeries.id, { onDelete: 'cascade' }).unique().notNull(),
  primaryMultiplier: numeric('primary_multiplier', { precision: 5, scale: 2 }).default('1.0'),
  secondaryMultiplier: numeric('secondary_multiplier', { precision: 5, scale: 2 }).default('1.0'),
  collegeMultiplier: numeric('college_multiplier', { precision: 5, scale: 2 }).default('1.0'),
});
