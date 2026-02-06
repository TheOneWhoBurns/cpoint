import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyPasscode, checkRateLimit, clearRateLimit, logAuthFailure } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const clientIp = getClientAddress();
	const rateCheck = await checkRateLimit(`operator-verify:${clientIp}`);
	if (!rateCheck.allowed) {
		return json(
			{ error: 'Too many attempts. Try again later.' },
			{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
		);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { operatorId, passcode } = body;

	if (!operatorId || !passcode) {
		return json({ error: 'Operator ID and passcode required' }, { status: 400 });
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));

	if (!operator) {
		logAuthFailure('/api/operators/verify', String(operatorId), clientIp);
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	const valid = await verifyPasscode(passcode, operator.passcode);
	if (!valid) {
		logAuthFailure('/api/operators/verify', String(operatorId), clientIp);
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	await clearRateLimit(`operator-verify:${clientIp}`);

	return json({ success: true });
};
