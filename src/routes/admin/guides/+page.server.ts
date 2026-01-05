import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { guides, rentals } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allGuides = await db.select().from(guides).orderBy(guides.name);

	const guidesWithStatus = await Promise.all(
		allGuides.map(async (guide) => {
			const lastRentals = await db
				.select()
				.from(rentals)
				.where(eq(rentals.guideId, guide.id));

			const lastCompleted = lastRentals
				.filter(r => r.returnedAt)
				.sort((a, b) => new Date(b.returnedAt!).getTime() - new Date(a.returnedAt!).getTime())[0];

			let inCooldown = false;
			let minutesRemaining = 0;

			if (lastCompleted) {
				const cooldownEnd = new Date(lastCompleted.returnedAt!);
				cooldownEnd.setMinutes(cooldownEnd.getMinutes() + guide.cooldownMinutes);
				const now = new Date();
				inCooldown = now < cooldownEnd;
				minutesRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 60000);
			}

			return {
				...guide,
				inCooldown,
				minutesRemaining,
				lastRentalEnd: lastCompleted?.returnedAt || null
			};
		})
	);

	return { guides: guidesWithStatus };
};
