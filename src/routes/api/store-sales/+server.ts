import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storeSales, storeProducts, shifts, operators } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const operatorIdStr = cookies.get('operatorId');
	if (!operatorIdStr) {
		return json({ error: 'Not logged in' }, { status: 401 });
	}

	const operatorId = parseInt(operatorIdStr);
	const [operator] = await db.select({ id: operators.id }).from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));
	if (!operator) {
		cookies.delete('operatorId', { path: '/' });
		return json({ error: 'Invalid session' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { shiftId, productId, quantity } = body;

	if (!shiftId) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	// Verify shift belongs to this operator and is active
	const [shift] = await db.select().from(shifts)
		.where(and(eq(shifts.id, shiftId), eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));
	if (!shift) {
		return json({ error: 'Invalid or inactive shift' }, { status: 403 });
	}

	if (!productId) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	const parsedQty = Number(quantity);
	if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 1000) {
		return json({ error: 'Valid quantity required (1-1000)' }, { status: 400 });
	}

	const result = await db.transaction(async (tx) => {
		const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, productId));

		if (!product) {
			return { error: 'Product not found', status: 404 };
		}

		if ((product.quantity ?? 0) < parsedQty) {
			return { error: `Not enough stock (have ${product.quantity}, need ${parsedQty})`, status: 400 };
		}

		const total = product.price * parsedQty;

		const [sale] = await tx
			.insert(storeSales)
			.values({
				shiftId,
				productId,
				quantity: parsedQty,
				unitPrice: product.price,
				total
			})
			.returning();

		await tx
			.update(storeProducts)
			.set({ quantity: (product.quantity ?? 0) - parsedQty })
			.where(eq(storeProducts.id, productId));

		return { sale };
	});

	if ('error' in result) {
		return json({ error: result.error }, { status: result.status });
	}

	return json(result.sale, { status: 201 });
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	const operatorIdStr = cookies.get('operatorId');
	if (!operatorIdStr) {
		return json({ error: 'Not logged in' }, { status: 401 });
	}

	const operatorId = parseInt(operatorIdStr);
	const [operator] = await db.select({ id: operators.id }).from(operators)
		.where(and(eq(operators.id, operatorId), eq(operators.isActive, true)));
	if (!operator) {
		cookies.delete('operatorId', { path: '/' });
		return json({ error: 'Invalid session' }, { status: 401 });
	}

	const shiftIdStr = url.searchParams.get('shiftId');

	if (!shiftIdStr) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	const shiftId = parseInt(shiftIdStr);

	const [shift] = await db.select().from(shifts)
		.where(and(eq(shifts.id, shiftId), eq(shifts.operatorId, operatorId)));
	if (!shift) {
		return json({ error: 'Shift not found or not yours' }, { status: 403 });
	}

	const sales = await db
		.select()
		.from(storeSales)
		.where(eq(storeSales.shiftId, shiftId));

	return json(sales);
};
