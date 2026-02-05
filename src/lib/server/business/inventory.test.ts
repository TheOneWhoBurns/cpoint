import { describe, it, expect } from 'vitest';
import { computeTrackedItemChanges, computeGenericDelta } from './inventory';

describe('computeTrackedItemChanges', () => {
	it('no changes returns empty arrays', () => {
		const items = [{ type: 'tracked', itemId: 1 }];
		expect(computeTrackedItemChanges(items, items)).toEqual({ toRelease: [], toClaim: [] });
	});

	it('added tracked item appears in toClaim', () => {
		const result = computeTrackedItemChanges(
			[{ type: 'tracked', itemId: 1 }],
			[{ type: 'tracked', itemId: 1 }, { type: 'tracked', itemId: 2 }]
		);
		expect(result.toRelease).toEqual([]);
		expect(result.toClaim).toEqual([2]);
	});

	it('removed tracked item appears in toRelease', () => {
		const result = computeTrackedItemChanges(
			[{ type: 'tracked', itemId: 1 }, { type: 'tracked', itemId: 2 }],
			[{ type: 'tracked', itemId: 1 }]
		);
		expect(result.toRelease).toEqual([2]);
		expect(result.toClaim).toEqual([]);
	});

	it('swapped items: one released, one claimed', () => {
		const result = computeTrackedItemChanges(
			[{ type: 'tracked', itemId: 1 }],
			[{ type: 'tracked', itemId: 2 }]
		);
		expect(result.toRelease).toEqual([1]);
		expect(result.toClaim).toEqual([2]);
	});

	it('ignores generic items', () => {
		const result = computeTrackedItemChanges(
			[{ type: 'generic', categoryId: 1, quantity: 5 }],
			[{ type: 'generic', categoryId: 1, quantity: 3 }]
		);
		expect(result).toEqual({ toRelease: [], toClaim: [] });
	});

	it('empty to empty returns empty', () => {
		expect(computeTrackedItemChanges([], [])).toEqual({ toRelease: [], toClaim: [] });
	});
});

describe('computeGenericDelta', () => {
	it('no changes returns empty map', () => {
		const items = [{ type: 'generic', categoryId: 1, quantity: 5 }];
		const result = computeGenericDelta(items, items);
		expect(result.size).toBe(0);
	});

	it('added generic returns positive delta', () => {
		const result = computeGenericDelta(
			[],
			[{ type: 'generic', categoryId: 1, quantity: 3 }]
		);
		expect(result.get(1)).toBe(3);
	});

	it('removed generic returns negative delta', () => {
		const result = computeGenericDelta(
			[{ type: 'generic', categoryId: 1, quantity: 3 }],
			[]
		);
		expect(result.get(1)).toBe(-3);
	});

	it('increased quantity returns positive delta', () => {
		const result = computeGenericDelta(
			[{ type: 'generic', categoryId: 1, quantity: 2 }],
			[{ type: 'generic', categoryId: 1, quantity: 5 }]
		);
		expect(result.get(1)).toBe(3);
	});

	it('decreased quantity returns negative delta', () => {
		const result = computeGenericDelta(
			[{ type: 'generic', categoryId: 1, quantity: 5 }],
			[{ type: 'generic', categoryId: 1, quantity: 2 }]
		);
		expect(result.get(1)).toBe(-3);
	});

	it('multiple categories tracked independently', () => {
		const result = computeGenericDelta(
			[{ type: 'generic', categoryId: 1, quantity: 2 }, { type: 'generic', categoryId: 2, quantity: 5 }],
			[{ type: 'generic', categoryId: 1, quantity: 4 }, { type: 'generic', categoryId: 2, quantity: 3 }]
		);
		expect(result.get(1)).toBe(2);
		expect(result.get(2)).toBe(-2);
	});

	it('defaults quantity to 1 when undefined', () => {
		const result = computeGenericDelta(
			[],
			[{ type: 'generic', categoryId: 1 }]
		);
		expect(result.get(1)).toBe(1);
	});

	it('same category in multiple items aggregated', () => {
		const result = computeGenericDelta(
			[],
			[{ type: 'generic', categoryId: 1, quantity: 2 }, { type: 'generic', categoryId: 1, quantity: 3 }]
		);
		expect(result.get(1)).toBe(5);
	});

	it('ignores tracked items', () => {
		const result = computeGenericDelta(
			[{ type: 'tracked', itemId: 1 }],
			[{ type: 'tracked', itemId: 2 }]
		);
		expect(result.size).toBe(0);
	});
});
