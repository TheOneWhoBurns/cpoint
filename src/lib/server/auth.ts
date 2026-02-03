import bcrypt from 'bcryptjs';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

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
	// Reject plaintext-stored passcodes — they must be rehashed
	console.warn('[SECURITY] Rejected login attempt against unhashed passcode. Passcode must be rehashed.');
	return false;
}

export function logAuthFailure(endpoint: string, identifier: string, ip: string): void {
	console.warn(`[AUTH_FAILURE] endpoint=${endpoint} identifier=${identifier} ip=${ip} time=${new Date().toISOString()}`);
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 20;
const WINDOW_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Periodically purge expired entries to prevent unbounded memory growth
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of attempts) {
		if (now >= entry.resetAt) {
			attempts.delete(key);
		}
	}
}, CLEANUP_INTERVAL_MS).unref();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
	const now = Date.now();
	pruneExpiredEntries(now);
	const entry = attempts.get(key);

	if (entry && now < entry.resetAt) {
		if (entry.count >= MAX_ATTEMPTS) {
			const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
			return { allowed: false, retryAfterSeconds };
		}
		entry.count++;
		return { allowed: true };
	}

	attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
	return { allowed: true };
}

export function clearRateLimit(key: string): void {
	attempts.delete(key);
}

// Prune expired entries periodically to prevent memory leaks
let lastPrune = 0;
const PRUNE_INTERVAL_MS = 60 * 1000;

function pruneExpiredEntries(now: number): void {
	if (now - lastPrune < PRUNE_INTERVAL_MS) return;
	lastPrune = now;
	for (const [key, entry] of attempts) {
		if (now >= entry.resetAt) {
			attempts.delete(key);
		}
	}
}
