import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { trackedItems, genericItems, productTypes } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const types = await db.select().from(productTypes);
	const tracked = await db.select().from(trackedItems);
	const generic = await db.select().from(genericItems);

	return { types, trackedItems: tracked, genericItems: generic };
};
