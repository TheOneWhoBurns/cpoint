import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentals, trackedItems, genericItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const all = await db.select().from(rentals);
	return json(all);
};

export const POST: RequestHandler = async ({ request }) => {
	const { customer, items, pricing } = await request.json();

	if (!items || items.length === 0) {
		return json({ error: 'At least one item required' }, { status: 400 });
	}

	if (!pricing || (!pricing.hourly && !pricing.fullDay)) {
		return json({ error: 'Pricing required (hourly or fullDay)' }, { status: 400 });
	}

	for (const item of items) {
		if (item.type === 'tracked') {
			await db
				.update(trackedItems)
				.set({ status: 'rented' })
				.where(eq(trackedItems.id, item.itemId));
		} else if (item.type === 'generic') {
			const [existing] = await db
				.select()
				.from(genericItems)
				.where(eq(genericItems.id, item.itemId));
			if (existing) {
				const newAvailable = Math.max(0, existing.availableQuantity - (item.quantity || 1));
				await db
					.update(genericItems)
					.set({ availableQuantity: newAvailable })
					.where(eq(genericItems.id, item.itemId));
			}
		}
	}

	const [created] = await db
		.insert(rentals)
		.values({
			customer: customer || {},
			items,
			pricing,
			status: 'active'
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, action } = await request.json();

	if (!id) {
		return json({ error: 'Rental ID required' }, { status: 400 });
	}

	if (action === 'complete') {
		const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
		if (!rental) {
			return json({ error: 'Rental not found' }, { status: 404 });
		}

		const rentalItems = rental.items as Array<{type: string, itemId: number, quantity?: number}>;
		for (const item of rentalItems) {
			if (item.type === 'tracked') {
				await db
					.update(trackedItems)
					.set({ status: 'available' })
					.where(eq(trackedItems.id, item.itemId));
			} else if (item.type === 'generic') {
				const [existing] = await db
					.select()
					.from(genericItems)
					.where(eq(genericItems.id, item.itemId));
				if (existing) {
					const newAvailable = existing.availableQuantity + (item.quantity || 1);
					await db
						.update(genericItems)
						.set({ availableQuantity: newAvailable })
						.where(eq(genericItems.id, item.itemId));
				}
			}
		}

		const [updated] = await db
			.update(rentals)
			.set({ status: 'completed', returnedAt: new Date() })
			.where(eq(rentals.id, id))
			.returning();

		return json(updated);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
