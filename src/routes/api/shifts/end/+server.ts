import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { shifts, rentals, operators } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getVerifiedOperatorId } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const operatorId = getVerifiedOperatorId(cookies);
	if (!operatorId) {
		return json({ error: 'Not logged in' }, { status: 401 });
	}

	const [operator] = await db.select({ id: operators.id }).from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));
	if (!operator) {
		cookies.delete('operatorId', { path: '/' });
		return json({ error: 'Invalid session' }, { status: 401 });
	}

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

	if (shift.operatorId !== operatorId) {
		return json({ error: 'Cannot end another operator\'s shift' }, { status: 403 });
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
