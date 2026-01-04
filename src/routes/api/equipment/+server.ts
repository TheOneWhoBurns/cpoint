import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { productTypes, trackedItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const categories = await db.select().from(productTypes);
	const tracked = await db.select().from(trackedItems);
	return json({ categories, trackedItems: tracked });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { action } = body;

	if (action === 'createCategory') {
		const { name, trackingType } = body;
		if (!name || !trackingType) {
			return json({ error: 'Name and trackingType required' }, { status: 400 });
		}
		if (!['tracked', 'generic'].includes(trackingType)) {
			return json({ error: 'trackingType must be tracked or generic' }, { status: 400 });
		}
		const [created] = await db
			.insert(productTypes)
			.values({
				name,
				trackingType,
				totalQuantity: 0,
				availableQuantity: 0
			})
			.returning();
		return json(created, { status: 201 });
	}

	if (action === 'addTrackedItem') {
		const { categoryId, code } = body;
		if (!categoryId || !code) {
			return json({ error: 'categoryId and code required' }, { status: 400 });
		}
		const [cat] = await db.select().from(productTypes).where(eq(productTypes.id, categoryId));
		if (!cat || cat.trackingType !== 'tracked') {
			return json({ error: 'Category not found or not a tracked type' }, { status: 400 });
		}
		const [created] = await db
			.insert(trackedItems)
			.values({ productTypeId: categoryId, code, status: 'available' })
			.returning();
		return json(created, { status: 201 });
	}

	if (action === 'addGenericQuantity') {
		const { categoryId, quantity } = body;
		if (!categoryId || !quantity || quantity < 1) {
			return json({ error: 'categoryId and positive quantity required' }, { status: 400 });
		}
		const [cat] = await db.select().from(productTypes).where(eq(productTypes.id, categoryId));
		if (!cat || cat.trackingType !== 'generic') {
			return json({ error: 'Category not found or not a generic type' }, { status: 400 });
		}
		const [updated] = await db
			.update(productTypes)
			.set({
				totalQuantity: (cat.totalQuantity ?? 0) + quantity,
				availableQuantity: (cat.availableQuantity ?? 0) + quantity
			})
			.where(eq(productTypes.id, categoryId))
			.returning();
		return json(updated);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, isActive } = await request.json();
	if (!id) {
		return json({ error: 'ID required' }, { status: 400 });
	}
	const [updated] = await db
		.update(productTypes)
		.set({ isActive })
		.where(eq(productTypes.id, id))
		.returning();
	return json(updated);
};
