import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { guides } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPasscode } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { guideId, passcode } = await request.json();

	if (!guideId || !passcode) {
		return json({ error: 'Guide ID and passcode required' }, { status: 400 });
	}

	const [guide] = await db.select().from(guides).where(eq(guides.id, guideId));

	if (!guide) {
		return json({ error: 'Guide not found' }, { status: 404 });
	}

	if (!verifyPasscode(passcode, guide.passcode)) {
		return json({ error: 'Invalid passcode' }, { status: 401 });
	}

	return json({ success: true, guide });
};
