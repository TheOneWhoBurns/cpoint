import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { productTypes, trackedItems, genericItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const types = await db.select().from(productTypes);
	const tracked = await db.select().from(trackedItems);
	const generic = await db.select().from(genericItems);
	return json({ types, tracked, generic });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { action } = body;

	if (action === 'createType') {
		const { name, codePrefix, trackingType } = body;
		if (!name || !trackingType || !codePrefix) {
			return json({ error: 'Name, codePrefix, and trackingType required' }, { status: 400 });
		}
		if (!['tracked', 'generic'].includes(trackingType)) {
			return json({ error: 'trackingType must be tracked or generic' }, { status: 400 });
		}
		const [created] = await db
			.insert(productTypes)
			.values({ name, codePrefix, trackingType })
			.returning();
		return json(created, { status: 201 });
	}

	if (action === 'addTracked') {
		const { productTypeId, code } = body;
		if (!productTypeId || !code) {
			return json({ error: 'productTypeId and code required' }, { status: 400 });
		}
		const [created] = await db
			.insert(trackedItems)
			.values({ productTypeId, code, status: 'available' })
			.returning();
		return json(created, { status: 201 });
	}

	if (action === 'addGeneric') {
		const { productTypeId, name, quantity } = body;
		if (!productTypeId || !name) {
			return json({ error: 'productTypeId and name required' }, { status: 400 });
		}
		const qty = quantity || 1;
		const [created] = await db
			.insert(genericItems)
			.values({ productTypeId, name, totalQuantity: qty, availableQuantity: qty })
			.returning();
		return json(created, { status: 201 });
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
