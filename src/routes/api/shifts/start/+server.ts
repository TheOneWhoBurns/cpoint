import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators, shifts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { operatorId, passcode } = await request.json();

	if (!operatorId || !passcode) {
		return json({ error: 'Operator ID and passcode required' }, { status: 400 });
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));

	if (!operator) {
		return json({ error: 'Operator not found' }, { status: 404 });
	}

	if (operator.passcode !== passcode) {
		return json({ error: 'Invalid passcode' }, { status: 401 });
	}

	const [existingShift] = await db
		.select()
		.from(shifts)
		.where(and(eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));

	if (existingShift) {
		return json({ shift: existingShift });
	}

	const [newShift] = await db
		.insert(shifts)
		.values({
			operatorId
		})
		.returning();

	return json({ shift: newShift });
};
