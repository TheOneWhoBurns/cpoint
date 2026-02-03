import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const allOperators = await db
		.select({
			id: operators.id,
			name: operators.name,
			isActive: operators.isActive,
			isAdmin: operators.isAdmin,
			createdAt: operators.createdAt
		})
		.from(operators);

	return json(allOperators);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, passcode, isAdmin } = await request.json();

	if (!name || !passcode) {
		return json({ error: 'Name and passcode required' }, { status: 400 });
	}

	if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
		return json({ error: 'Passcode must be exactly 4 digits' }, { status: 400 });
	}

	const hashedPasscode = await hashPasscode(passcode);

	const [newOperator] = await db
		.insert(operators)
		.values({ name, passcode: hashedPasscode, isAdmin: isAdmin || false })
		.returning({
			id: operators.id,
			name: operators.name,
			isActive: operators.isActive,
			isAdmin: operators.isAdmin,
			createdAt: operators.createdAt
		});

	return json(newOperator, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, isActive, isAdmin } = await request.json();

	if (!id) {
		return json({ error: 'Operator ID required' }, { status: 400 });
	}

	const updateData: Record<string, unknown> = {};
	if (isActive !== undefined) updateData.isActive = isActive;
	if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

	if (Object.keys(updateData).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	const [updated] = await db
		.update(operators)
		.set(updateData)
		.where(eq(operators.id, id))
		.returning({
			id: operators.id,
			name: operators.name,
			isActive: operators.isActive,
			isAdmin: operators.isAdmin
		});

	if (!updated) {
		return json({ error: 'Operator not found' }, { status: 404 });
	}

	return json(updated);
};
