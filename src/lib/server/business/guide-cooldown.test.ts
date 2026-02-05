import { describe, it, expect } from 'vitest';
import { checkGuideCooldown } from './guide-cooldown';

describe('checkGuideCooldown', () => {
	it('null lastReturnedAt = not on cooldown', () => {
		expect(checkGuideCooldown({
			lastReturnedAt: null,
			cooldownMinutes: 30,
			now: new Date('2026-01-01T10:00:00')
		})).toEqual({ onCooldown: false, minutesLeft: 0 });
	});

	it('expired cooldown = not on cooldown', () => {
		expect(checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 30,
			now: new Date('2026-01-01T09:31:00')
		})).toEqual({ onCooldown: false, minutesLeft: 0 });
	});

	it('active cooldown returns correct minutes left', () => {
		const result = checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 30,
			now: new Date('2026-01-01T09:20:00')
		});
		expect(result.onCooldown).toBe(true);
		expect(result.minutesLeft).toBe(10);
	});

	it('just returned = full cooldown remaining', () => {
		const result = checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 30,
			now: new Date('2026-01-01T09:00:00')
		});
		expect(result.onCooldown).toBe(true);
		expect(result.minutesLeft).toBe(30);
	});

	it('cooldown of 0 = never on cooldown', () => {
		expect(checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 0,
			now: new Date('2026-01-01T09:00:00')
		})).toEqual({ onCooldown: false, minutesLeft: 0 });
	});

	it('sub-minute precision rounds up', () => {
		const result = checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 30,
			now: new Date('2026-01-01T09:29:01')
		});
		expect(result.onCooldown).toBe(true);
		expect(result.minutesLeft).toBe(1);
	});

	it('exact boundary = not on cooldown', () => {
		expect(checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 30,
			now: new Date('2026-01-01T09:30:00')
		})).toEqual({ onCooldown: false, minutesLeft: 0 });
	});

	it('string date input works', () => {
		const result = checkGuideCooldown({
			lastReturnedAt: '2026-01-01T09:00:00',
			cooldownMinutes: 30,
			now: new Date('2026-01-01T09:20:00')
		});
		expect(result.onCooldown).toBe(true);
		expect(result.minutesLeft).toBe(10);
	});

	it('custom cooldown of 60 minutes', () => {
		const result = checkGuideCooldown({
			lastReturnedAt: new Date('2026-01-01T09:00:00'),
			cooldownMinutes: 60,
			now: new Date('2026-01-01T09:45:00')
		});
		expect(result.onCooldown).toBe(true);
		expect(result.minutesLeft).toBe(15);
	});
});
