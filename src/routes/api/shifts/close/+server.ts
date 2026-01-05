import { db } from '$lib/server/db';
import { shifts, rentals, operators, storeSales, storeProducts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';

interface RentalItem {
	name: string;
	code?: string;
	quantity?: number;
}

interface Customer {
	name?: string;
	hotel?: string;
	phone?: string;
}

interface Pricing {
	type?: string;
	total?: number;
	hourly?: number;
	fullDay?: number;
	paymentMethod?: string;
}

export const POST: RequestHandler = async ({ cookies }) => {
	const operatorIdStr = cookies.get('operatorId');
	if (!operatorIdStr) {
		return new Response(JSON.stringify({ error: 'Not logged in' }), { status: 401 });
	}

	const operatorId = parseInt(operatorIdStr);

	const [operator] = await db
		.select()
		.from(operators)
		.where(eq(operators.id, operatorId));

	const [shift] = await db
		.select()
		.from(shifts)
		.where(and(eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));

	if (!shift) {
		return new Response(JSON.stringify({ error: 'No active shift' }), { status: 404 });
	}

	const shiftRentals = await db
		.select()
		.from(rentals)
		.where(eq(rentals.shiftId, shift.id));

	const shiftSales = await db
		.select({
			id: storeSales.id,
			quantity: storeSales.quantity,
			unitPrice: storeSales.unitPrice,
			total: storeSales.total,
			createdAt: storeSales.createdAt,
			productName: storeProducts.name
		})
		.from(storeSales)
		.leftJoin(storeProducts, eq(storeSales.productId, storeProducts.id))
		.where(eq(storeSales.shiftId, shift.id));

	const rentalRevenue = shiftRentals.reduce((acc, r) => {
		const pricing = r.pricing as Pricing;
		return acc + (pricing?.total || 0);
	}, 0);

	const salesRevenue = shiftSales.reduce((acc, s) => acc + s.total, 0);

	const [updatedShift] = await db
		.update(shifts)
		.set({
			endedAt: new Date(),
			summary: {
				rentalsCount: shiftRentals.length,
				rentalRevenue,
				salesCount: shiftSales.length,
				salesRevenue,
				totalRevenue: rentalRevenue + salesRevenue
			}
		})
		.where(eq(shifts.id, shift.id))
		.returning();

	const excelData = shiftRentals.map(r => {
		const customer = r.customer as Customer;
		const items = r.items as RentalItem[];
		const pricing = r.pricing as Pricing;

		const duration = r.returnedAt
			? Math.round((new Date(r.returnedAt).getTime() - new Date(r.startedAt).getTime()) / 60000)
			: null;

		return {
			'Customer': customer?.name || 'Unknown',
			'Hotel': customer?.hotel || '',
			'Phone': customer?.phone || '',
			'Items': items.map(i => i.name + (i.code ? ` (${i.code})` : '') + (i.quantity ? ` x${i.quantity}` : '')).join(', '),
			'Type': pricing?.type === 'hourly' ? 'Hourly' : 'Full Day',
			'Start': new Date(r.startedAt).toLocaleString(),
			'End': r.returnedAt ? new Date(r.returnedAt).toLocaleString() : 'Active',
			'Duration (min)': duration || 'N/A',
			'Total ($)': pricing?.total || 0,
			'Payment': pricing?.paymentMethod === 'credit' ? 'Credit' : 'Cash',
			'Status': r.status
		};
	});

	const cashTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.paymentMethod !== 'credit' ? (pricing?.total || 0) : 0);
	}, 0);
	const creditTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.paymentMethod === 'credit' ? (pricing?.total || 0) : 0);
	}, 0);

	excelData.push({
		'Customer': '',
		'Hotel': '',
		'Phone': '',
		'Items': '',
		'Type': '',
		'Start': '',
		'End': '',
		'Duration (min)': 'TOTALS:',
		'Total ($)': rentalRevenue,
		'Payment': `Cash: $${cashTotal} / Credit: $${creditTotal}`,
		'Status': `${shiftRentals.length} rentals`
	});

	const salesData = shiftSales.map(s => ({
		'Product': s.productName || 'Unknown',
		'Quantity': s.quantity,
		'Unit Price ($)': (s.unitPrice / 100).toFixed(2),
		'Total ($)': (s.total / 100).toFixed(2),
		'Time': s.createdAt ? new Date(s.createdAt).toLocaleString() : ''
	}));

	salesData.push({
		'Product': '',
		'Quantity': '' as any,
		'Unit Price ($)': 'TOTALS:',
		'Total ($)': (salesRevenue / 100).toFixed(2),
		'Time': `${shiftSales.length} sales`
	});

	const ws = XLSX.utils.json_to_sheet(excelData);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Rentals');

	if (shiftSales.length > 0) {
		const wsSales = XLSX.utils.json_to_sheet(salesData);
		XLSX.utils.book_append_sheet(wb, wsSales, 'Store Sales');
	}

	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	cookies.delete('operatorId', { path: '/' });

	const filename = `shift-${operator?.name || operatorId}-${new Date().toISOString().split('T')[0]}.xlsx`;

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
