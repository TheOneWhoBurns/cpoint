import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const activeOperators = await db
		.select({
			id: operators.id,
			name: operators.name
		})
		.from(operators)
		.where(eq(operators.isActive, true));

	return {
		operators: activeOperators
	};
};
