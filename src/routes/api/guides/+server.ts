import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { guides, rentals } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
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

	return json(guidesWithStatus);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, passcode, cooldownMinutes } = await request.json();

	if (!name) {
		return json({ error: 'Guide name required' }, { status: 400 });
	}

	if (!passcode || passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
		return json({ error: 'Passcode must be 4 digits' }, { status: 400 });
	}

	const [created] = await db
		.insert(guides)
		.values({
			name,
			passcode: hashPasscode(passcode),
			cooldownMinutes: cooldownMinutes || 30
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, cooldownMinutes, isActive } = await request.json();

	if (!id) {
		return json({ error: 'Guide ID required' }, { status: 400 });
	}

	const updates: any = {};
	if (cooldownMinutes !== undefined) updates.cooldownMinutes = cooldownMinutes;
	if (isActive !== undefined) updates.isActive = isActive;

	const [updated] = await db
		.update(guides)
		.set(updates)
		.where(eq(guides.id, id))
		.returning();

	return json(updated);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	if (!id) {
		return json({ error: 'Guide ID required' }, { status: 400 });
	}

	await db.delete(guides).where(eq(guides.id, id));

	return json({ success: true });
};
