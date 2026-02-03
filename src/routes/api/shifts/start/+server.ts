import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators, shifts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
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

	if (!verifyPasscode(passcode, operator.passcode)) {
		return json({ error: 'Invalid passcode' }, { status: 401 });
	}

	const [existingShift] = await db
		.select()
		.from(shifts)
		.where(and(eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));

	let shift = existingShift;
	if (!existingShift) {
		const [newShift] = await db
			.insert(shifts)
			.values({
				operatorId
			})
			.returning();
		shift = newShift;
	}

	cookies.set('operatorId', String(operatorId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24
	});

	return json({ operator, shift });
};
