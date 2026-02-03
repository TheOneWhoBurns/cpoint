import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { closingChecklistItems } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const items = await db
		.select()
		.from(closingChecklistItems)
		.orderBy(asc(closingChecklistItems.sortOrder), asc(closingChecklistItems.id));
	return json(items);
};

export const POST: RequestHandler = async ({ request }) => {
	const { label } = await request.json();

	if (!label?.trim()) {
		return json({ error: 'Checklist item label required' }, { status: 400 });
	}

	// Get max sort order
	const existing = await db.select().from(closingChecklistItems);
	const maxOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), 0);

	const [created] = await db
		.insert(closingChecklistItems)
		.values({
			label: label.trim(),
			sortOrder: maxOrder + 1
		})
		.returning();

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const { id, label, sortOrder, isActive } = await request.json();

	if (!id) {
		return json({ error: 'Item ID required' }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if (label !== undefined) updates.label = label.trim();
	if (sortOrder !== undefined) updates.sortOrder = sortOrder;
	if (isActive !== undefined) updates.isActive = isActive;

	const [updated] = await db
		.update(closingChecklistItems)
		.set(updates)
		.where(eq(closingChecklistItems.id, id))
		.returning();

	return json(updated);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	if (!id) {
		return json({ error: 'Item ID required' }, { status: 400 });
	}

	await db.delete(closingChecklistItems).where(eq(closingChecklistItems.id, id));

	return json({ success: true });
};
