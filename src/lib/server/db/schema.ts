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
	trackingType: text('tracking_type').notNull(),
	totalQuantity: integer('total_quantity').default(0),
	availableQuantity: integer('available_quantity').default(0),
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

export const guides = pgTable('guides', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	passcode: text('passcode').notNull(),
	cooldownMinutes: integer('cooldown_minutes').default(30),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const rentals = pgTable('rentals', {
	id: serial('id').primaryKey(),
	shiftId: integer('shift_id').references(() => shifts.id),
	status: text('status').notNull().default('active'),
	customer: jsonb('customer'),
	items: jsonb('items').notNull(),
	pricing: jsonb('pricing').notNull(),
	quantity: integer('quantity').default(1),
	guideId: integer('guide_id').references(() => guides.id),
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

export const rentalProducts = pgTable('rental_products', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	equipment: jsonb('equipment').notNull(),
	pricing: jsonb('pricing').notNull(),
	requiresGuide: boolean('requires_guide').default(false),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const storeProducts = pgTable('store_products', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	category: text('category'),
	price: integer('price').notNull(),
	quantity: integer('quantity').default(0),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const storeSales = pgTable('store_sales', {
	id: serial('id').primaryKey(),
	shiftId: integer('shift_id').references(() => shifts.id),
	productId: integer('product_id').references(() => storeProducts.id),
	quantity: integer('quantity').notNull(),
	unitPrice: integer('unit_price').notNull(),
	total: integer('total').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
	index('idx_store_sales_shift').on(table.shiftId)
]);

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

export const payments = pgTable('payments', {
	id: serial('id').primaryKey(),
	shiftId: integer('shift_id').references(() => shifts.id).notNull(),
	rentalId: integer('rental_id').references(() => rentals.id),
	storeSaleId: integer('store_sale_id').references(() => storeSales.id),
	amount: integer('amount').notNull(),
	method: text('method').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
	index('idx_payments_shift').on(table.shiftId),
	index('idx_payments_rental').on(table.rentalId)
]);

export type Operator = typeof operators.$inferSelect;
export type NewOperator = typeof operators.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type ProductType = typeof productTypes.$inferSelect;
export type NewProductType = typeof productTypes.$inferInsert;
export type TrackedItem = typeof trackedItems.$inferSelect;
export type NewTrackedItem = typeof trackedItems.$inferInsert;
export type Rental = typeof rentals.$inferSelect;
export type NewRental = typeof rentals.$inferInsert;
export type RentalProduct = typeof rentalProducts.$inferSelect;
export type NewRentalProduct = typeof rentalProducts.$inferInsert;
export type EquipmentBlock = typeof equipmentBlocks.$inferSelect;
export type NewEquipmentBlock = typeof equipmentBlocks.$inferInsert;
export type ActionLogEntry = typeof actionLog.$inferSelect;
export type NewActionLogEntry = typeof actionLog.$inferInsert;
export type Guide = typeof guides.$inferSelect;
export type NewGuide = typeof guides.$inferInsert;
export type StoreProduct = typeof storeProducts.$inferSelect;
export type NewStoreProduct = typeof storeProducts.$inferInsert;
export type StoreSale = typeof storeSales.$inferSelect;
export type NewStoreSale = typeof storeSales.$inferInsert;
export const appSettings = pgTable('app_settings', {
	id: serial('id').primaryKey(),
	key: text('key').unique().notNull(),
	value: jsonb('value'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
