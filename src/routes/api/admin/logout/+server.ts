import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { adminSessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('adminSession');
	if (token) {
		await db.delete(adminSessions).where(eq(adminSessions.token, token));
	}
	cookies.delete('adminSession', { path: '/' });
	return json({ success: true });
};
