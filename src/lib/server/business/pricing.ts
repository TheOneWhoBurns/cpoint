export function calculateRentalPrice(params: {
	pricingType: 'hourly' | 'fullDay';
	hourlyRate: number;
	fullDayRate: number;
	startTime: Date;
	endTime: Date;
}): number {
	if (params.pricingType === 'fullDay') {
		return Math.round(params.fullDayRate || 0);
	}

	const diffMs = params.endTime.getTime() - params.startTime.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const halfHours = Math.max(1, Math.ceil(diffMinutes / 30));
	return Math.round(((params.hourlyRate || 0) / 2) * halfHours);
}

export function applyDiscount(calculatedPrice: number, discount: number): { discount: number; finalPrice: number } {
	const clamped = Math.max(0, Math.min(discount, calculatedPrice));
	return { discount: clamped, finalPrice: Math.max(0, calculatedPrice - clamped) };
}

export function validatePaymentSplit(params: {
	cashAmount: number;
	creditAmount: number;
	yetToPay: number;
	finalPrice: number;
}): { valid: boolean; error?: string } {
	const cash = Math.max(0, params.cashAmount);
	const credit = Math.max(0, params.creditAmount);
	const ytp = Math.max(0, params.yetToPay);
	const total = cash + credit + ytp;

	if (Math.abs(total - params.finalPrice) > 0) {
		return { valid: false, error: 'Payment amounts do not match final price' };
	}
	return { valid: true };
}

export function derivePaymentMethod(cashAmount: number, creditAmount: number): 'cash' | 'credit' | 'split' {
	if (cashAmount > 0 && creditAmount > 0) return 'split';
	if (creditAmount > 0) return 'credit';
	return 'cash';
}

export function buildClosePricing(params: {
	pricing: { type: string; hourly?: number; fullDay?: number };
	calculatedPrice: number;
	discount: number;
	finalPrice: number;
	cashAmount: number;
	creditAmount: number;
	yetToPay: number;
}) {
	return {
		...params.pricing,
		calculatedPrice: params.calculatedPrice,
		discount: params.discount,
		finalPrice: params.finalPrice,
		total: params.finalPrice,
		cashPaid: params.cashAmount,
		creditPaid: params.creditAmount,
		yetToPay: params.yetToPay,
		paymentMethod: derivePaymentMethod(params.cashAmount, params.creditAmount)
	};
}
