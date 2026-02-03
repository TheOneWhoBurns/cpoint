import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tourBookings, tourAgencyProducts, operators } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const shiftIdStr = url.searchParams.get('shiftId');

	if (!shiftIdStr) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	const shiftId = parseInt(shiftIdStr);

	const bookings = await db
		.select({
			id: tourBookings.id,
			shiftId: tourBookings.shiftId,
			tourProductId: tourBookings.tourProductId,
			guideId: tourBookings.guideId,
			pax: tourBookings.pax,
			unitPrice: tourBookings.unitPrice,
			totalPrice: tourBookings.totalPrice,
			cost: tourBookings.cost,
			bookedAt: tourBookings.bookedAt,
			activityDate: tourBookings.activityDate,
			status: tourBookings.status,
			createdAt: tourBookings.createdAt,
			productName: tourAgencyProducts.name
		})
		.from(tourBookings)
		.leftJoin(tourAgencyProducts, eq(tourBookings.tourProductId, tourAgencyProducts.id))
		.where(eq(tourBookings.shiftId, shiftId));

	return json(bookings);
};

export const POST: RequestHandler = async ({ request }) => {
	const { shiftId, tourProductId, guideId, pax, bookedAt, activityDate } = await request.json();

	if (!shiftId) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	if (!tourProductId) {
		return json({ error: 'Tour product required' }, { status: 400 });
	}

	if (!pax || pax < 1) {
		return json({ error: 'Valid number of pax required' }, { status: 400 });
	}

	if (!bookedAt) {
		return json({ error: 'Booked at date required' }, { status: 400 });
	}

	if (!activityDate) {
		return json({ error: 'Activity date required' }, { status: 400 });
	}

	const [product] = await db
		.select()
		.from(tourAgencyProducts)
		.where(eq(tourAgencyProducts.id, tourProductId));

	if (!product) {
		return json({ error: 'Tour product not found' }, { status: 404 });
	}

	const unitPrice = product.price;
	const totalPrice = unitPrice * pax;

	const [booking] = await db
		.insert(tourBookings)
		.values({
			shiftId,
			tourProductId,
			guideId: guideId || null,
			pax,
			unitPrice,
			totalPrice,
			bookedAt: new Date(bookedAt),
			activityDate: new Date(activityDate)
		})
		.returning();

	return json(booking, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, action, cost, tourProductId, pax, activityDate, guideId } = await request.json();

	if (!id) {
		return json({ error: 'Booking ID required' }, { status: 400 });
	}

	if (action === 'close') {
		if (cost === undefined || cost < 0) {
			return json({ error: 'Valid cost required to close booking' }, { status: 400 });
		}

		const [updated] = await db
			.update(tourBookings)
			.set({
				cost: Math.round(cost * 100),
				status: 'completed'
			})
			.where(eq(tourBookings.id, id))
			.returning();

		return json(updated);
	}

	if (action === 'edit') {
		const [booking] = await db.select().from(tourBookings).where(eq(tourBookings.id, id));
		if (!booking) {
			return json({ error: 'Booking not found' }, { status: 404 });
		}

		const updates: Record<string, unknown> = {};

		if (tourProductId !== undefined) {
			const [product] = await db.select().from(tourAgencyProducts).where(eq(tourAgencyProducts.id, tourProductId));
			if (!product) {
				return json({ error: 'Tour product not found' }, { status: 404 });
			}
			updates.tourProductId = tourProductId;
			updates.unitPrice = product.price;
			updates.totalPrice = product.price * (pax ?? booking.pax);
		}

		if (pax !== undefined && pax >= 1) {
			updates.pax = pax;
			if (!tourProductId) {
				updates.totalPrice = booking.unitPrice * pax;
			}
		}

		if (activityDate !== undefined) {
			updates.activityDate = new Date(activityDate);
		}

		if (guideId !== undefined) {
			updates.guideId = guideId || null;
		}

		if (Object.keys(updates).length === 0) {
			return json({ error: 'No valid updates provided' }, { status: 400 });
		}

		const [updated] = await db
			.update(tourBookings)
			.set(updates)
			.where(eq(tourBookings.id, id))
			.returning();

		return json(updated);
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id, passcode } = await request.json();

	if (!id) {
		return json({ error: 'Booking ID required' }, { status: 400 });
	}

	if (!passcode) {
		return json({ error: 'Passcode required' }, { status: 400 });
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(eq(operators.passcode, passcode));

	if (!operator) {
		return json({ error: 'Invalid passcode' }, { status: 403 });
	}

	// Soft delete
	const [updated] = await db
		.update(tourBookings)
		.set({
			status: 'deleted',
			deletedAt: new Date()
		})
		.where(eq(tourBookings.id, id))
		.returning();

	return json(updated);
};
