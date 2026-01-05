import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentals, trackedItems, productTypes, rentalProducts, guides, payments } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { productId, customer, items, rentalType, quantity = 1, shiftId, guideId = null } = await request.json();

	if (!productId) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	if (!customer || !customer.name) {
		return json({ error: 'Customer name required' }, { status: 400 });
	}

	if (!items || items.length === 0) {
		return json({ error: 'At least one item required' }, { status: 400 });
	}

	if (!rentalType || !['hourly', 'fullDay'].includes(rentalType)) {
		return json({ error: 'Valid rental type required' }, { status: 400 });
	}

	const [product] = await db.select().from(rentalProducts).where(eq(rentalProducts.id, productId));
	if (!product) {
		return json({ error: 'Product not found' }, { status: 404 });
	}

	if (guideId) {
		const [guide] = await db.select().from(guides).where(eq(guides.id, guideId));
		if (!guide) {
			return json({ error: 'Guide not found' }, { status: 404 });
		}

		const [lastRental] = await db
			.select()
			.from(rentals)
			.where(eq(rentals.guideId, guideId))
			.orderBy(desc(rentals.returnedAt))
			.limit(1);

		if (lastRental && lastRental.returnedAt) {
			const returnTime = new Date(lastRental.returnedAt).getTime();
			const cooldownMs = (guide.cooldownMinutes ?? 30) * 60 * 1000;
			const now = Date.now();

			if (now < returnTime + cooldownMs) {
				const minutesLeft = Math.ceil((returnTime + cooldownMs - now) / 60000);
				return json({ error: `Guide is on cooldown for ${minutesLeft} more minute(s)` }, { status: 400 });
			}
		}
	}

	for (const item of items) {
		if (item.type === 'tracked') {
			const [tracked] = await db.select().from(trackedItems).where(eq(trackedItems.id, item.itemId));
			if (!tracked || tracked.status !== 'available') {
				return json({ error: `Item ${item.code || item.itemId} is no longer available` }, { status: 400 });
			}
		} else if (item.type === 'generic') {
			const [cat] = await db.select().from(productTypes).where(eq(productTypes.id, item.categoryId));
			if (!cat) {
				return json({ error: `Category not found` }, { status: 400 });
			}
			if ((cat.availableQuantity ?? 0) < (item.quantity || 1)) {
				return json({ error: `Not enough ${cat.name} available (need ${item.quantity}, have ${cat.availableQuantity})` }, { status: 400 });
			}
		}
	}

	for (const item of items) {
		if (item.type === 'tracked') {
			await db
				.update(trackedItems)
				.set({ status: 'rented' })
				.where(eq(trackedItems.id, item.itemId));
		} else if (item.type === 'generic') {
			const [cat] = await db.select().from(productTypes).where(eq(productTypes.id, item.categoryId));
			if (cat) {
				await db
					.update(productTypes)
					.set({ availableQuantity: (cat.availableQuantity ?? 0) - (item.quantity || 1) })
					.where(eq(productTypes.id, item.categoryId));
			}
		}
	}

	const productPricing = product.pricing as { hourly?: number; fullDay?: number };

	const [created] = await db
		.insert(rentals)
		.values({
			shiftId,
			customer,
			items,
			pricing: {
				type: rentalType,
				hourly: productPricing.hourly,
				fullDay: productPricing.fullDay
			},
			quantity,
			guideId: guideId || null,
			status: 'active'
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, action, returnData, currentShiftId } = await request.json();

	if (!id) {
		return json({ error: 'Rental ID required' }, { status: 400 });
	}

	if (action === 'close') {
		const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
		if (!rental) {
			return json({ error: 'Rental not found' }, { status: 404 });
		}

		if (!currentShiftId) {
			return json({ error: 'Current shift ID required' }, { status: 400 });
		}

		const rentalItems = rental.items as Array<{type: string, itemId?: number, categoryId?: number, quantity?: number}>;
		const pricing = rental.pricing as {type: string, hourly?: number, fullDay?: number};

		let finalPrice = 0;

		if (pricing.type === 'fullDay') {
			finalPrice = pricing.fullDay || 0;
		} else if (pricing.type === 'hourly') {
			const startTime = new Date(rental.startedAt).getTime();
			const endTime = new Date().getTime();
			const diffMs = endTime - startTime;
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			const hourlyRate = pricing.hourly || 0;
			if (diffMinutes < 60) {
				finalPrice = hourlyRate;
			} else {
				const hours = Math.ceil(diffMinutes / 60);
				finalPrice = hourlyRate * hours;
			}
		}

		for (const item of rentalItems) {
			if (item.type === 'tracked' && item.itemId) {
				await db
					.update(trackedItems)
					.set({ status: 'available' })
					.where(eq(trackedItems.id, item.itemId));
			} else if (item.type === 'generic' && item.categoryId) {
				const [cat] = await db
					.select()
					.from(productTypes)
					.where(eq(productTypes.id, item.categoryId));
				if (cat) {
					const newAvailable = (cat.availableQuantity ?? 0) + (item.quantity || 1);
					await db
						.update(productTypes)
						.set({ availableQuantity: newAvailable })
						.where(eq(productTypes.id, item.categoryId));
				}
			}
		}

		const paymentMethod = returnData?.paymentMethod || 'cash';

		await db.insert(payments).values({
			shiftId: currentShiftId,
			rentalId: id,
			amount: finalPrice,
			method: paymentMethod
		});

		const [updated] = await db
			.update(rentals)
			.set({
				status: 'completed',
				returnedAt: new Date(),
				returnNotes: returnData ? JSON.stringify(returnData) : null,
				pricing: { ...pricing, finalPrice, total: finalPrice, paymentMethod }
			})
			.where(eq(rentals.id, id))
			.returning();

		return json(updated);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
