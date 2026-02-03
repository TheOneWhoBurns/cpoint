import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reservations, rentals } from '$lib/server/db/schema';
import { eq, and, or, lte, gte } from 'drizzle-orm';
import type { RequestHandler } from './$types';

interface ReservationItem {
	type: string;
	itemId?: number;
	categoryId?: number;
	code?: string;
	name: string;
	quantity?: number;
}

export const GET: RequestHandler = async () => {
	const activeReservations = await db
		.select()
		.from(reservations)
		.where(eq(reservations.status, 'active'));

	return json(activeReservations);
};

export const POST: RequestHandler = async ({ request }) => {
	const { items, customer, reason, reservedFrom, reservedUntil, guideId, shiftId, createdBy } = await request.json();

	if (!items || items.length === 0) {
		return json({ error: 'At least one item required' }, { status: 400 });
	}

	if (!reservedFrom || !reservedUntil) {
		return json({ error: 'Reservation start and end times required' }, { status: 400 });
	}

	const from = new Date(reservedFrom);
	const until = new Date(reservedUntil);

	if (until <= from) {
		return json({ error: 'End time must be after start time' }, { status: 400 });
	}

	// Check for overlapping active reservations on the same tracked items
	const existingReservations = await db
		.select()
		.from(reservations)
		.where(eq(reservations.status, 'active'));

	const requestedTrackedIds = (items as ReservationItem[])
		.filter(i => i.type === 'tracked' && i.itemId)
		.map(i => i.itemId!);

	for (const existing of existingReservations) {
		const existingItems = existing.items as ReservationItem[];
		const existingFrom = new Date(existing.reservedFrom);
		const existingUntil = new Date(existing.reservedUntil);

		// Check time overlap
		if (from < existingUntil && until > existingFrom) {
			// Check item overlap
			const existingTrackedIds = existingItems
				.filter(i => i.type === 'tracked' && i.itemId)
				.map(i => i.itemId!);

			const overlap = requestedTrackedIds.filter(id => existingTrackedIds.includes(id));
			if (overlap.length > 0) {
				const existingCustomer = existing.customer as { name?: string } | null;
				return json({
					error: `Equipment conflict with existing reservation: ${existingCustomer?.name || existing.reason || `#${existing.id}`}`,
					conflictingReservation: existing
				}, { status: 409 });
			}
		}
	}

	const [created] = await db
		.insert(reservations)
		.values({
			shiftId: shiftId || null,
			status: 'active',
			items,
			customer: customer || null,
			guideId: guideId || null,
			reason: reason || null,
			reservedFrom: from,
			reservedUntil: until,
			createdBy: createdBy || null
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, action, rentalId } = await request.json();

	if (!id) {
		return json({ error: 'Reservation ID required' }, { status: 400 });
	}

	const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
	if (!reservation) {
		return json({ error: 'Reservation not found' }, { status: 404 });
	}

	if (reservation.status !== 'active') {
		return json({ error: 'Reservation is not active' }, { status: 400 });
	}

	if (action === 'cancel') {
		const [updated] = await db
			.update(reservations)
			.set({
				status: 'cancelled',
				cancelledAt: new Date()
			})
			.where(eq(reservations.id, id))
			.returning();

		return json(updated);
	}

	if (action === 'fulfill') {
		const [updated] = await db
			.update(reservations)
			.set({
				status: 'fulfilled',
				fulfilledByRentalId: rentalId || null
			})
			.where(eq(reservations.id, id))
			.returning();

		return json(updated);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
