import { pgTable, serial, text, boolean, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';

export const operators = pgTable('operators', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	passcode: text('passcode').notNull(),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const shifts = pgTable('shifts', {
	id: serial('id').primaryKey(),
	operatorId: integer('operator_id').references(() => operators.id),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
	endedAt: timestamp('ended_at', { withTimezone: true }),
	summary: jsonb('summary'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const productTypes = pgTable('product_types', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	codePrefix: text('code_prefix').notNull(),
	trackingType: text('tracking_type').notNull(),
	pricing: jsonb('pricing').notNull(),
	attributes: jsonb('attributes'),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const trackedItems = pgTable('tracked_items', {
	id: serial('id').primaryKey(),
	productTypeId: integer('product_type_id').references(() => productTypes.id),
	code: text('code').unique().notNull(),
	status: text('status').default('available'),
	attributes: jsonb('attributes'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => [
	index('idx_tracked_items_status').on(table.status),
	index('idx_tracked_items_product').on(table.productTypeId)
]);

export const genericItems = pgTable('generic_items', {
	id: serial('id').primaryKey(),
	productTypeId: integer('product_type_id').references(() => productTypes.id),
	name: text('name').notNull(),
	totalQuantity: integer('total_quantity').notNull(),
	availableQuantity: integer('available_quantity').notNull(),
	attributes: jsonb('attributes'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const rentals = pgTable('rentals', {
	id: serial('id').primaryKey(),
	shiftId: integer('shift_id').references(() => shifts.id),
	status: text('status').notNull().default('active'),
	customer: jsonb('customer'),
	items: jsonb('items').notNull(),
	pricing: jsonb('pricing').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
	expectedReturnAt: timestamp('expected_return_at', { withTimezone: true }),
	returnedAt: timestamp('returned_at', { withTimezone: true }),
	returnNotes: text('return_notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
	index('idx_rentals_status').on(table.status),
	index('idx_rentals_shift').on(table.shiftId),
	index('idx_rentals_dates').on(table.startedAt, table.returnedAt)
]);

export const equipmentBlocks = pgTable('equipment_blocks', {
	id: serial('id').primaryKey(),
	trackedItemId: integer('tracked_item_id').references(() => trackedItems.id),
	reason: text('reason').notNull(),
	blockedFrom: timestamp('blocked_from', { withTimezone: true }).notNull(),
	blockedUntil: timestamp('blocked_until', { withTimezone: true }).notNull(),
	notes: text('notes'),
	createdBy: integer('created_by').references(() => operators.id),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const actionLog = pgTable('action_log', {
	id: serial('id').primaryKey(),
	shiftId: integer('shift_id').references(() => shifts.id),
	actionType: text('action_type').notNull(),
	entityType: text('entity_type').notNull(),
	entityId: integer('entity_id').notNull(),
	details: jsonb('details'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
	index('idx_action_log_created').on(table.createdAt),
	index('idx_action_log_type').on(table.actionType)
]);

export type Operator = typeof operators.$inferSelect;
export type NewOperator = typeof operators.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type ProductType = typeof productTypes.$inferSelect;
export type NewProductType = typeof productTypes.$inferInsert;
export type TrackedItem = typeof trackedItems.$inferSelect;
export type NewTrackedItem = typeof trackedItems.$inferInsert;
export type GenericItem = typeof genericItems.$inferSelect;
export type NewGenericItem = typeof genericItems.$inferInsert;
export type Rental = typeof rentals.$inferSelect;
export type NewRental = typeof rentals.$inferInsert;
export type EquipmentBlock = typeof equipmentBlocks.$inferSelect;
export type NewEquipmentBlock = typeof equipmentBlocks.$inferInsert;
export type ActionLogEntry = typeof actionLog.$inferSelect;
export type NewActionLogEntry = typeof actionLog.$inferInsert;
