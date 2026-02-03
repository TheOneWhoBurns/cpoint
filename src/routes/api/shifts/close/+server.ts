import { db } from '$lib/server/db';
import { shifts, rentals, operators, storeSales, storeProducts, tourBookings, tourAgencyProducts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';
import { isGoogleConnected, createSpreadsheet } from '$lib/server/google-sheets';

function formatDateTime(date: Date | string): string {
	const d = new Date(date);
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	const hours = String(d.getUTCHours()).padStart(2, '0');
	const minutes = String(d.getUTCMinutes()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatDate(date: Date | string): string {
	const d = new Date(date);
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

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
			deletedAt: storeSales.deletedAt,
			productName: storeProducts.name
		})
		.from(storeSales)
		.leftJoin(storeProducts, eq(storeSales.productId, storeProducts.id))
		.where(eq(storeSales.shiftId, shift.id));

	const shiftTourBookings = await db
		.select({
			id: tourBookings.id,
			pax: tourBookings.pax,
			unitPrice: tourBookings.unitPrice,
			totalPrice: tourBookings.totalPrice,
			cost: tourBookings.cost,
			bookedAt: tourBookings.bookedAt,
			activityDate: tourBookings.activityDate,
			status: tourBookings.status,
			createdAt: tourBookings.createdAt,
			productName: tourAgencyProducts.name
		})
		.from(tourBookings)
		.leftJoin(tourAgencyProducts, eq(tourBookings.tourProductId, tourAgencyProducts.id))
		.where(eq(tourBookings.shiftId, shift.id));

	const activeRentals = shiftRentals.filter(r => r.status !== 'deleted');
	const activeSales = shiftSales.filter(s => !s.deletedAt);
	const activeBookings = shiftTourBookings.filter(b => b.status !== 'deleted');

	const rentalRevenue = activeRentals.reduce((acc, r) => {
		const pricing = r.pricing as Pricing;
		return acc + (pricing?.total || 0);
	}, 0);

	const salesRevenue = activeSales.reduce((acc, s) => acc + s.total, 0);

	const tourRevenue = activeBookings.reduce((acc, b) => acc + b.totalPrice, 0);
	const tourCost = activeBookings.reduce((acc, b) => acc + (b.cost ?? 0), 0);

	const [updatedShift] = await db
		.update(shifts)
		.set({
			endedAt: new Date(),
			summary: {
				rentalsCount: activeRentals.length,
				rentalRevenue,
				salesCount: activeSales.length,
				salesRevenue,
				tourBookingsCount: activeBookings.length,
				tourRevenue,
				tourCost,
				totalRevenue: rentalRevenue + salesRevenue + tourRevenue
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
			'Start': formatDateTime(r.startedAt),
			'End': r.returnedAt ? formatDateTime(r.returnedAt) : 'Active',
			'Duration (min)': duration || 'N/A',
			'Price ($)': pricing?.calculatedPrice ?? pricing?.total ?? 0,
			'Discount ($)': discount,
			'Final ($)': pricing?.finalPrice ?? pricing?.total ?? 0,
			'Cash ($)': cashPaid,
			'Credit ($)': creditPaid,
			'Unpaid ($)': yetToPay,
			'Status': r.status === 'deleted' ? '[DELETED]' : r.status
		};
	});

	// Calculate totals (only non-deleted)
	const cashTotal = activeRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.cashPaid ?? (pricing?.paymentMethod === 'cash' ? (pricing?.total || 0) : 0));
	}, 0);
	const creditTotal = activeRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.creditPaid ?? (pricing?.paymentMethod === 'credit' ? (pricing?.total || 0) : 0));
	}, 0);
	const unpaidTotal = activeRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.yetToPay ?? 0);
	}, 0);
	const discountTotal = activeRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.discount ?? 0);
	}, 0);
	const priceTotal = activeRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.calculatedPrice ?? pricing?.total ?? 0);
	}, 0);
	const finalTotal = activeRentals.reduce((sum, r) => {
		const pricing = r.pricing as Pricing;
		return sum + (pricing?.finalPrice ?? pricing?.total ?? 0);
	}, 0);

	excelData.push({
		'Customer': 'TOTALS',
		'Hotel': '',
		'Phone': '',
		'Items': `${activeRentals.length} rentals`,
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
		'Product': s.deletedAt ? `${s.productName || 'Unknown'} [DELETED]` : (s.productName || 'Unknown'),
		'Quantity': s.quantity,
		'Unit Price ($)': Math.round(s.unitPrice / 100),
		'Total ($)': Math.round(s.total / 100),
		'Time': s.createdAt ? formatDateTime(s.createdAt) : '',
		'Status': s.deletedAt ? '[DELETED]' : ''
	}));

	salesData.push({
		'Product': '',
		'Quantity': '' as any,
		'Unit Price ($)': 'TOTALS:' as any,
		'Total ($)': Math.round(salesRevenue / 100),
		'Time': `${activeSales.length} sales`,
		'Status': ''
	});

	// Tour bookings data
	const tourData = shiftTourBookings.map(b => ({
		'Tour': b.productName || 'Unknown',
		'Pax': b.pax,
		'Price/Person ($)': Math.round(b.unitPrice / 100),
		'Revenue ($)': Math.round(b.totalPrice / 100),
		'Cost ($)': b.cost !== null ? Math.round(b.cost / 100) : 'Pending',
		'Profit ($)': b.cost !== null ? Math.round((b.totalPrice - b.cost) / 100) : 'Pending',
		'Booked': b.bookedAt ? formatDate(b.bookedAt) : '',
		'Activity Date': b.activityDate ? formatDate(b.activityDate) : '',
		'Status': b.status === 'deleted' ? '[DELETED]' : b.status
	}));

	if (tourData.length > 0) {
		tourData.push({
			'Tour': 'TOTALS',
			'Pax': activeBookings.reduce((sum, b) => sum + b.pax, 0),
			'Price/Person ($)': '' as any,
			'Revenue ($)': Math.round(tourRevenue / 100),
			'Cost ($)': Math.round(tourCost / 100),
			'Profit ($)': Math.round((tourRevenue - tourCost) / 100),
			'Booked': `${activeBookings.length} bookings`,
			'Activity Date': '',
			'Status': ''
		});
	}

	// Store sales cash/credit split (assuming all store sales are cash for now, can be enhanced)
	const storeSalesCash = Math.round(salesRevenue / 100); // Convert from cents to dollars
	const storeSalesCredit = 0; // Would need to track payment method for store sales

	// Create summary/small box data
	const summaryData = [
		{ 'Category': 'RENTALS', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Collected Cash', 'Cash ($)': cashTotal, 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Collected Credit', 'Cash ($)': '', 'Credit ($)': creditTotal, 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Unpaid (Yet to Pay)', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': unpaidTotal, 'Total ($)': '' },
		{ 'Category': 'Discounts Given', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': discountTotal },
		{ 'Category': 'Rental Subtotal', 'Cash ($)': cashTotal, 'Credit ($)': creditTotal, 'Unpaid ($)': unpaidTotal, 'Total ($)': finalTotal },
		{ 'Category': '', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'STORE SALES', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Store Sales Total', 'Cash ($)': storeSalesCash, 'Credit ($)': storeSalesCredit, 'Unpaid ($)': 0, 'Total ($)': Math.round(salesRevenue / 100) },
		{ 'Category': '', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'TOUR AGENCY', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Tour Revenue', 'Cash ($)': Math.round(tourRevenue / 100), 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': Math.round(tourRevenue / 100) },
		{ 'Category': 'Tour Cost', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': -Math.round(tourCost / 100) },
		{ 'Category': 'Tour Profit', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': Math.round((tourRevenue - tourCost) / 100) },
		{ 'Category': '', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'SMALL BOX SUMMARY', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Total Cash Collected', 'Cash ($)': (cashTotal + storeSalesCash + Math.round(tourRevenue / 100)), 'Credit ($)': '', 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Total Credit Collected', 'Cash ($)': '', 'Credit ($)': (creditTotal + storeSalesCredit), 'Unpaid ($)': '', 'Total ($)': '' },
		{ 'Category': 'Total Unpaid', 'Cash ($)': '', 'Credit ($)': '', 'Unpaid ($)': unpaidTotal, 'Total ($)': '' },
		{ 'Category': 'GRAND TOTAL', 'Cash ($)': (cashTotal + storeSalesCash + Math.round(tourRevenue / 100)), 'Credit ($)': (creditTotal + storeSalesCredit), 'Unpaid ($)': unpaidTotal, 'Total ($)': Math.round(finalTotal + salesRevenue / 100 + tourRevenue / 100) },
	];

	const safeName = (operator?.name || String(operatorId)).replace(/[^a-zA-Z0-9_-]/g, '_');
	const filename = `shift-${safeName}-${new Date().toISOString().split('T')[0]}`;

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

			if (shiftTourBookings.length > 0) {
				const tourHeaders = Object.keys(tourData[0]);
				const tourRows = tourData.map(row => Object.values(row));
				sheets.push({ name: 'Tour Agency', headers: tourHeaders, rows: tourRows });
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

	if (shiftTourBookings.length > 0) {
		const wsTour = XLSX.utils.json_to_sheet(tourData);
		XLSX.utils.book_append_sheet(wb, wsTour, 'Tour Agency');
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
