import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { productTypes } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const types = await db.select().from(productTypes);
	return { types };
};
