import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators, shifts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyPasscode, checkRateLimit, clearRateLimit, logAuthFailure, createOperatorSession, rehashIfPlaintext } from '$lib/server/auth';
import { dev } from '$app/environment';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	try {
		const clientIp = getClientAddress();
		const rateCheck = await checkRateLimit(`shift-start:${clientIp}`);
		if (!rateCheck.allowed) {
			return json(
				{ error: 'Too many login attempts. Try again later.' },
				{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
			);
		}

		const { operatorId, passcode } = await request.json();

		if (!operatorId || !passcode) {
			return json({ error: 'Operator ID and passcode required' }, { status: 400 });
		}

		const [operator] = await db
			.select()
			.from(operators)
			.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));

		if (!operator) {
			logAuthFailure('/api/shifts/start', String(operatorId), clientIp);
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		const valid = await verifyPasscode(passcode, operator.passcode);
		if (!valid) {
			logAuthFailure('/api/shifts/start', String(operatorId), clientIp);
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		await clearRateLimit(`shift-start:${clientIp}`);
		rehashIfPlaintext('operators', operatorId, operator.passcode).catch(() => {});

		const [existingShift] = await db
			.select()
			.from(shifts)
			.where(and(eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));

		let shift = existingShift;
		if (!existingShift) {
			const [newShift] = await db
				.insert(shifts)
				.values({
					operatorId
				})
				.returning();
			shift = newShift;
		}

		const sessionToken = await createOperatorSession(operatorId);
		cookies.set('operatorSession', sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24
		});

		const { passcode: _, ...safeOperator } = operator;
		return json({ operator: safeOperator, shift });
	} catch (err) {
		logger.error({ err, endpoint: '/api/shifts/start' }, 'shift_start_error');
		return json({ error: String(err) }, { status: 500 });
	}
};
