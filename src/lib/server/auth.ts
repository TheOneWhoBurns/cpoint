import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_KEYLEN = 32;
const HASH_PREFIX = '$scrypt$';

export function hashPasscode(passcode: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(passcode, salt, SCRYPT_KEYLEN).toString('hex');
	return `${HASH_PREFIX}${salt}:${hash}`;
}

export function verifyPasscode(passcode: string, stored: string): boolean {
	if (!stored.startsWith(HASH_PREFIX)) {
		// Legacy plaintext comparison (backward compat for existing DB rows)
		return passcode === stored;
	}
	const withoutPrefix = stored.slice(HASH_PREFIX.length);
	const [salt, hash] = withoutPrefix.split(':');
	if (!salt || !hash) return false;
	const derived = scryptSync(passcode, salt, SCRYPT_KEYLEN);
	const expected = Buffer.from(hash, 'hex');
	if (derived.length !== expected.length) return false;
	return timingSafeEqual(derived, expected);
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

// In-memory rate limiter. Resets on restart, which is acceptable.
const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
	const now = Date.now();
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
