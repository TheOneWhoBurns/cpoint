import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { storeProducts } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const products = await db.select().from(storeProducts);
	return { storeProducts: products };
};
