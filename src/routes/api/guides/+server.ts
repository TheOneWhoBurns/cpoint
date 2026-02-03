import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { guides, rentals } from '$lib/server/db/schema';
import { eq, isNotNull, desc, sql } from 'drizzle-orm';
import { hashPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const allGuides = await db.select().from(guides).orderBy(guides.name);

	// Single query: get the most recent completed rental per guide (instead of N+1)
	const lastReturns = await db
		.select({
			guideId: rentals.guideId,
			returnedAt: sql<Date>`max(${rentals.returnedAt})`.as('last_returned')
		})
		.from(rentals)
		.where(isNotNull(rentals.returnedAt))
		.groupBy(rentals.guideId);

	const returnMap = new Map(lastReturns.map(r => [r.guideId, r.returnedAt]));

	const now = new Date();
	const guidesWithStatus = allGuides.map((guide) => {
		const lastReturnedAt = returnMap.get(guide.id) ?? null;

		let inCooldown = false;
		let minutesRemaining = 0;

		if (lastReturnedAt) {
			const cooldownEnd = new Date(lastReturnedAt);
			cooldownEnd.setMinutes(cooldownEnd.getMinutes() + (guide.cooldownMinutes ?? 30));
			inCooldown = now < cooldownEnd;
			minutesRemaining = inCooldown
				? Math.ceil((cooldownEnd.getTime() - now.getTime()) / 60000)
				: 0;
		}

		return {
			...guide,
			inCooldown,
			minutesRemaining,
			lastRentalEnd: lastReturnedAt
		};
	});

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

	const hashedPasscode = await hashPasscode(passcode);

	const [created] = await db
		.insert(guides)
		.values({
			name,
			passcode: hashedPasscode,
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
