import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { logger } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { rateLimits } from '$lib/server/db/schema';
import { eq, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
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

function getCookieSecret(): string {
	const secret = env.COOKIE_SECRET;
	if (!secret) throw new Error('COOKIE_SECRET environment variable is required');
	return secret;
}

export function signCookieValue(value: string): string {
	const hmac = createHmac('sha256', getCookieSecret()).update(value).digest('hex');
	return `${value}.${hmac}`;
}

export function verifyCookieValue(signed: string): string | null {
	const dot = signed.lastIndexOf('.');
	if (dot === -1) return null;
	const value = signed.slice(0, dot);
	const sig = signed.slice(dot + 1);
	const expected = createHmac('sha256', getCookieSecret()).update(value).digest('hex');
	if (sig.length !== expected.length) return null;
	if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
	return value;
}

export function getVerifiedOperatorId(cookies: Cookies): number | null {
	const raw = cookies.get('operatorId');
	if (!raw) return null;
	const value = verifyCookieValue(raw);
	if (!value) return null;
	const id = parseInt(value);
	if (isNaN(id)) return null;
	return id;
}
