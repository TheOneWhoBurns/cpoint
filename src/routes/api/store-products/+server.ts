import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storeProducts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const products = await db.select().from(storeProducts).orderBy(storeProducts.name);
	return json(products);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, category, price, cost, quantity } = await request.json();

	if (!name) {
		return json({ error: 'Product name required' }, { status: 400 });
	}

	if (price === undefined || price < 0) {
		return json({ error: 'Valid price required' }, { status: 400 });
	}

	if (cost !== undefined && cost !== null && cost < 0) {
		return json({ error: 'Valid cost required' }, { status: 400 });
	}

	const [created] = await db
		.insert(storeProducts)
		.values({
			name,
			category,
			price: Math.round(price * 100),
			cost: cost != null ? Math.round(cost * 100) : null,
			quantity: quantity || 0
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, quantity, isActive } = await request.json();

	if (!id) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	const updates: any = {};
	if (quantity !== undefined) updates.quantity = quantity;
	if (isActive !== undefined) updates.isActive = isActive;

	const [updated] = await db
		.update(storeProducts)
		.set(updates)
		.where(eq(storeProducts.id, id))
		.returning();

	return json(updated);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	if (!id) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	await db.delete(storeProducts).where(eq(storeProducts.id, id));

	return json({ success: true });
};
