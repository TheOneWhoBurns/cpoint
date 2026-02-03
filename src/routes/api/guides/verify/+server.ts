import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { guides } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPasscode, checkRateLimit, clearRateLimit, logAuthFailure } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const clientIp = getClientAddress();
	const rateCheck = checkRateLimit(`guide-verify:${clientIp}`);
	if (!rateCheck.allowed) {
		return json(
			{ error: 'Too many attempts. Try again later.' },
			{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
		);
	}

	const { guideId, passcode } = await request.json();

	if (!guideId || !passcode) {
		return json({ error: 'Guide ID and passcode required' }, { status: 400 });
	}

	const [guide] = await db.select().from(guides).where(eq(guides.id, guideId));

	if (!guide) {
		logAuthFailure('/api/guides/verify', String(guideId), clientIp);
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	const valid = await verifyPasscode(passcode, guide.passcode);
	if (!valid) {
		logAuthFailure('/api/guides/verify', String(guideId), clientIp);
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	clearRateLimit(`guide-verify:${clientIp}`);

	return json({ success: true, guide });
};
