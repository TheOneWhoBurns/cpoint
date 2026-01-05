import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentalProducts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const all = await db.select().from(rentalProducts).orderBy(rentalProducts.createdAt);
	return json(all);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, equipment, pricing, requiresGuide } = await request.json();

	if (!name || !name.trim()) {
		return json({ error: 'Product name required' }, { status: 400 });
	}

	if (!equipment || equipment.length === 0) {
		return json({ error: 'At least one item required' }, { status: 400 });
	}

	if (!pricing || (!pricing.hourly && !pricing.fullDay)) {
		return json({ error: 'Pricing required (hourly or fullDay)' }, { status: 400 });
	}

	const [created] = await db
		.insert(rentalProducts)
		.values({
			name: name.trim(),
			equipment,
			pricing,
			requiresGuide: requiresGuide || false
		})
		.returning();

	return json(created, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	if (!id) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	const [deleted] = await db
		.select()
		.from(rentalProducts)
		.where(eq(rentalProducts.id, id));

	if (!deleted) {
		return json({ error: 'Product not found' }, { status: 404 });
	}

	await db.delete(rentalProducts).where(eq(rentalProducts.id, id));

	return json({ success: true });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, isActive, requiresGuide } = await request.json();

	if (!id) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	const updates: Record<string, any> = {};
	if (isActive !== undefined) updates.isActive = isActive;
	if (requiresGuide !== undefined) updates.requiresGuide = requiresGuide;

	const [updated] = await db
		.update(rentalProducts)
		.set(updates)
		.where(eq(rentalProducts.id, id))
		.returning();

	if (!updated) {
		return json({ error: 'Product not found' }, { status: 404 });
	}

	return json(updated);
};
