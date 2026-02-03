import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tourAgencyProducts } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const products = await db.select().from(tourAgencyProducts);
	return { tourProducts: products };
};
