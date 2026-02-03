import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentals, storeSales, tourBookings, shifts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

interface Pricing {
	type?: string;
	total?: number;
	paymentMethod?: string;
	cashPaid?: number;
	creditPaid?: number;
	yetToPay?: number;
	discount?: number;
}

export const GET: RequestHandler = async ({ url }) => {
	const shiftIdStr = url.searchParams.get('shiftId');
	if (!shiftIdStr || shiftIdStr === 'undefined' || shiftIdStr === 'null') {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	const shiftId = parseInt(shiftIdStr);
	if (isNaN(shiftId)) {
		return json({ error: 'Invalid shift ID' }, { status: 400 });
	}

	// Run all shift data queries in parallel
	const [shiftResult, shiftRentals, shiftSalesData, shiftTourBookings] = await Promise.all([
		db.select().from(shifts).where(eq(shifts.id, shiftId)),
		db.select().from(rentals).where(eq(rentals.shiftId, shiftId)),
		db.select().from(storeSales).where(eq(storeSales.shiftId, shiftId)),
		db.select().from(tourBookings).where(eq(tourBookings.shiftId, shiftId))
	]);

	const [shift] = shiftResult;
	if (!shift) {
		return json({ error: 'Shift not found' }, { status: 404 });
	}

	let rentalsCash = 0;
	let rentalsCredit = 0;
	let rentalsUnpaid = 0;
	let activeRentalsCount = 0;

	for (const r of shiftRentals) {
		const pricing = r.pricing as Pricing;
		if (r.status === 'active') {
			activeRentalsCount++;
		}
		// Use split payment fields if available, fall back to paymentMethod
		const cashPaid = pricing?.cashPaid ?? (pricing?.paymentMethod === 'cash' ? (pricing?.total || 0) : 0);
		const creditPaid = pricing?.creditPaid ?? (pricing?.paymentMethod === 'credit' ? (pricing?.total || 0) : 0);
		const yetToPay = pricing?.yetToPay ?? 0;

		rentalsCash += cashPaid;
		rentalsCredit += creditPaid;
		rentalsUnpaid += yetToPay;
	}

	const storeSalesTotal = Math.round(shiftSalesData.reduce((sum, s) => sum + s.total, 0) / 100);

	const tourRevenue = shiftTourBookings.reduce((sum, b) => sum + b.totalPrice, 0) / 100;
	const tourCost = shiftTourBookings.reduce((sum, b) => sum + (b.cost ?? 0), 0) / 100;

	const totalCash = rentalsCash + storeSalesTotal + tourRevenue;
	const totalCredit = rentalsCredit;

	return json({
		shiftStartedAt: shift.startedAt,
		rentalsCount: shiftRentals.length,
		rentalsCash,
		rentalsCredit,
		rentalsUnpaid,
		activeRentalsCount,
		storeSalesCount: shiftSalesData.length,
		storeSalesTotal,
		tourBookingsCount: shiftTourBookings.length,
		tourRevenue,
		tourCost,
		totalCash,
		totalCredit,
		totalRevenue: totalCash + totalCredit
	});
};
