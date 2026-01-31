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
	const body = await request.json();
	const { id, action, returnData, currentShiftId, customer, rentalType, notes } = body;

	if (!id) {
		return json({ error: 'Rental ID required' }, { status: 400 });
	}

	if (action === 'edit') {
		const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
		if (!rental) {
			return json({ error: 'Rental not found' }, { status: 404 });
		}

		if (rental.status !== 'active') {
			return json({ error: 'Cannot edit a closed rental' }, { status: 400 });
		}

		// Store original values if not already stored
		const currentPricing = rental.pricing as {type: string, hourly?: number, fullDay?: number, originalValues?: object};
		const originalValues = currentPricing.originalValues || {
			customer: rental.customer,
			pricing: { type: currentPricing.type },
			editedAt: null
		};

		// Build update object
		const updates: Record<string, unknown> = {};

		if (customer !== undefined) {
			updates.customer = customer;
		}

		if (rentalType !== undefined && ['hourly', 'fullDay'].includes(rentalType)) {
			updates.pricing = {
				...currentPricing,
				type: rentalType,
				originalValues: {
					...originalValues,
					editedAt: new Date().toISOString()
				}
			};
		} else if (Object.keys(updates).length > 0) {
			// If any update but no pricing change, still track original values
			updates.pricing = {
				...currentPricing,
				originalValues: {
					...originalValues,
					editedAt: new Date().toISOString()
				}
			};
		}

		if (notes !== undefined) {
			updates.returnNotes = notes;
		}

		if (Object.keys(updates).length === 0) {
			return json({ error: 'No valid updates provided' }, { status: 400 });
		}

		const [updated] = await db
			.update(rentals)
			.set(updates)
			.where(eq(rentals.id, id))
			.returning();

		return json(updated);
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

		// Calculate price based on rental type and elapsed time
		let calculatedPrice = 0;
		if (pricing.type === 'fullDay') {
			calculatedPrice = pricing.fullDay || 0;
		} else if (pricing.type === 'hourly') {
			const startTime = new Date(rental.startedAt).getTime();
			const endTime = new Date().getTime();
			const diffMs = endTime - startTime;
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			const hourlyRate = pricing.hourly || 0;
			if (diffMinutes < 60) {
				calculatedPrice = hourlyRate;
			} else {
				const hours = Math.ceil(diffMinutes / 60);
				calculatedPrice = hourlyRate * hours;
			}
		}

		const discount = Math.max(0, Math.min(returnData?.discount || 0, calculatedPrice));
		const serverFinalPrice = calculatedPrice - discount;
		const finalPrice = Math.max(0, serverFinalPrice);

		const cashAmount = Math.max(0, returnData?.cashAmount ?? 0);
		const creditAmount = Math.max(0, returnData?.creditAmount ?? 0);
		const yetToPay = Math.max(0, returnData?.yetToPay || 0);

		const totalPayment = cashAmount + creditAmount + yetToPay;
		if (Math.abs(totalPayment - finalPrice) > 0.01) {
			return json({ error: 'Payment amounts do not match final price' }, { status: 400 });
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

		// Insert payment records for cash and credit separately if amounts > 0
		if (cashAmount > 0) {
			await db.insert(payments).values({
				shiftId: currentShiftId,
				rentalId: id,
				amount: Math.round(cashAmount * 100), // Convert to cents
				method: 'cash'
			});
		}
		if (creditAmount > 0) {
			await db.insert(payments).values({
				shiftId: currentShiftId,
				rentalId: id,
				amount: Math.round(creditAmount * 100), // Convert to cents
				method: 'credit'
			});
		}

		// Build updated pricing object with all payment details
		const updatedPricing = {
			...pricing,
			calculatedPrice,
			discount,
			finalPrice,
			total: finalPrice,
			cashPaid: cashAmount,
			creditPaid: creditAmount,
			yetToPay,
			paymentMethod: cashAmount > 0 && creditAmount > 0 ? 'split' : (creditAmount > 0 ? 'credit' : 'cash')
		};

		const [updated] = await db
			.update(rentals)
			.set({
				status: 'completed',
				returnedAt: new Date(),
				returnNotes: returnData ? JSON.stringify(returnData) : null,
				pricing: updatedPricing
			})
			.where(eq(rentals.id, id))
			.returning();

		return json(updated);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
