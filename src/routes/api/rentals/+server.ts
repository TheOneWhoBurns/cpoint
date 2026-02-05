import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentals, trackedItems, productTypes, rentalProducts, guides, payments, reservations, operators } from '$lib/server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { verifyPasscode } from '$lib/server/auth';
import { checkGuideCooldown } from '$lib/server/business/guide-cooldown';
import { findRentalReservationConflicts } from '$lib/server/business/reservations';
import { computeTrackedItemChanges, computeGenericDelta } from '$lib/server/business/inventory';
import { calculateRentalPrice, applyDiscount, validatePaymentSplit, buildClosePricing } from '$lib/server/business/pricing';
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
			const cooldown = checkGuideCooldown({
				lastReturnedAt: lastRental.returnedAt,
				cooldownMinutes: guide.cooldownMinutes ?? 30,
				now: new Date()
			});
			if (cooldown.onCooldown) {
				return json({ error: `Guide is on cooldown for ${cooldown.minutesLeft} more minute(s)` }, { status: 400 });
			}
		}
	}

	if (!fromReservationId) {
		const rentalTrackedIds = items
			.filter((i: ReservationItem) => i.type === 'tracked' && i.itemId)
			.map((i: ReservationItem) => i.itemId!);

		if (rentalTrackedIds.length > 0) {
			const activeReservations = await db
				.select()
				.from(reservations)
				.where(eq(reservations.status, 'active'));

			const conflicts = findRentalReservationConflicts({
				rentalTrackedIds,
				activeReservations: activeReservations.map(r => ({
					id: r.id,
					items: r.items as ReservationItem[],
					customer: r.customer as { name?: string } | null,
					reason: r.reason,
					reservedFrom: r.reservedFrom,
					reservedUntil: r.reservedUntil
				})),
				now: new Date(),
				overrideReservationIds
			});

			if (conflicts.length > 0) {
				if (overrideReservationIds && operatorPasscode) {
					if (!overrideOperatorId) {
						return json({ error: 'Operator ID required for reservation override' }, { status: 400 });
					}

					const [op] = await db
						.select()
						.from(operators)
						.where(and(eq(operators.id, overrideOperatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

					if (!op) {
						return json({ error: 'Operator not found or not authorized to override' }, { status: 403 });
					}

					const overrideValid = await verifyPasscode(operatorPasscode, op.passcode);
					if (!overrideValid) {
						return json({ error: 'Invalid passcode for reservation override' }, { status: 403 });
					}
				} else {
					return json({
						error: 'reservation_conflict',
						conflicts
					}, { status: 409 });
				}
			}
		}
	}

	const productPricing = product.pricing as { hourly?: number; fullDay?: number };

	const result = await db.transaction(async (tx) => {
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
					.set({ availableQuantity: sql`${productTypes.availableQuantity} - ${item.quantity || 1}` })
					.where(eq(productTypes.id, item.categoryId));
			}
		}

		const [rental] = await tx
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

		if (fromReservationId) {
			await tx
				.update(reservations)
				.set({
					status: 'fulfilled',
					fulfilledByRentalId: rental.id
				})
				.where(eq(reservations.id, fromReservationId));
		}

		return { rental };
	});

	if ('error' in result) {
		return json({ error: result.error }, { status: result.status });
	}

	return json(result.rental, { status: 201 });
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

		const currentPricing = rental.pricing as {type: string, hourly?: number, fullDay?: number, originalValues?: object};
		const originalValues = currentPricing.originalValues || {
			customer: rental.customer,
			items: rental.items,
			guideId: rental.guideId,
			pricing: { type: currentPricing.type },
			editedAt: null
		};

		const updates: Record<string, unknown> = {};

		if (customer !== undefined) {
			updates.customer = customer;
		}

		if (newItems !== undefined && Array.isArray(newItems)) {
			if (newItems.length > MAX_ITEMS_PER_RENTAL) {
				return json({ error: `Too many items (max ${MAX_ITEMS_PER_RENTAL})` }, { status: 400 });
			}

			const oldItems = rental.items as Array<{type: string, itemId?: number, categoryId?: number, quantity?: number}>;
			const { toRelease, toClaim } = computeTrackedItemChanges(oldItems, newItems);
			const genericDeltas = computeGenericDelta(oldItems, newItems);

			const inventoryResult = await db.transaction(async (tx) => {
				for (const itemId of toClaim) {
					const [tracked] = await tx.select().from(trackedItems).where(eq(trackedItems.id, itemId));
					if (!tracked || tracked.status !== 'available') {
						const item = newItems.find((i: any) => i.itemId === itemId);
						return { error: `Item ${item?.code || itemId} is no longer available`, status: 400 };
					}
				}

				for (const item of newItems) {
					if (item.type === 'generic') {
						const oldGeneric = oldItems.find(i => i.type === 'generic' && i.categoryId === item.categoryId);
						const additionalNeeded = (item.quantity || 1) - (oldGeneric?.quantity || 0);
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

				for (const itemId of toRelease) {
					await tx.update(trackedItems).set({ status: 'available' }).where(eq(trackedItems.id, itemId));
				}

				for (const itemId of toClaim) {
					await tx.update(trackedItems).set({ status: 'rented' }).where(eq(trackedItems.id, itemId));
				}

				for (const [catId, diff] of genericDeltas) {
					await tx.update(productTypes)
						.set({ availableQuantity: sql`${productTypes.availableQuantity} - ${diff}` })
						.where(eq(productTypes.id, catId));
				}

				return { success: true };
			});

			if ('error' in inventoryResult) {
				return json({ error: inventoryResult.error }, { status: inventoryResult.status });
			}

			updates.items = newItems;
		}

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

		const calculatedPrice = calculateRentalPrice({
			pricingType: pricing.type as 'hourly' | 'fullDay',
			hourlyRate: pricing.hourly || 0,
			fullDayRate: pricing.fullDay || 0,
			startTime: new Date(rental.startedAt),
			endTime: new Date()
		});

		const discountResult = applyDiscount(calculatedPrice, Number(returnData?.discount) || 0);
		const finalPrice = discountResult.finalPrice;

		const cashAmount = Math.max(0, Number(returnData?.cashAmount) || 0);
		const creditAmount = Math.max(0, Number(returnData?.creditAmount) || 0);
		const yetToPay = Math.max(0, Number(returnData?.yetToPay) || 0);

		const paymentCheck = validatePaymentSplit({ cashAmount, creditAmount, yetToPay, finalPrice });
		if (!paymentCheck.valid) {
			return json({ error: paymentCheck.error }, { status: 400 });
		}

		const updatedPricing = buildClosePricing({
			pricing,
			calculatedPrice,
			discount: discountResult.discount,
			finalPrice,
			cashAmount,
			creditAmount,
			yetToPay
		});

		const updated = await db.transaction(async (tx) => {
			for (const item of rentalItems) {
				if (item.type === 'tracked' && item.itemId) {
					await tx
						.update(trackedItems)
						.set({ status: 'available' })
						.where(eq(trackedItems.id, item.itemId));
				} else if (item.type === 'generic' && item.categoryId) {
					await tx
						.update(productTypes)
						.set({ availableQuantity: sql`${productTypes.availableQuantity} + ${item.quantity || 1}` })
						.where(eq(productTypes.id, item.categoryId));
				}
			}

			if (cashAmount > 0) {
				await tx.insert(payments).values({
					shiftId: currentShiftId,
					rentalId: id,
					amount: Math.round(cashAmount * 100),
					method: 'cash'
				});
			}
			if (creditAmount > 0) {
				await tx.insert(payments).values({
					shiftId: currentShiftId,
					rentalId: id,
					amount: Math.round(creditAmount * 100),
					method: 'credit'
				});
			}

			const [result] = await tx
				.update(rentals)
				.set({
					status: 'completed',
					returnedAt: new Date(),
					returnNotes: returnData ? JSON.stringify(returnData) : null,
					pricing: updatedPricing
				})
				.where(eq(rentals.id, id))
				.returning();

			return result;
		});

		return json(updated);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id, passcode } = await request.json();

	if (!id) {
		return json({ error: 'Rental ID required' }, { status: 400 });
	}

	if (!passcode) {
		return json({ error: 'Passcode required' }, { status: 400 });
	}

	// Verify passcode against any operator
	const [operator] = await db
		.select()
		.from(operators)
		.where(eq(operators.passcode, passcode));

	if (!operator) {
		return json({ error: 'Invalid passcode' }, { status: 403 });
	}

	const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
	if (!rental) {
		return json({ error: 'Rental not found' }, { status: 404 });
	}

	// Release equipment back to inventory if active
	if (rental.status === 'active') {
		const rentalItems = rental.items as Array<{type: string, itemId?: number, categoryId?: number, quantity?: number}>;
		for (const item of rentalItems) {
			if (item.type === 'tracked' && item.itemId) {
				await db
					.update(trackedItems)
					.set({ status: 'available' })
					.where(eq(trackedItems.id, item.itemId));
			} else if (item.type === 'generic' && item.categoryId) {
				const [cat] = await db.select().from(productTypes).where(eq(productTypes.id, item.categoryId));
				if (cat) {
					await db
						.update(productTypes)
						.set({ availableQuantity: (cat.availableQuantity ?? 0) + (item.quantity || 1) })
						.where(eq(productTypes.id, item.categoryId));
				}
			}
		}
	}

	// Soft delete - mark as deleted, set status to 'deleted'
	const [updated] = await db
		.update(rentals)
		.set({
			status: 'deleted',
			deletedAt: new Date()
		})
		.where(eq(rentals.id, id))
		.returning();

	return json(updated);
};
