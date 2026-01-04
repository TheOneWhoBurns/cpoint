import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { productTypes, trackedItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const categories = await db.select().from(productTypes);
	const tracked = await db.select().from(trackedItems);
	return { categories, trackedItems: tracked };
};
