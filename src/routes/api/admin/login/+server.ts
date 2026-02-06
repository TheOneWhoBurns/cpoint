import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators, adminSessions } from '$lib/server/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { verifyPasscode, generateSessionToken, checkRateLimit, clearRateLimit } from '$lib/server/auth';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

const SESSION_MAX_AGE = 60 * 60 * 24;

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const clientIp = getClientAddress();
	const rateCheck = await checkRateLimit(`admin-login:${clientIp}`);
	if (!rateCheck.allowed) {
		return json(
			{ error: 'Too many login attempts. Try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) }
			}
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
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

	if (!operator) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	const valid = await verifyPasscode(passcode, operator.passcode);
	if (!valid) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	await clearRateLimit(`admin-login:${clientIp}`);

	const token = generateSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

	// Clean up expired sessions on login to prevent unbounded table growth
	await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));

	await db.insert(adminSessions).values({
		token,
		operatorId: operator.id,
		expiresAt
	});

	cookies.set('adminSession', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_MAX_AGE
	});

	return json({ operator: { id: operator.id, name: operator.name } });
};
