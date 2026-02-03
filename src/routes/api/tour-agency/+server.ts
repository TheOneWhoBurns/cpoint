import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tourAgencyProducts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const products = await db.select().from(tourAgencyProducts).orderBy(tourAgencyProducts.name);
	return json(products);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, requiresGuide, price } = await request.json();

	if (!name) {
		return json({ error: 'Product name required' }, { status: 400 });
	}

	if (price === undefined || price < 0) {
		return json({ error: 'Valid price required' }, { status: 400 });
	}

	const [created] = await db
		.insert(tourAgencyProducts)
		.values({
			name,
			requiresGuide: requiresGuide ?? false,
			price: Math.round(price * 100)
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, isActive } = await request.json();

	if (!id) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if (isActive !== undefined) updates.isActive = isActive;

	const [updated] = await db
		.update(tourAgencyProducts)
		.set(updates)
		.where(eq(tourAgencyProducts.id, id))
		.returning();

	return json(updated);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	if (!id) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	await db.delete(tourAgencyProducts).where(eq(tourAgencyProducts.id, id));

	return json({ success: true });
};
