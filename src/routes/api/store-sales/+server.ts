import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storeSales, storeProducts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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
