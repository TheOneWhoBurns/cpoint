import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
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
		.where(eq(operators.id, operatorId));

	if (!operator) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	const valid = await verifyPasscode(passcode, operator.passcode);
	if (!valid) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	return json({ success: true });
};
