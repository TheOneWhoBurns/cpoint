import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storeSales, storeProducts, operators } from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { shiftId, productId, quantity } = await request.json();

	if (!shiftId) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	if (!productId) {
		return json({ error: 'Product ID required' }, { status: 400 });
	}

	if (!quantity || quantity < 1) {
		return json({ error: 'Valid quantity required' }, { status: 400 });
	}

	const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, productId));

	if (!product) {
		return json({ error: 'Product not found' }, { status: 404 });
	}

	if ((product.quantity ?? 0) < quantity) {
		return json({ error: `Not enough stock (have ${product.quantity}, need ${quantity})` }, { status: 400 });
	}

	const total = product.price * quantity;

	const [sale] = await db
		.insert(storeSales)
		.values({
			shiftId,
			productId,
			quantity,
			unitPrice: product.price,
			total
		})
		.returning();

	await db
		.update(storeProducts)
		.set({ quantity: (product.quantity ?? 0) - quantity })
		.where(eq(storeProducts.id, productId));

	return json(sale, { status: 201 });
};

export const GET: RequestHandler = async ({ url }) => {
	const shiftIdStr = url.searchParams.get('shiftId');

	if (!shiftIdStr) {
		return json({ error: 'Shift ID required' }, { status: 400 });
	}

	const shiftId = parseInt(shiftIdStr);

	const sales = await db
		.select()
		.from(storeSales)
		.where(eq(storeSales.shiftId, shiftId));

	return json(sales);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id, passcode } = await request.json();

	if (!id) {
		return json({ error: 'Sale ID required' }, { status: 400 });
	}

	if (!passcode) {
		return json({ error: 'Passcode required' }, { status: 400 });
	}

	const [operator] = await db
		.select()
		.from(operators)
		.where(eq(operators.passcode, passcode));

	if (!operator) {
		return json({ error: 'Invalid passcode' }, { status: 403 });
	}

	const [sale] = await db.select().from(storeSales).where(eq(storeSales.id, id));
	if (!sale) {
		return json({ error: 'Sale not found' }, { status: 404 });
	}

	if (sale.deletedAt) {
		return json({ error: 'Sale already deleted' }, { status: 400 });
	}

	// Restore stock
	const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, sale.productId!));
	if (product) {
		await db
			.update(storeProducts)
			.set({ quantity: (product.quantity ?? 0) + sale.quantity })
			.where(eq(storeProducts.id, sale.productId!));
	}

	// Soft delete
	const [updated] = await db
		.update(storeSales)
		.set({ deletedAt: new Date() })
		.where(eq(storeSales.id, id))
		.returning();

	return json(updated);
};
