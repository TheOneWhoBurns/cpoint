import { db } from '$lib/server/db';
import { shifts, rentals, operators, storeSales, storeProducts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';
import { isGoogleConnected, createSpreadsheet } from '$lib/server/google-sheets';

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
	cashPaid?: number;
	creditPaid?: number;
	yetToPay?: number;
	discount?: number;
	calculatedPrice?: number;
	finalPrice?: number;
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

		// Handle both old and new pricing format
		const cashPaid = pricing?.cashPaid ?? (pricing?.paymentMethod === 'cash' ? (pricing?.total || 0) : 0);
		const creditPaid = pricing?.creditPaid ?? (pricing?.paymentMethod === 'credit' ? (pricing?.total || 0) : 0);
		const yetToPay = pricing?.yetToPay ?? 0;
		const discount = pricing?.discount ?? 0;

		return {
			'Customer': customer?.name || 'Unknown',
			'Hotel': customer?.hotel || '',
			'Phone': customer?.phone || '',
			'Items': items.map(i => i.name + (i.code ? ` (${i.code})` : '') + (i.quantity ? ` x${i.quantity}` : '')).join(', '),
			'Type': pricing?.type === 'hourly' ? 'Hourly' : 'Full Day',
			'Start': new Date(r.startedAt).toLocaleString(),
			'End': r.returnedAt ? new Date(r.returnedAt).toLocaleString() : 'Active',
			'Duration (min)': duration || 'N/A',
			'Price ($)': pricing?.calculatedPrice ?? pricing?.total ?? 0,
			'Discount ($)': discount,
			'Final ($)': pricing?.finalPrice ?? pricing?.total ?? 0,
			'Cash ($)': cashPaid,
			'Credit ($)': creditPaid,
			'Unpaid ($)': yetToPay,
			'Status': r.status
		};
	});

	// Calculate totals
	const cashTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.cashPaid ?? (pricing?.paymentMethod === 'cash' ? (pricing?.total || 0) : 0));
	}, 0);
	const creditTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.creditPaid ?? (pricing?.paymentMethod === 'credit' ? (pricing?.total || 0) : 0));
	}, 0);
	const unpaidTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.yetToPay ?? 0);
	}, 0);
	const discountTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.discount ?? 0);
	}, 0);
	const priceTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.calculatedPrice ?? pricing?.total ?? 0);
	}, 0);
	const finalTotal = shiftRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.finalPrice ?? pricing?.total ?? 0);
	}, 0);

	excelData.push({
		'Customer': 'TOTALS',
		'Hotel': '',
		'Phone': '',
		'Items': `${shiftRentals.length} rentals`,
		'Type': '',
		'Start': '',
		'End': '',
		'Duration (min)': '' as any,
		'Price ($)': priceTotal,
		'Discount ($)': discountTotal,
		'Final ($)': finalTotal,
		'Cash ($)': cashTotal,
		'Credit ($)': creditTotal,
		'Unpaid ($)': unpaidTotal,
		'Status': ''
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

	// Store sales cash/credit split (assuming all store sales are cash for now, can be enhanced)
	const storeSalesCash = salesRevenue / 100; // Convert from cents to dollars
	const storeSalesCredit = 0; // Would need to track payment method for store sales

	// Create summary/small box data
	const summaryData = [
		{ 'Category': 'RENTALS', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Collected Cash', 'Cash ($)': cashTotal.toFixed(2), 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Collected Credit', 'Cash ($)': '', 'Credit ($)': creditTotal.toFixed(2), 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Unpaid (Yet to Pay)', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': unpaidTotal.toFixed(2), 'Total ($)': '' },
		{ 'Category': 'Discounts Given', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': discountTotal.toFixed(2) },
		{ 'Category': 'Rental Subtotal', 'Cash ($)': cashTotal.toFixed(2), 'Credit ($)': creditTotal.toFixed(2), 'Unpaid ($)': unpaidTotal.toFixed(2), 'Total ($)': finalTotal.toFixed(2) },
		{ 'Category': '', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'STORE SALES', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Store Sales Total', 'Cash ($)': storeSalesCash.toFixed(2), 'Credit ($)': storeSalesCredit.toFixed(2), 'Unpaid ($)': '0.00', 'Total ($)': (salesRevenue / 100).toFixed(2) },
		{ 'Category': '', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'SMALL BOX SUMMARY', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Total Cash Collected', 'Cash ($)': (cashTotal + storeSalesCash).toFixed(2), 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Total Credit Collected', 'Cash ($)': '', 'Credit ($)': (creditTotal + storeSalesCredit).toFixed(2), 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Total Unpaid', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': unpaidTotal.toFixed(2), 'Total ($)': '' },
		{ 'Category': 'GRAND TOTAL', 'Cash ($)': (cashTotal + storeSalesCash).toFixed(2), 'Credit ($)': (creditTotal + storeSalesCredit).toFixed(2), 'Unpaid ($)': unpaidTotal.toFixed(2), 'Total ($)': (finalTotal + salesRevenue / 100).toFixed(2) },
	];

	const filename = `shift-${operator?.name || operatorId}-${new Date().toISOString().split('T')[0]}`;

	// Try Google Sheets export if connected
	const googleConnected = await isGoogleConnected();
	if (googleConnected) {
		try {
			const summaryHeaders = Object.keys(summaryData[0]);
			const summaryRows = summaryData.map(row => Object.values(row));

			const rentalHeaders = Object.keys(excelData[0]);
			const rentalRows = excelData.map(row => Object.values(row));

			const sheets = [
				{ name: 'Summary', headers: summaryHeaders, rows: summaryRows },
				{ name: 'Rentals', headers: rentalHeaders, rows: rentalRows }
			];

			if (shiftSales.length > 0) {
				const salesHeaders = Object.keys(salesData[0]);
				const salesRows = salesData.map(row => Object.values(row));
				sheets.push({ name: 'Store Sales', headers: salesHeaders, rows: salesRows });
			}

			const url = await createSpreadsheet(filename, sheets);

			cookies.delete('operatorId', { path: '/' });

			return new Response(JSON.stringify({ type: 'google_sheets', url }), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (e) {
			console.error('Google Sheets export failed, falling back to Excel:', e);
			// Fall through to Excel export
		}
	}

	// Excel fallback
	const wb = XLSX.utils.book_new();

	const wsSummary = XLSX.utils.json_to_sheet(summaryData);
	XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

	const ws = XLSX.utils.json_to_sheet(excelData);
	XLSX.utils.book_append_sheet(wb, ws, 'Rentals');

	if (shiftSales.length > 0) {
		const wsSales = XLSX.utils.json_to_sheet(salesData);
		XLSX.utils.book_append_sheet(wb, wsSales, 'Store Sales');
	}

	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	cookies.delete('operatorId', { path: '/' });

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}.xlsx"`
		}
	});
};
