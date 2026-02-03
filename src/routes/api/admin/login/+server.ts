import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { operatorId, passcode } = body;

	if (!operatorId || !passcode) {
		return json({ error: 'Operator ID and passcode required' }, { status: 400 });
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

	if (!operator) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	if (operator.passcode !== passcode) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	cookies.set('adminId', String(operator.id), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24
	});

	return json({ operator: { id: operator.id, name: operator.name } });
};
