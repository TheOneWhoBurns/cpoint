import { describe, it, expect } from 'vitest';
import { findRentalReservationConflicts, findReservationTimeConflicts } from './reservations';

const makeReservation = (id: number, itemIds: number[], from: string, until: string) => ({
	id,
	items: itemIds.map(itemId => ({ type: 'tracked' as const, itemId, name: `Item ${itemId}` })),
	customer: { name: 'Test' },
	reason: null,
	reservedFrom: from,
	reservedUntil: until
});

describe('findRentalReservationConflicts', () => {
	it('no reservations returns empty', () => {
		expect(findRentalReservationConflicts({
			rentalTrackedIds: [1, 2],
			activeReservations: [],
			now: new Date('2026-01-01T10:00:00')
		})).toEqual([]);
	});

	it('past reservation is not a conflict', () => {
		const res = makeReservation(1, [1], '2026-01-01T08:00:00', '2026-01-01T09:00:00');
		expect(findRentalReservationConflicts({
			rentalTrackedIds: [1],
			activeReservations: [res],
			now: new Date('2026-01-01T10:00:00')
		})).toEqual([]);
	});

	it('overlapping time + matching item = conflict', () => {
		const res = makeReservation(1, [1, 2], '2026-01-01T08:00:00', '2026-01-01T12:00:00');
		const result = findRentalReservationConflicts({
			rentalTrackedIds: [2, 3],
			activeReservations: [res],
			now: new Date('2026-01-01T10:00:00')
		});
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
		expect(result[0].items).toHaveLength(1);
		expect(result[0].items[0].itemId).toBe(2);
	});

	it('overlapping time but no item match = no conflict', () => {
		const res = makeReservation(1, [3, 4], '2026-01-01T08:00:00', '2026-01-01T12:00:00');
		expect(findRentalReservationConflicts({
			rentalTrackedIds: [1, 2],
			activeReservations: [res],
			now: new Date('2026-01-01T10:00:00')
		})).toEqual([]);
	});

	it('override suppresses conflict', () => {
		const res = makeReservation(1, [1], '2026-01-01T08:00:00', '2026-01-01T12:00:00');
		expect(findRentalReservationConflicts({
			rentalTrackedIds: [1],
			activeReservations: [res],
			now: new Date('2026-01-01T10:00:00'),
			overrideReservationIds: [1]
		})).toEqual([]);
	});

	it('multiple conflicts returned', () => {
		const res1 = makeReservation(1, [1], '2026-01-01T08:00:00', '2026-01-01T12:00:00');
		const res2 = makeReservation(2, [2], '2026-01-01T08:00:00', '2026-01-01T12:00:00');
		const result = findRentalReservationConflicts({
			rentalTrackedIds: [1, 2],
			activeReservations: [res1, res2],
			now: new Date('2026-01-01T10:00:00')
		});
		expect(result).toHaveLength(2);
	});
});

describe('findReservationTimeConflicts', () => {
	it('no existing returns null', () => {
		expect(findReservationTimeConflicts({
			requestedFrom: new Date('2026-01-01T08:00:00'),
			requestedUntil: new Date('2026-01-01T10:00:00'),
			requestedTrackedIds: [1],
			existingReservations: []
		})).toBeNull();
	});

	it('time overlap + item overlap returns conflict', () => {
		const existing = makeReservation(1, [1, 2], '2026-01-01T09:00:00', '2026-01-01T11:00:00');
		const result = findReservationTimeConflicts({
			requestedFrom: new Date('2026-01-01T08:00:00'),
			requestedUntil: new Date('2026-01-01T10:00:00'),
			requestedTrackedIds: [2, 3],
			existingReservations: [existing]
		});
		expect(result).not.toBeNull();
		expect(result!.overlappingItemIds).toEqual([2]);
	});

	it('no time overlap returns null', () => {
		const existing = makeReservation(1, [1], '2026-01-01T12:00:00', '2026-01-01T14:00:00');
		expect(findReservationTimeConflicts({
			requestedFrom: new Date('2026-01-01T08:00:00'),
			requestedUntil: new Date('2026-01-01T10:00:00'),
			requestedTrackedIds: [1],
			existingReservations: [existing]
		})).toBeNull();
	});

	it('time overlap but different items returns null', () => {
		const existing = makeReservation(1, [3, 4], '2026-01-01T09:00:00', '2026-01-01T11:00:00');
		expect(findReservationTimeConflicts({
			requestedFrom: new Date('2026-01-01T08:00:00'),
			requestedUntil: new Date('2026-01-01T10:00:00'),
			requestedTrackedIds: [1, 2],
			existingReservations: [existing]
		})).toBeNull();
	});

	it('adjacent times (end == start) returns null', () => {
		const existing = makeReservation(1, [1], '2026-01-01T10:00:00', '2026-01-01T12:00:00');
		expect(findReservationTimeConflicts({
			requestedFrom: new Date('2026-01-01T08:00:00'),
			requestedUntil: new Date('2026-01-01T10:00:00'),
			requestedTrackedIds: [1],
			existingReservations: [existing]
		})).toBeNull();
	});
});
