import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { rentalProducts, trackedItems, productTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const categories = await db.select().from(productTypes).where(eq(productTypes.isActive, true));
	const allTracked = await db.select().from(trackedItems);
	const products = await db.select().from(rentalProducts);

	return { categories, trackedItems: allTracked, products };
};
