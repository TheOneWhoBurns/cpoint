import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { rentals, trackedItems, productTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const categories = await db.select().from(productTypes).where(eq(productTypes.isActive, true));
	const availableTracked = await db.select().from(trackedItems).where(eq(trackedItems.status, 'available'));
	const allRentals = await db.select().from(rentals);

	return { categories, trackedItems: availableTracked, rentals: allRentals };
};
