import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { closingChecklistItems } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const items = await db
		.select()
		.from(closingChecklistItems)
		.orderBy(asc(closingChecklistItems.sortOrder), asc(closingChecklistItems.id));
	return { checklistItems: items };
};
