import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentals, trackedItems, productTypes, rentalProducts, guides, payments, reservations, operators } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

interface ReservationItem {
	type: string;
	itemId?: number;
	categoryId?: number;
	code?: string;
	name: string;
	quantity?: number;
}

const MAX_ITEMS_PER_RENTAL = 50;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { productId, customer, items, rentalType, quantity = 1, shiftId, guideId = null, overrideReservationIds, operatorPasscode, overrideOperatorId, fromReservationId } = await request.json();

	if (!productId) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	if (!customer || typeof customer !== 'object' || !customer.name || typeof customer.name !== 'string') {
		return json({ error: 'Customer name required' }, { status: 400 });
	}

	if (!Array.isArray(items) || items.length === 0) {
		return json({ error: 'At least one item required' }, { status: 400 });
	}

	if (items.length > MAX_ITEMS_PER_RENTAL) {
		return json({ error: `Too many items (max ${MAX_ITEMS_PER_RENTAL})` }, { status: 400 });
	}

	// Validate item structure
	for (const item of items) {
		if (!item.type || !['tracked', 'generic'].includes(item.type)) {
			return json({ error: 'Each item must have a valid type' }, { status: 400 });
		}
		if (item.type === 'tracked' && (!item.itemId || typeof item.itemId !== 'number')) {
			return json({ error: 'Tracked items require a numeric itemId' }, { status: 400 });
		}
		if (item.type === 'generic' && (!item.categoryId || typeof item.categoryId !== 'number')) {
			return json({ error: 'Generic items require a numeric categoryId' }, { status: 400 });
		}
		if (item.quantity !== undefined) {
			const qty = Number(item.quantity);
			if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
				return json({ error: 'Item quantity must be an integer between 1 and 1000' }, { status: 400 });
			}
		}
	}

	if (!rentalType || !['hourly', 'fullDay'].includes(rentalType)) {
		return json({ error: 'Valid rental type required' }, { status: 400 });
	}

	const parsedQuantity = Number(quantity);
	if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 100) {
		return json({ error: 'Quantity must be an integer between 1 and 100' }, { status: 400 });
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

	// Check for reservation conflicts (unless fulfilling from a reservation or overriding)
	if (!fromReservationId) {
		const rentalTrackedIds = items
			.filter((i: ReservationItem) => i.type === 'tracked' && i.itemId)
			.map((i: ReservationItem) => i.itemId!);

		if (rentalTrackedIds.length > 0) {
			const activeReservations = await db
				.select()
				.from(reservations)
				.where(eq(reservations.status, 'active'));

			const now = new Date();
			const conflicts = [];

			for (const res of activeReservations) {
				const resItems = res.items as ReservationItem[];
				const resFrom = new Date(res.reservedFrom);
				const resUntil = new Date(res.reservedUntil);

				// A rental starting now conflicts if the reservation window overlaps with now
				if (now < resUntil && resFrom <= resUntil) {
					const resTrackedIds = resItems
						.filter(i => i.type === 'tracked' && i.itemId)
						.map(i => i.itemId!);

					const overlappingIds = rentalTrackedIds.filter((id: number) => resTrackedIds.includes(id));
					if (overlappingIds.length > 0) {
						// Check if this reservation is being overridden
						if (!overrideReservationIds || !overrideReservationIds.includes(res.id)) {
							conflicts.push({
								id: res.id,
								customer: res.customer,
								reason: res.reason,
								reservedFrom: res.reservedFrom,
								reservedUntil: res.reservedUntil,
								items: resItems.filter(i => i.itemId && overlappingIds.includes(i.itemId))
							});
						}
					}
				}
			}

			if (conflicts.length > 0) {
				// If override requested, verify passcode
				if (overrideReservationIds && operatorPasscode) {
					let overrideValid = false;

					if (overrideOperatorId) {
						const [op] = await db
							.select()
							.from(operators)
							.where(eq(operators.id, overrideOperatorId));
						if (op && op.isActive) {
							overrideValid = await verifyPasscode(operatorPasscode, op.passcode);
						}
					} else {
						const allOperators = await db
							.select()
							.from(operators)
							.where(eq(operators.isActive, true));
						for (const op of allOperators) {
							if (await verifyPasscode(operatorPasscode, op.passcode)) {
								overrideValid = true;
								break;
							}
						}
					}

					if (!overrideValid) {
						return json({ error: 'Invalid passcode for reservation override' }, { status: 403 });
					}
					// Passcode valid, continue with rental creation
				} else {
					return json({
						error: 'reservation_conflict',
						conflicts
					}, { status: 409 });
				}
			}
		}
	}

	// Run inventory check + claim + rental insert inside a transaction
	const result = await db.transaction(async (tx) => {
		// Validate and claim inventory atomically
		for (const item of items) {
			if (item.type === 'tracked') {
				const [tracked] = await tx.select().from(trackedItems).where(eq(trackedItems.id, item.itemId));
				if (!tracked || tracked.status !== 'available') {
					return { error: `Item ${item.code || item.itemId} is no longer available`, status: 400 };
				}
				await tx
					.update(trackedItems)
					.set({ status: 'rented' })
					.where(eq(trackedItems.id, item.itemId));
			} else if (item.type === 'generic') {
				const [cat] = await tx.select().from(productTypes).where(eq(productTypes.id, item.categoryId));
				if (!cat) {
					return { error: 'Category not found', status: 400 };
				}
				if ((cat.availableQuantity ?? 0) < (item.quantity || 1)) {
					return { error: `Not enough ${cat.name} available (need ${item.quantity}, have ${cat.availableQuantity})`, status: 400 };
				}
				await tx
					.update(productTypes)
					.set({ availableQuantity: (cat.availableQuantity ?? 0) - (item.quantity || 1) })
					.where(eq(productTypes.id, item.categoryId));
			}
		}

		const productPricing = product.pricing as { hourly?: number; fullDay?: number };

		const [created] = await tx
			.insert(rentals)
			.values({
				shiftId,
				customer: { name: String(customer.name), hotel: customer.hotel ? String(customer.hotel) : undefined, phone: customer.phone ? String(customer.phone) : undefined },
				items,
				pricing: {
					type: rentalType,
					hourly: productPricing.hourly,
					fullDay: productPricing.fullDay
				},
				quantity: parsedQuantity,
				guideId: guideId || null,
				status: 'active'
			})
			.returning();

		return { created };
	});

	if ('error' in result) {
		return json({ error: result.error }, { status: result.status });
	}

	// If fulfilling from a reservation, mark it as fulfilled (outside transaction is fine)
	if (fromReservationId) {
		await db
			.update(reservations)
			.set({
				status: 'fulfilled',
				fulfilledByRentalId: result.created.id
			})
			.where(eq(reservations.id, fromReservationId));
	}

	return json(result.created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { id, action, returnData, currentShiftId, customer, rentalType, notes, items: newItems, guideId: newGuideId } = body;

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
			items: rental.items,
			guideId: rental.guideId,
			pricing: { type: currentPricing.type },
			editedAt: null
		};

		// Build update object
		const updates: Record<string, unknown> = {};

		if (customer !== undefined) {
			updates.customer = customer;
		}

		// Handle item changes - release old items, claim new items
		if (newItems !== undefined && Array.isArray(newItems)) {
			if (newItems.length > MAX_ITEMS_PER_RENTAL) {
				return json({ error: `Too many items (max ${MAX_ITEMS_PER_RENTAL})` }, { status: 400 });
			}

			const oldItems = rental.items as Array<{type: string, itemId?: number, categoryId?: number, quantity?: number}>;
			const oldTrackedIds = new Set(oldItems.filter(i => i.type === 'tracked' && i.itemId).map(i => i.itemId));
			const newTrackedIds = new Set(newItems.filter((i: any) => i.type === 'tracked' && i.itemId).map((i: any) => i.itemId));

			const inventoryResult = await db.transaction(async (tx) => {
				for (const item of newItems) {
					if (item.type === 'tracked' && !oldTrackedIds.has(item.itemId)) {
						const [tracked] = await tx.select().from(trackedItems).where(eq(trackedItems.id, item.itemId));
						if (!tracked || tracked.status !== 'available') {
							return { error: `Item ${item.code || item.itemId} is no longer available`, status: 400 };
						}
					} else if (item.type === 'generic') {
						const oldGeneric = oldItems.find(i => i.type === 'generic' && i.categoryId === item.categoryId);
						const oldQty = oldGeneric?.quantity || 0;
						const newQty = item.quantity || 1;
						const additionalNeeded = newQty - oldQty;
						if (additionalNeeded > 0) {
							const [cat] = await tx.select().from(productTypes).where(eq(productTypes.id, item.categoryId));
							if (!cat) {
								return { error: 'Category not found', status: 400 };
							}
							if ((cat.availableQuantity ?? 0) < additionalNeeded) {
								return { error: `Not enough ${cat.name} available (need ${additionalNeeded} more, have ${cat.availableQuantity})`, status: 400 };
							}
						}
					}
				}

				for (const item of oldItems) {
					if (item.type === 'tracked' && item.itemId && !newTrackedIds.has(item.itemId)) {
						await tx.update(trackedItems).set({ status: 'available' }).where(eq(trackedItems.id, item.itemId));
					}
				}

				for (const item of newItems) {
					if (item.type === 'tracked' && item.itemId && !oldTrackedIds.has(item.itemId)) {
						await tx.update(trackedItems).set({ status: 'rented' }).where(eq(trackedItems.id, item.itemId));
					}
				}

				const oldGenericMap = new Map<number, number>();
				for (const item of oldItems) {
					if (item.type === 'generic' && item.categoryId) {
						oldGenericMap.set(item.categoryId, (oldGenericMap.get(item.categoryId) || 0) + (item.quantity || 1));
					}
				}
				const newGenericMap = new Map<number, number>();
				for (const item of newItems) {
					if (item.type === 'generic' && item.categoryId) {
						newGenericMap.set(item.categoryId, (newGenericMap.get(item.categoryId) || 0) + (item.quantity || 1));
					}
				}

				const allCategoryIds = new Set([...oldGenericMap.keys(), ...newGenericMap.keys()]);
				for (const catId of allCategoryIds) {
					const oldQty = oldGenericMap.get(catId) || 0;
					const newQty = newGenericMap.get(catId) || 0;
					const diff = newQty - oldQty;
					if (diff !== 0) {
						const [cat] = await tx.select().from(productTypes).where(eq(productTypes.id, catId));
						if (cat) {
							await tx.update(productTypes)
								.set({ availableQuantity: (cat.availableQuantity ?? 0) - diff })
								.where(eq(productTypes.id, catId));
						}
					}
				}

				return { success: true };
			});

			if ('error' in inventoryResult) {
				return json({ error: inventoryResult.error }, { status: inventoryResult.status });
			}

			updates.items = newItems;
		}

		// Handle guide change
		if (newGuideId !== undefined) {
			if (newGuideId !== null) {
				const [guide] = await db.select().from(guides).where(eq(guides.id, newGuideId));
				if (!guide) {
					return json({ error: 'Guide not found' }, { status: 404 });
				}
			}
			updates.guideId = newGuideId || null;
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
		// Charges in half-hour increments (minimum 1 half-hour), rounded to whole dollars
		let calculatedPrice = 0;
		if (pricing.type === 'fullDay') {
			calculatedPrice = Math.round(pricing.fullDay || 0);
		} else if (pricing.type === 'hourly') {
			const startTime = new Date(rental.startedAt).getTime();
			const endTime = new Date().getTime();
			const diffMs = endTime - startTime;
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			const hourlyRate = pricing.hourly || 0;
			const halfHours = Math.max(1, Math.ceil(diffMinutes / 30));
			calculatedPrice = Math.round((hourlyRate / 2) * halfHours);
		}

		const discount = Math.max(0, Math.min(Number(returnData?.discount) || 0, calculatedPrice));
		const serverFinalPrice = calculatedPrice - discount;
		const finalPrice = Math.max(0, serverFinalPrice);

		const cashAmount = Math.max(0, Number(returnData?.cashAmount) || 0);
		const creditAmount = Math.max(0, Number(returnData?.creditAmount) || 0);
		const yetToPay = Math.max(0, Number(returnData?.yetToPay) || 0);

		const totalPayment = cashAmount + creditAmount + yetToPay;
		if (Math.abs(totalPayment - finalPrice) > 0) {
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
