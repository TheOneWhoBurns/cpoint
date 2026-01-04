import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { shifts, rentals } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { shiftId } = await request.json();

	if (!shiftId) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	const [shift] = await db
		.select()
		.from(shifts)
		.where(and(eq(shifts.id, shiftId), isNull(shifts.endedAt)));

	if (!shift) {
		return json({ error: 'Active shift not found' }, { status: 404 });
	}

	const shiftRentals = await db
		.select({
			count: sql<number>`count(*)`,
			revenue: sql<number>`coalesce(sum((pricing->>'total')::numeric), 0)`
		})
		.from(rentals)
		.where(eq(rentals.shiftId, shiftId));

	const summary = {
		rentalsCount: Number(shiftRentals[0]?.count) || 0,
		revenue: Number(shiftRentals[0]?.revenue) || 0
	};

	const [updatedShift] = await db
		.update(shifts)
		.set({
			endedAt: new Date(),
			summary
		})
		.where(eq(shifts.id, shiftId))
		.returning();

	return json({ shift: updatedShift, summary });
};
