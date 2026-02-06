import bcrypt from 'bcryptjs';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { logger } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { rateLimits, operatorSessions } from '$lib/server/db/schema';
import { eq, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

const SALT_ROUNDS = 10;
const SCRYPT_KEYLEN = 32;
const HASH_PREFIX = '$scrypt$';

export async function hashPasscode(passcode: string): Promise<string> {
	return bcrypt.hash(passcode, SALT_ROUNDS);
}

export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
	if (stored.startsWith(HASH_PREFIX)) {
		const withoutPrefix = stored.slice(HASH_PREFIX.length);
		const [salt, hash] = withoutPrefix.split(':');
		if (!salt || !hash) return false;
		const derived = scryptSync(passcode, salt, SCRYPT_KEYLEN);
		const expected = Buffer.from(hash, 'hex');
		if (derived.length !== expected.length) return false;
		return timingSafeEqual(derived, expected);
	}
	if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
		return bcrypt.compare(passcode, stored);
	}
	logger.warn('Rejected login attempt against unhashed passcode');
	return false;
}

export function logAuthFailure(endpoint: string, identifier: string, ip: string): void {
	const maskedIp = ip.includes('.') ? ip.replace(/\.\d+$/, '.***') : ip.replace(/:[^:]+$/, ':***');
	logger.warn({ endpoint, identifier, ip: maskedIp }, 'auth_failure');
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

const MAX_ATTEMPTS = 20;
const WINDOW_MS = 15 * 60 * 1000;

let cleanupCounter = 0;
const CLEANUP_EVERY_N = 20;

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
	const now = new Date();
	const resetAt = new Date(now.getTime() + WINDOW_MS);

	if (++cleanupCounter >= CLEANUP_EVERY_N) {
		cleanupCounter = 0;
		db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).execute().catch(() => {});
	}

	const result = await db
		.insert(rateLimits)
		.values({ key, count: 1, resetAt })
		.onConflictDoUpdate({
			target: rateLimits.key,
			set: {
				count: sql`CASE WHEN ${rateLimits.resetAt} < ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
				resetAt: sql`CASE WHEN ${rateLimits.resetAt} < ${now} THEN ${resetAt} ELSE ${rateLimits.resetAt} END`
			}
		})
		.returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

	const row = result[0];
	if (row.count > MAX_ATTEMPTS) {
		const retryAfterSeconds = Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000);
		return { allowed: false, retryAfterSeconds };
	}

	return { allowed: true };
}

export async function clearRateLimit(key: string): Promise<void> {
	await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

export async function createOperatorSession(operatorId: number): Promise<string> {
	// Delete all existing sessions for this operator (transfers session to new login)
	await db.delete(operatorSessions).where(eq(operatorSessions.operatorId, operatorId));

	const token = randomBytes(32).toString('hex');
	await db.insert(operatorSessions).values({ token, operatorId });
	return token;
}

export async function deleteOperatorSessions(operatorId: number): Promise<void> {
	await db.delete(operatorSessions).where(eq(operatorSessions.operatorId, operatorId));
}

export async function getVerifiedOperatorId(cookies: Cookies): Promise<number | null> {
	const token = cookies.get('operatorSession');
	if (!token) return null;

	const [session] = await db
		.select({ operatorId: operatorSessions.operatorId })
		.from(operatorSessions)
		.where(eq(operatorSessions.token, token));

	if (!session) {
		cookies.delete('operatorSession', { path: '/' });
		return null;
	}

	return session.operatorId;
}
