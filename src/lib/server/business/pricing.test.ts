import { describe, it, expect } from 'vitest';
import { calculateRentalPrice, applyDiscount, validatePaymentSplit, derivePaymentMethod, buildClosePricing } from './pricing';

describe('calculateRentalPrice', () => {
	const base = { hourlyRate: 20, fullDayRate: 100 };

	it('full-day returns flat rate', () => {
		expect(calculateRentalPrice({
			pricingType: 'fullDay', ...base,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T16:00:00')
		})).toBe(100);
	});

	it('full-day with 0 rate returns 0', () => {
		expect(calculateRentalPrice({
			pricingType: 'fullDay', hourlyRate: 20, fullDayRate: 0,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T16:00:00')
		})).toBe(0);
	});

	it('hourly: 1 min = 1 half-hour = rate/2', () => {
		expect(calculateRentalPrice({
			pricingType: 'hourly', ...base,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T08:01:00')
		})).toBe(10);
	});

	it('hourly: 30 min = 1 half-hour = rate/2', () => {
		expect(calculateRentalPrice({
			pricingType: 'hourly', ...base,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T08:30:00')
		})).toBe(10);
	});

	it('hourly: 31 min = 2 half-hours = rate', () => {
		expect(calculateRentalPrice({
			pricingType: 'hourly', ...base,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T08:31:00')
		})).toBe(20);
	});

	it('hourly: 60 min = 2 half-hours = rate', () => {
		expect(calculateRentalPrice({
			pricingType: 'hourly', ...base,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T09:00:00')
		})).toBe(20);
	});

	it('hourly: 90 min = 3 half-hours = rate*1.5', () => {
		expect(calculateRentalPrice({
			pricingType: 'hourly', ...base,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T09:30:00')
		})).toBe(30);
	});

	it('hourly: 0 min still charges minimum 1 half-hour', () => {
		const t = new Date('2026-01-01T08:00:00');
		expect(calculateRentalPrice({
			pricingType: 'hourly', ...base,
			startTime: t, endTime: t
		})).toBe(10);
	});

	it('hourly: 0 rate returns 0', () => {
		expect(calculateRentalPrice({
			pricingType: 'hourly', hourlyRate: 0, fullDayRate: 100,
			startTime: new Date('2026-01-01T08:00:00'),
			endTime: new Date('2026-01-01T09:00:00')
		})).toBe(0);
	});
});

describe('applyDiscount', () => {
	it('no discount returns full price', () => {
		expect(applyDiscount(100, 0)).toEqual({ discount: 0, finalPrice: 100 });
	});

	it('discount equal to price returns 0', () => {
		expect(applyDiscount(100, 100)).toEqual({ discount: 100, finalPrice: 0 });
	});

	it('discount exceeding price is clamped', () => {
		expect(applyDiscount(100, 150)).toEqual({ discount: 100, finalPrice: 0 });
	});

	it('negative discount is clamped to 0', () => {
		expect(applyDiscount(100, -10)).toEqual({ discount: 0, finalPrice: 100 });
	});

	it('partial discount', () => {
		expect(applyDiscount(100, 30)).toEqual({ discount: 30, finalPrice: 70 });
	});
});

describe('validatePaymentSplit', () => {
	it('exact match is valid', () => {
		expect(validatePaymentSplit({ cashAmount: 50, creditAmount: 50, yetToPay: 0, finalPrice: 100 }))
			.toEqual({ valid: true });
	});

	it('all cash is valid', () => {
		expect(validatePaymentSplit({ cashAmount: 100, creditAmount: 0, yetToPay: 0, finalPrice: 100 }))
			.toEqual({ valid: true });
	});

	it('all credit is valid', () => {
		expect(validatePaymentSplit({ cashAmount: 0, creditAmount: 100, yetToPay: 0, finalPrice: 100 }))
			.toEqual({ valid: true });
	});

	it('with yet-to-pay is valid', () => {
		expect(validatePaymentSplit({ cashAmount: 50, creditAmount: 0, yetToPay: 50, finalPrice: 100 }))
			.toEqual({ valid: true });
	});

	it('overpayment is invalid', () => {
		const result = validatePaymentSplit({ cashAmount: 60, creditAmount: 60, yetToPay: 0, finalPrice: 100 });
		expect(result.valid).toBe(false);
	});

	it('underpayment is invalid', () => {
		const result = validatePaymentSplit({ cashAmount: 30, creditAmount: 30, yetToPay: 0, finalPrice: 100 });
		expect(result.valid).toBe(false);
	});

	it('negative amounts treated as 0', () => {
		expect(validatePaymentSplit({ cashAmount: -10, creditAmount: 0, yetToPay: 0, finalPrice: 0 }))
			.toEqual({ valid: true });
	});

	it('zero price with zero payments is valid', () => {
		expect(validatePaymentSplit({ cashAmount: 0, creditAmount: 0, yetToPay: 0, finalPrice: 0 }))
			.toEqual({ valid: true });
	});
});

describe('derivePaymentMethod', () => {
	it('cash only', () => expect(derivePaymentMethod(100, 0)).toBe('cash'));
	it('credit only', () => expect(derivePaymentMethod(0, 100)).toBe('credit'));
	it('split', () => expect(derivePaymentMethod(50, 50)).toBe('split'));
	it('both zero defaults to cash', () => expect(derivePaymentMethod(0, 0)).toBe('cash'));
});

describe('buildClosePricing', () => {
	it('constructs correct object', () => {
		const result = buildClosePricing({
			pricing: { type: 'hourly', hourly: 20, fullDay: 100 },
			calculatedPrice: 40,
			discount: 10,
			finalPrice: 30,
			cashAmount: 20,
			creditAmount: 10,
			yetToPay: 0
		});

		expect(result).toEqual({
			type: 'hourly',
			hourly: 20,
			fullDay: 100,
			calculatedPrice: 40,
			discount: 10,
			finalPrice: 30,
			total: 30,
			cashPaid: 20,
			creditPaid: 10,
			yetToPay: 0,
			paymentMethod: 'split'
		});
	});
});
