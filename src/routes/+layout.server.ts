import { db } from '$lib/server/db';
import { operators, shifts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getVerifiedOperatorId } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const operatorId = getVerifiedOperatorId(cookies);

	if (!operatorId) {
		return { operator: null, shift: null };
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));

	if (!operator) {
		cookies.delete('operatorId', { path: '/' });
		return { operator: null, shift: null };
	}

	const [activeShift] = await db
		.select()
		.from(shifts)
		.where(and(eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));

	if (!activeShift) {
		cookies.delete('operatorId', { path: '/' });
		return { operator: null, shift: null };
	}

	const { passcode: _, ...safeOperator } = operator;
	return { operator: safeOperator, shift: activeShift };
};
