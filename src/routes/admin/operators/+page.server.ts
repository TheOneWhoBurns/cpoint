import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const allOperators = await db.select().from(operators);
	return { operators: allOperators };
};
