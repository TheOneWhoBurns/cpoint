import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { rentals, trackedItems, genericItems, productTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const types = await db.select().from(productTypes).where(eq(productTypes.isActive, true));
	const tracked = await db.select().from(trackedItems).where(eq(trackedItems.status, 'available'));
	const generic = await db.select().from(genericItems);
	const allRentals = await db.select().from(rentals);

	return { types, trackedItems: tracked, genericItems: generic, rentals: allRentals };
};
