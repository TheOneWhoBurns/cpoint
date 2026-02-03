import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// If already logged in as admin, redirect to admin dashboard
	const adminIdStr = cookies.get('adminId');
	if (adminIdStr) {
		const adminId = parseInt(adminIdStr);
		if (!isNaN(adminId)) {
			const [admin] = await db
				.select()
				.from(operators)
				.where(and(eq(operators.id, adminId), eq(operators.isActive, true), eq(operators.isAdmin, true)));
			if (admin) {
				redirect(302, '/admin');
			}
		}
		// Invalid admin cookie, clean up
		cookies.delete('adminId', { path: '/' });
	}

	// Load admin operators for the login form
	const adminOperators = await db
		.select({ id: operators.id, name: operators.name })
		.from(operators)
		.where(and(eq(operators.isActive, true), eq(operators.isAdmin, true)));

	return { adminOperators };
};
