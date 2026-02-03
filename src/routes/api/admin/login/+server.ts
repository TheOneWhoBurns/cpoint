import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { operatorId, passcode } = await request.json();

	if (!operatorId || !passcode) {
		return json({ error: 'Operator ID and passcode required' }, { status: 400 });
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

	if (!operator) {
		return json({ error: 'Not an admin operator' }, { status: 403 });
	}

	if (operator.passcode !== passcode) {
		return json({ error: 'Invalid passcode' }, { status: 401 });
	}

	cookies.set('adminId', String(operator.id), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 // 24 hours
	});

	return json({ operator: { id: operator.id, name: operator.name } });
};
