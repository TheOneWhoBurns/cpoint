import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rentals, storeSales } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

interface Pricing {
	type?: string;
	total?: number;
	paymentMethod?: string;
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

	const shiftRentals = await db
		.select()
		.from(rentals)
		.where(eq(rentals.shiftId, shiftId));

	const shiftSalesData = await db
		.select()
		.from(storeSales)
		.where(eq(storeSales.shiftId, shiftId));

	let rentalsCash = 0;
	let rentalsCredit = 0;

	for (const r of shiftRentals) {
		const pricing = r.pricing as Pricing;
		const total = pricing?.total || 0;
		if (pricing?.paymentMethod === 'credit') {
			rentalsCredit += total;
		} else {
			rentalsCash += total;
		}
	}

	const storeSalesTotal = Math.round(shiftSalesData.reduce((sum, s) => sum + s.total, 0) / 100);

	return json({
		rentalsCount: shiftRentals.length,
		rentalsCash,
		rentalsCredit,
		storeSalesCount: shiftSalesData.length,
		storeSalesTotal,
		totalCash: rentalsCash + storeSalesTotal,
		totalCredit: rentalsCredit
	});
};
