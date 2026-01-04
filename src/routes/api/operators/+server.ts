import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const allOperators = await db
		.select({
			id: operators.id,
			name: operators.name,
			isActive: operators.isActive,
			createdAt: operators.createdAt
		})
		.from(operators);

	return json(allOperators);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, passcode } = await request.json();

	if (!name || !passcode) {
		return json({ error: 'Name and passcode required' }, { status: 400 });
	}

	if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
		return json({ error: 'Passcode must be exactly 4 digits' }, { status: 400 });
	}

	const [newOperator] = await db
		.insert(operators)
		.values({ name, passcode })
		.returning({
			id: operators.id,
			name: operators.name,
			isActive: operators.isActive,
			createdAt: operators.createdAt
		});

	return json(newOperator, { status: 201 });
};
